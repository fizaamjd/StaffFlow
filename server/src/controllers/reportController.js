const Shift = require('../models/Shift');
const TimeEntry = require('../models/TimeEntry');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/reports — hours/shift analytics for charts & tables
exports.reports = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const isEmployee = req.user.role === 'employee';

  const shiftMatch = { status: { $ne: 'cancelled' } };
  if (isEmployee) shiftMatch.employee = req.user._id;
  if (from || to) {
    shiftMatch.date = {};
    if (from) shiftMatch.date.$gte = from;
    if (to) shiftMatch.date.$lte = to;
  }

  // shifts grouped by department
  const byDepartment = await Shift.aggregate([
    { $match: shiftMatch },
    { $group: { _id: '$department', shifts: { $sum: 1 } } },
    { $project: { _id: 0, department: '$_id', shifts: 1 } },
    { $sort: { department: 1 } },
  ]);

  // hours per month from time entries
  const teMatch = isEmployee ? { employee: req.user._id } : {};
  const hoursByMonth = await TimeEntry.aggregate([
    { $match: teMatch },
    {
      $group: {
        _id: { $substr: ['$date', 0, 7] },
        hours: { $sum: '$hours' },
        overtime: { $sum: '$overtimeHours' },
      },
    },
    { $project: { _id: 0, month: '$_id', hours: 1, overtime: 1 } },
    { $sort: { month: 1 } },
  ]);

  // status breakdown
  const byStatus = await Shift.aggregate([
    { $match: shiftMatch },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', count: 1 } },
  ]);

  res.json({ success: true, byDepartment, hoursByMonth, byStatus });
});
