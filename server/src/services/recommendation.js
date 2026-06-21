/**
 * StaffFlow scheduling & recommendation engine.
 *
 * Pure, dependency-free scoring logic so it's fast, testable and free to run.
 * Two public capabilities:
 *   1. scoreEmployeeForShift()  -> rank a single employee against a shift
 *   2. recommendStaffForShift()  -> best-fit employees for an open shift
 *   3. generateSchedule()        -> assign employees across a date range
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');
// Format a Date as YYYY-MM-DD in LOCAL time (avoids toISOString UTC day-shift).
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const toMinutes = (t) => {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
};

const dayCode = (dateStr) => WEEKDAYS[new Date(dateStr + 'T00:00:00').getDay()];

const shiftHours = (s) => Math.max(0, toMinutes(s.endTime) - toMinutes(s.startTime)) / 60;

// Does [aStart,aEnd) overlap [bStart,bEnd) ?
const timeOverlaps = (aS, aE, bS, bE) =>
  toMinutes(aS) < toMinutes(bE) && toMinutes(bS) < toMinutes(aE);

/**
 * Score how well an employee fits a shift. Returns { score (0-100), reasons[], hard }.
 * `hard` true means a hard constraint is violated (should not be assigned).
 */
function scoreEmployeeForShift(employee, shift, context = {}) {
  const {
    existingShifts = [], // employee's already-assigned shifts (this run + db)
    weeklyHours = 0, // hours already assigned this week
    considerSkill = true,
    prioritizePreferences = true,
    maxConsecutiveDays = employee.preferences?.maxConsecutiveDays ?? 5,
  } = context;

  const reasons = [];
  let score = 50; // neutral baseline
  let hard = false;

  // --- HARD CONSTRAINTS ---
  // 1. Already booked at an overlapping time
  const conflict = existingShifts.some(
    (s) => s.date === shift.date && timeOverlaps(s.startTime, s.endTime, shift.startTime, shift.endTime)
  );
  if (conflict) {
    return { score: 0, reasons: ['Already has an overlapping shift'], hard: true };
  }

  // 2. Inactive employee
  if (employee.status === 'inactive') {
    return { score: 0, reasons: ['Employee is inactive'], hard: true };
  }

  // --- DEPARTMENT MATCH ---
  if (shift.department && employee.department) {
    if (employee.department === shift.department) {
      score += 20;
      reasons.push('Department match');
    } else {
      score -= 15;
      reasons.push('Different department');
    }
  }

  // --- AVAILABILITY ---
  const code = dayCode(shift.date);
  const avail = (employee.availability || []).find((a) => a.day === code);
  if (avail) {
    const fits = toMinutes(avail.start) <= toMinutes(shift.startTime) && toMinutes(avail.end) >= toMinutes(shift.endTime);
    if (fits) {
      score += 15;
      reasons.push('Available for this time window');
    } else {
      score -= 10;
      reasons.push('Partially outside availability');
    }
  } else if (employee.availability && employee.availability.length > 0) {
    // has availability defined but not this day
    score -= 20;
    reasons.push('Not available on this day');
  }

  // --- PREFERENCES ---
  if (prioritizePreferences) {
    if ((employee.preferences?.preferredDays || []).includes(code)) {
      score += 10;
      reasons.push('Preferred working day');
    }
    const maxWeek = employee.preferences?.maxHoursPerWeek ?? 40;
    if (weeklyHours + shiftHours(shift) > maxWeek) {
      score -= 25;
      reasons.push('Would exceed preferred weekly hours');
    }
  }

  // --- OVERTIME / FAIRNESS ---
  if (weeklyHours >= 40) {
    score -= 20;
    reasons.push('Already at/over 40h (overtime)');
  } else if (weeklyHours < 16) {
    score += 8;
    reasons.push('Has spare capacity (fair distribution)');
  }

  // --- CONSECUTIVE DAYS ---
  const consec = consecutiveDaysEndingBefore(existingShifts, shift.date);
  if (consec >= maxConsecutiveDays) {
    score -= 30;
    reasons.push(`Would exceed ${maxConsecutiveDays} consecutive days`);
  }

  // --- SKILL ---
  if (considerSkill) {
    const lvl = employee.skillLevel ?? 3;
    score += (lvl - 3) * 4; // expert +8, junior -8
    if (lvl >= 4) reasons.push('High skill level');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, reasons, hard };
}

// How many consecutive days (ending the day before `date`) the employee already works.
function consecutiveDaysEndingBefore(existingShifts, date) {
  const dates = new Set(existingShifts.map((s) => s.date));
  let count = 0;
  let cursor = new Date(date + 'T00:00:00');
  for (let i = 0; i < 14; i++) {
    cursor.setDate(cursor.getDate() - 1);
    const iso = fmtDate(cursor);
    if (dates.has(iso)) count++;
    else break;
  }
  return count;
}

/**
 * Rank employees for a single shift. Returns sorted [{ employee, score, reasons }].
 */
