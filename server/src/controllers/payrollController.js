const TimeEntry = require('../models/TimeEntry');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/payroll  — manager: department summary; employee: own entries
exports.summary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const match = {};
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;
  }

  if (req.user.role === 'employee') {
    match.employee = req.user._id;
    const entries = await TimeEntry.find(match).sort({ date: -1 }).populate('employee', 'name');
    const totals = entries.reduce(
      (acc, e) => {
        acc.hours += e.hours;
        acc.overtime += e.overtimeHours;
        acc.amount += e.amount;
        return acc;
      },
      { hours: 0, overtime: 0, amount: 0 }
    );
    return res.json({ success: true, entries, totals });
  }

  // manager: group by department
  const byDept = await TimeEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$department',
        employees: { $addToSet: '$employee' },
        hours: { $sum: '$hours' },
        overtimeHours: { $sum: '$overtimeHours' },
        regularPay: { $sum: { $multiply: ['$hours', '$hourlyRate'] } },
        overtimePay: { $sum: { $multiply: ['$overtimeHours', '$hourlyRate', 1.5] } },
      },
    },
    {
      $project: {
        _id: 0,
        department: '$_id',
        employeeCount: { $size: '$employees' },
        hours: 1,
        overtimeHours: 1,
        regularPay: { $round: ['$regularPay', 2] },
        overtimePay: { $round: ['$overtimePay', 2] },
        amount: { $round: [{ $add: ['$regularPay', '$overtimePay'] }, 2] },
      },
    },
    { $sort: { department: 1 } },
  ]);

  const totals = byDept.reduce(
    (acc, d) => {
      acc.hours += d.hours;
      acc.overtimeHours += d.overtimeHours;
      acc.amount += d.amount;
      acc.employees += d.employeeCount;
      return acc;
    },
    { hours: 0, overtimeHours: 0, amount: 0, employees: 0 }
  );
  totals.amount = +totals.amount.toFixed(2);

  res.json({ success: true, departments: byDept, totals });
});

// GET /api/payroll/trend — monthly amount trend (for charts)
exports.trend = asyncHandler(async (req, res) => {
  const match = req.user.role === 'employee' ? { employee: req.user._id } : {};
  const rows = await TimeEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $substr: ['$date', 0, 7] }, // YYYY-MM
        regular: { $sum: { $multiply: ['$hours', '$hourlyRate'] } },
        overtime: { $sum: { $multiply: ['$overtimeHours', '$hourlyRate', 1.5] } },
        hours: { $sum: '$hours' },
      },
    },
    {
      $project: {
        _id: 0,
        month: '$_id',
        regular: { $round: ['$regular', 2] },
        overtime: { $round: ['$overtime', 2] },
        amount: { $round: [{ $add: ['$regular', '$overtime'] }, 2] },
        hours: 1,
      },
    },
    { $sort: { month: 1 } },
  ]);
  res.json({ success: true, trend: rows });
});
