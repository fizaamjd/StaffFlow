const { z } = require('zod');
const Shift = require('../models/Shift');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const shiftSchema = z.object({
  employee: z.string().optional(),
  department: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'open']).optional(),
  notes: z.string().optional(),
});

// GET /api/shifts — managers see all, employees see own. Supports filters.
exports.list = asyncHandler(async (req, res) => {
  const { from, to, department, status, employee, page = 1, limit = 100 } = req.query;
  const filter = {};

  if (req.user.role === 'employee') {
    filter.employee = req.user._id;
  } else if (employee) {
    filter.employee = employee;
  }
  if (department && department !== 'all') filter.department = department;
  if (status) filter.status = status;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const lim = Math.min(500, parseInt(limit, 10));
  const [items, total] = await Promise.all([
    Shift.find(filter)
      .populate('employee', 'name email department position avatar')
      .sort({ date: 1, startTime: 1 })
      .skip((pageNum - 1) * lim)
      .limit(lim),
    Shift.countDocuments(filter),
  ]);

  res.json({ success: true, total, page: pageNum, pages: Math.ceil(total / lim), shifts: items });
});

exports.get = asyncHandler(async (req, res) => {
  const shift = await Shift.findById(req.params.id).populate('employee', 'name email department position');
  if (!shift) throw ApiError.notFound('Shift not found');
  if (req.user.role === 'employee' && String(shift.employee?._id) !== String(req.user._id)) {
    throw ApiError.forbidden();
  }
  res.json({ success: true, shift });
});

exports.create = asyncHandler(async (req, res) => {
  const data = shiftSchema.parse(req.body);

  // overlap guard
  if (data.employee) {
    const overlap = await Shift.findOne({
      employee: data.employee,
      date: data.date,
      status: { $ne: 'cancelled' },
    });
    if (overlap && timesOverlap(overlap, data)) {
      throw ApiError.conflict('Employee already has an overlapping shift that day');
    }
  }

  const shift = await Shift.create({ ...data, createdBy: req.user._id });
  if (shift.employee) {
    await Notification.create({
      user: shift.employee,
      title: 'New shift assigned',
      message: `You have a ${shift.department} shift on ${shift.date} (${shift.startTime}-${shift.endTime}).`,
      type: 'shift',
    });
  }
  res.status(201).json({ success: true, shift });
});

exports.update = asyncHandler(async (req, res) => {
  const data = shiftSchema.partial().parse(req.body);
  const shift = await Shift.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!shift) throw ApiError.notFound('Shift not found');
  res.json({ success: true, shift });
});

exports.remove = asyncHandler(async (req, res) => {
  const shift = await Shift.findByIdAndDelete(req.params.id);
  if (!shift) throw ApiError.notFound('Shift not found');
  res.json({ success: true, message: 'Shift removed' });
});

// Employee confirms / declines their own shift
exports.respond = asyncHandler(async (req, res) => {
  const schema = z.object({ action: z.enum(['confirm', 'decline']) });
  const { action } = schema.parse(req.body);
  const shift = await Shift.findById(req.params.id);
  if (!shift) throw ApiError.notFound('Shift not found');
  if (String(shift.employee) !== String(req.user._id)) throw ApiError.forbidden();
  shift.status = action === 'confirm' ? 'confirmed' : 'cancelled';
  await shift.save();
  res.json({ success: true, shift });
});

function timesOverlap(a, b) {
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return toMin(a.startTime) < toMin(b.endTime) && toMin(b.startTime) < toMin(a.endTime);
}
