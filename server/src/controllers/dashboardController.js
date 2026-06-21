const User = require('../models/User');
const Shift = require('../models/Shift');
const TimeEntry = require('../models/TimeEntry');
const asyncHandler = require('../utils/asyncHandler');
const engine = require('../services/recommendation');

const todayISO = () => engine.fmtDate(new Date());
const addDaysISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return engine.fmtDate(d);
};

// GET /api/dashboard/manager
exports.manager = asyncHandler(async (req, res) => {
  const today = todayISO();
  const weekAhead = addDaysISO(7);

  const [totalEmployees, activeEmployees, todayShifts, upcomingShifts, openShifts, weeklyHoursAgg] =
    await Promise.all([
      User.countDocuments({ role: 'employee' }),
      User.countDocuments({ role: 'employee', status: 'active' }),
      Shift.countDocuments({ date: today, status: { $ne: 'cancelled' } }),
      Shift.find({ date: { $gte: today, $lte: weekAhead }, status: { $ne: 'cancelled' } })
        .populate('employee', 'name department avatar')
        .sort({ date: 1, startTime: 1 })
        .limit(8),
      Shift.countDocuments({ status: 'open' }),
      TimeEntry.aggregate([
        { $match: { date: { $gte: addDaysISO(-7) } } },
        { $group: { _id: null, hours: { $sum: '$hours' } } },
      ]),
    ]);

  // shifts per department for the chart (next 7 days)
  const shiftsByDept = await Shift.aggregate([
    { $match: { date: { $gte: today, $lte: weekAhead }, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
    { $project: { _id: 0, department: '$_id', count: 1 } },
    { $sort: { department: 1 } },
  ]);

  res.json({
    success: true,
    stats: {
      totalEmployees,
      activeEmployees,
      todayShifts,
      openShifts,
      weeklyHours: Math.round(weeklyHoursAgg[0]?.hours || 0),
    },
    shiftsByDept,
    upcomingShifts: upcomingShifts.map((s) => ({
      id: s._id,
      employee: s.employee ? { name: s.employee.name, department: s.employee.department } : null,
      department: s.department,
      date: s.date,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
    })),
  });
});

// GET /api/dashboard/employee
exports.employee = asyncHandler(async (req, res) => {
  const today = todayISO();
  const weekAhead = addDaysISO(7);
  const me = req.user._id;

  const [upcoming, thisWeekShifts, hoursAgg, pending] = await Promise.all([
    Shift.find({ employee: me, date: { $gte: today }, status: { $ne: 'cancelled' } })
      .sort({ date: 1, startTime: 1 })
      .limit(8),
    Shift.find({ employee: me, date: { $gte: today, $lte: weekAhead }, status: { $ne: 'cancelled' } }),
    TimeEntry.aggregate([
      { $match: { employee: me } },
      { $group: { _id: null, hours: { $sum: '$hours' }, amount: { $sum: { $multiply: ['$hours', '$hourlyRate'] } } } },
    ]),
    Shift.countDocuments({ employee: me, status: 'pending' }),
  ]);

  const weekHours = thisWeekShifts.reduce((sum, s) => sum + engine.shiftHours(s), 0);

  res.json({
    success: true,
    stats: {
      upcomingShifts: upcoming.length,
      hoursThisWeek: Math.round(weekHours),
      pendingConfirmations: pending,
      totalHours: Math.round(hoursAgg[0]?.hours || 0),
      totalEarnings: Math.round(hoursAgg[0]?.amount || 0),
    },
    upcomingShifts: upcoming.map((s) => ({
      id: s._id,
      department: s.department,
      date: s.date,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
    })),
  });
});
