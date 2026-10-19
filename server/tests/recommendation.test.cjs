const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scoreEmployeeForShift: score, recommendStaffForShift: rank, generateSchedule: generate, buildDefaultSlots, shiftHours, dayCode, fmtDate } = require('../src/services/recommendation');
const slot = (extra = {}) => ({ date: '2026-10-19', startTime: '09:00', endTime: '17:00', department: 'Support', ...extra });
const employee = (id, extra = {}) => ({ _id: id, status: 'active', department: 'Support', skillLevel: 3, ...extra });

test('inactive staff cannot be assigned', () => {
  const result = score(employee('a', { status: 'inactive' }), slot());
  assert.equal(result.hard, true); assert.equal(result.score, 0);
});
test('overlapping assignment is a hard exclusion', () => {
  const result = score(employee('a'), slot(), { existingShifts: [slot({ startTime: '08:00', endTime: '10:00' })] });
  assert.equal(result.hard, true);
});
test('adjacent shift boundary is not an overlap', () => {
  assert.equal(score(employee('a'), slot(), { existingShifts: [slot({ startTime: '07:00', endTime: '09:00' })] }).hard, false);
});
test('same times on a different date are not an overlap', () => {
  assert.equal(score(employee('a'), slot(), { existingShifts: [slot({ date: '2026-10-18' })] }).hard, false);
});
test('recommendation excludes hard failures and ranks department fit', () => {
  const people = [employee('other', { department: 'Sales' }), employee('match'), employee('inactive', { status: 'inactive' })];
  const results = rank(people, slot());
  assert.equal(results[0].employee._id, 'match');
  assert.ok(results[0].score > results[1].score);
  assert.ok(!results.some(r => r.employee._id === 'inactive'));
});
test('recommendation limit and full ranking are explicit', () => {
  const people = [employee('a'), employee('b'), employee('c')];
  assert.equal(rank(people, slot(), {}, 1).length, 1);
  assert.equal(rank(people, slot(), {}, 0).length, 3);
});
test('scores remain within the documented bounds', () => {
  for (const skill of [-100, 0, 3, 100]) {
    const result = score(employee('a', { skillLevel: skill }), slot());
    assert.ok(result.score >= 0 && result.score <= 100);
  }
});
test('availability improves a matching window but is not a hard guarantee', () => {
  const available = score(employee('a', { availability: [{ day: 'Mon', start: '08:00', end: '18:00' }] }), slot());
  const unavailable = score(employee('b', { availability: [{ day: 'Tue', start: '08:00', end: '18:00' }] }), slot());
  assert.ok(available.score > unavailable.score);
  assert.equal(unavailable.hard, false);
});
test('preference switch changes the score without excluding the person', () => {
  const person = employee('a', { preferences: { preferredDays: ['Mon'] } });
  assert.ok(score(person, slot()).score > score(person, slot(), { prioritizePreferences: false }).score);
});
test('overtime pressure lowers ranking', () => {
  assert.ok(score(employee('a'), slot(), { weeklyHours: 8 }).score > score(employee('a'), slot(), { weeklyHours: 48 }).score);
});
test('consecutive days produce a soft penalty with an explanation', () => {
  const existing = ['2026-10-18', '2026-10-17', '2026-10-16'].map(date => slot({ date }));
  const penalized = score(employee('a'), slot(), { existingShifts: existing, maxConsecutiveDays: 3 });
  assert.ok(penalized.score < score(employee('a'), slot()).score);
  assert.equal(penalized.hard, false);
  assert.ok(penalized.reasons.some(r => r.includes('consecutive days')));
});
test('generated overlapping slots use separate eligible employees', () => {
  const result = generate({ employees: [employee('a'), employee('b')], shiftSlots: [slot(), slot({ startTime: '10:00', endTime: '18:00' })] });
  assert.equal(result.assignments.length, 2);
  assert.equal(new Set(result.assignments.map(a => a.employee._id)).size, 2);
  assert.equal(result.stats.coverage, 100);
});
test('no eligible staff leaves a slot unfilled', () => {
  const result = generate({ employees: [employee('a', { status: 'inactive' })], shiftSlots: [slot()] });
  assert.equal(result.assignments.length, 0); assert.equal(result.unfilled.length, 1); assert.equal(result.stats.coverage, 0);
});
test('empty generation has finite zero statistics', () => {
  const result = generate({ employees: [], shiftSlots: [] });
  assert.equal(result.stats.coverage, 0); assert.equal(result.stats.avgMatchScore, 0);
});
test('existing database assignments prevent double booking', () => {
  const result = generate({ employees: [employee('a')], shiftSlots: [slot()], existing: [{ ...slot(), employee: 'a' }] });
  assert.equal(result.assignments.length, 0); assert.equal(result.unfilled.length, 1);
});
test('requested department limits the candidate pool', () => {
  const result = generate({ employees: [employee('sales', { department: 'Sales' }), employee('support')], shiftSlots: [slot()], options: { department: 'Support' } });
  assert.equal(result.assignments[0].employee._id, 'support');
});
test('default slots exclude weekends and include both date boundaries', () => {
  const result = buildDefaultSlots({ startDate: '2026-10-23', endDate: '2026-10-26', departments: ['Support'] });
  assert.deepEqual(result.map(s => s.date), ['2026-10-23', '2026-10-26']);
});
test('weekend option creates requested slots for each department', () => {
  const result = buildDefaultSlots({ startDate: '2026-10-24', endDate: '2026-10-25', departments: ['Support', 'Sales'], slotsPerDay: 2, includeWeekends: true });
  assert.equal(result.length, 8);
});
test('local date and duration helpers preserve a daytime shift', () => {
  assert.equal(shiftHours(slot()), 8); assert.equal(dayCode('2026-10-19'), 'Mon');
  assert.equal(fmtDate(new Date('2026-10-19T00:00:00')), '2026-10-19');
});
test('generation preserves caller-owned input records', () => {
  const input = { employees: [employee('a')], shiftSlots: [slot()], existing: [] };
  const before = structuredClone(input); generate(input); assert.deepEqual(input, before);
});