function recommendStaffForShift(employees, shift, perEmployeeContext = {}, limit = 5) {
  const ranked = employees
    .map((employee) => {
      const ctx = perEmployeeContext[String(employee._id)] || {};
      const { score, reasons, hard } = scoreEmployeeForShift(employee, shift, ctx);
      return { employee, score, reasons, hard };
    })
    .filter((r) => !r.hard)
    .sort((a, b) => b.score - a.score);
  return limit ? ranked.slice(0, limit) : ranked;
}

/**
 * Generate a schedule across a date range.
 *
 * @param {Object} opts
 * @param {Array}  opts.employees    candidate User docs
 * @param {Array}  opts.shiftSlots   [{ date, startTime, endTime, department }] slots to fill
 * @param {Array}  opts.existing     already-assigned Shift docs (for conflict/fairness)
 * @param {Object} opts.options      { prioritizePreferences, considerSkill, maxConsecutiveDays }
 * @returns { assignments, unfilled, stats }
 */
function generateSchedule({ employees, shiftSlots, existing = [], options = {} }) {
  const {
    prioritizePreferences = true,
    considerSkill = true,
    maxConsecutiveDays = 5,
    department,
  } = options;

  // Mutable per-employee tracking
  const assignedByEmployee = new Map(); // id -> [{date,startTime,endTime}]
  const weeklyHoursByEmployee = new Map(); // id -> hours

  const weekKey = (date) => {
    const d = new Date(date + 'T00:00:00');
    const onejan = new Date(d.getFullYear(), 0, 1);
    return `${d.getFullYear()}-W${Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7)}`;
  };

  // seed tracking from existing shifts
  for (const s of existing) {
    const id = String(s.employee?._id || s.employee);
    if (!id || id === 'undefined') continue;
    if (!assignedByEmployee.has(id)) assignedByEmployee.set(id, []);
    assignedByEmployee.get(id).push({ date: s.date, startTime: s.startTime, endTime: s.endTime });
    const wk = `${id}:${weekKey(s.date)}`;
    weeklyHoursByEmployee.set(wk, (weeklyHoursByEmployee.get(wk) || 0) + shiftHours(s));
  }

  const pool = department && department !== 'all'
    ? employees.filter((e) => e.department === department)
    : employees;

  const assignments = [];
  const unfilled = [];

  // Fill slots; sort by date so consecutive-day tracking is correct
  const slots = [...shiftSlots].sort((a, b) => (a.date < b.date ? -1 : 1));

  for (const slot of slots) {
    const ctxById = {};
    for (const emp of pool) {
      const id = String(emp._id);
      ctxById[id] = {
        existingShifts: assignedByEmployee.get(id) || [],
        weeklyHours: weeklyHoursByEmployee.get(`${id}:${weekKey(slot.date)}`) || 0,
        considerSkill,
        prioritizePreferences,
        maxConsecutiveDays,
      };
    }

    const ranked = recommendStaffForShift(pool, slot, ctxById, 1);
    if (ranked.length === 0) {
      unfilled.push(slot);
      continue;
    }

    const best = ranked[0];
    const id = String(best.employee._id);
    assignments.push({
      employee: best.employee,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      department: slot.department || best.employee.department,
      score: best.score,
      reasons: best.reasons,
    });

    // update tracking
    if (!assignedByEmployee.has(id)) assignedByEmployee.set(id, []);
    assignedByEmployee.get(id).push({ date: slot.date, startTime: slot.startTime, endTime: slot.endTime });
    const wk = `${id}:${weekKey(slot.date)}`;
    weeklyHoursByEmployee.set(wk, (weeklyHoursByEmployee.get(wk) || 0) + shiftHours(slot));
  }

  const stats = {
    totalSlots: slots.length,
    filled: assignments.length,
    unfilled: unfilled.length,
    coverage: slots.length ? Math.round((assignments.length / slots.length) * 100) : 0,
    avgMatchScore: assignments.length
      ? Math.round(assignments.reduce((s, a) => s + a.score, 0) / assignments.length)
      : 0,
    employeesUsed: new Set(assignments.map((a) => String(a.employee._id))).size,
  };

  return { assignments, unfilled, stats };
}

/**
 * Build default daily shift slots for a date range (Mon-Fri, one 9-5 slot per
 * requested department per day). Used when the UI only sends date range + dept.
 */
function buildDefaultSlots({ startDate, endDate, departments, slotsPerDay = 1, includeWeekends = false }) {
  const slots = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const shiftTemplates = [
    { startTime: '09:00', endTime: '17:00' },
    { startTime: '12:00', endTime: '20:00' },
    { startTime: '08:00', endTime: '16:00' },
  ];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (!includeWeekends && (dow === 0 || dow === 6)) continue;
    const iso = fmtDate(d);
    for (const dept of departments) {
      for (let i = 0; i < slotsPerDay; i++) {
        const tpl = shiftTemplates[i % shiftTemplates.length];
        slots.push({ date: iso, department: dept, ...tpl });
      }
    }
  }
  return slots;
}

module.exports = {
  scoreEmployeeForShift,
  recommendStaffForShift,
  generateSchedule,
  buildDefaultSlots,
  shiftHours,
  dayCode,
  fmtDate,
};
