const { z } = require('zod');
const User = require('../models/User');
const Shift = require('../models/Shift');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const engine = require('../services/recommendation');

const generateSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  department: z.string().optional().default('all'),
  prioritizeEmployeePreferences: z.boolean().optional().default(true),
  considerSkillLevel: z.boolean().optional().default(true),
  maxConsecutiveDays: z.number().int().min(1).max(7).optional().default(5),
  slotsPerDay: z.number().int().min(1).max(5).optional().default(2),
  includeWeekends: z.boolean().optional().default(false),
});

const ALL_DEPARTMENTS = User.DEPARTMENTS;

// POST /api/schedule/generate  -> preview an AI-generated schedule (not persisted)
exports.generate = asyncHandler(async (req, res) => {
  const params = generateSchema.parse(req.body);

  // Normalize department casing: the UI may send "sales" but data is stored as "Sales".
  if (params.department && params.department !== 'all') {
    const canonical = ALL_DEPARTMENTS.find(
      (d) => d.toLowerCase() === params.department.toLowerCase()
    );
    params.department = canonical || params.department;
  }

  const departments =
    params.department && params.department !== 'all' ? [params.department] : ALL_DEPARTMENTS;

  const employees = await User.find({ role: 'employee', status: 'active' }).lean();
  if (employees.length === 0) throw ApiError.badRequest('No active employees to schedule');

  const slots = engine.buildDefaultSlots({
    startDate: params.startDate,
    endDate: params.endDate,
    departments,
    slotsPerDay: params.slotsPerDay,
    includeWeekends: params.includeWeekends,
  });

  const existing = await Shift.find({
    date: { $gte: params.startDate, $lte: params.endDate },
    status: { $ne: 'cancelled' },
  }).lean();

  const { assignments, unfilled, stats } = engine.generateSchedule({
    employees,
    shiftSlots: slots,
    existing,
    options: {
      prioritizePreferences: params.prioritizeEmployeePreferences,
      considerSkill: params.considerSkillLevel,
      maxConsecutiveDays: params.maxConsecutiveDays,
      department: params.department,
    },
  });

  res.json({
    success: true,
    params,
    stats,
    unfilled,
    shifts: assignments.map((a, i) => ({
      tempId: i + 1,
      employee: {
        id: a.employee._id,
        name: a.employee.name,
        initials: a.employee.initials,
        avatar: a.employee.avatar || '',
      },
      department: a.department,
      date: a.date,
      day: engine.dayCode(a.date),
      startTime: a.startTime,
      endTime: a.endTime,
      matchScore: a.score,
      reasons: a.reasons,
    })),
  });
});

// POST /api/schedule/publish  -> persist a set of generated shifts
exports.publish = asyncHandler(async (req, res) => {
  const schema = z.object({
    shifts: z
      .array(
        z.object({
          employee: z.string(),
          department: z.string(),
          date: z.string(),
          startTime: z.string(),
          endTime: z.string(),
        })
      )
      .min(1),
  });
  const { shifts } = schema.parse(req.body);

  const docs = await Shift.insertMany(
    shifts.map((s) => ({ ...s, status: 'confirmed', source: 'ai', createdBy: req.user._id }))
  );

  // notify affected employees
  await Notification.insertMany(
    docs.map((s) => ({
      user: s.employee,
      title: 'New shift assigned',
      message: `You have a ${s.department} shift on ${s.date} from ${s.startTime} to ${s.endTime}.`,
      type: 'shift',
    }))
  );

  res.status(201).json({ success: true, count: docs.length, shifts: docs });
});

// GET /api/schedule/recommend?date=&startTime=&endTime=&department=  -> best staff for a slot
exports.recommend = asyncHandler(async (req, res) => {
  const schema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string(),
    endTime: z.string(),
    department: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(20).optional().default(5),
  });
  const q = schema.parse(req.query);

  // Normalize department casing to match stored values.
  if (q.department) {
    const canonical = ALL_DEPARTMENTS.find((d) => d.toLowerCase() === q.department.toLowerCase());
    q.department = canonical || q.department;
  }

  const filter = { role: 'employee', status: 'active' };
  const employees = await User.find(filter).lean();

  const weekStart = new Date(q.date + 'T00:00:00');
  weekStart.setDate(weekStart.getDate() - 7);
  const recentShifts = await Shift.find({
    date: { $gte: engine.fmtDate(weekStart) },
    status: { $ne: 'cancelled' },
  }).lean();

  const ctxById = {};
  for (const emp of employees) {
    const mine = recentShifts.filter((s) => String(s.employee) === String(emp._id));
    ctxById[String(emp._id)] = {
      existingShifts: mine.map((s) => ({ date: s.date, startTime: s.startTime, endTime: s.endTime })),
      weeklyHours: mine.reduce((sum, s) => sum + engine.shiftHours(s), 0),
    };
  }

  const ranked = engine.recommendStaffForShift(
    employees,
    { date: q.date, startTime: q.startTime, endTime: q.endTime, department: q.department },
    ctxById,
    q.limit
  );

  res.json({
    success: true,
    recommendations: ranked.map((r) => ({
      employee: {
        id: r.employee._id,
        name: r.employee.name,
        initials: r.employee.initials,
        department: r.employee.department,
        position: r.employee.position,
        skillLevel: r.employee.skillLevel,
      },
      matchScore: r.score,
      reasons: r.reasons,
    })),
  });
});
