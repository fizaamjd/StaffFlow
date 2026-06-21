const { z } = require('zod');
const crypto = require('crypto');
const User = require('../models/User');
const Shift = require('../models/Shift');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  department: z.string().min(1),
  position: z.string().min(2),
  phone: z.string().optional().default(''),
  password: z.string().min(6).optional(),
  skillLevel: z.number().int().min(1).max(5).optional(),
  hourlyRate: z.number().min(0).optional(),
  role: z.enum(['manager', 'employee']).optional().default('employee'),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
});

// GET /api/employees  (managers) — list with search + pagination
exports.list = asyncHandler(async (req, res) => {
  const { search = '', department, status, page = 1, limit = 50, role } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (department && department !== 'all') filter.department = department;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { position: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const lim = Math.min(200, parseInt(limit, 10));
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * lim).limit(lim),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / lim),
    employees: items,
  });
});

exports.get = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('Employee not found');
  res.json({ success: true, employee: user });
});

// POST /api/employees  (managers)
exports.create = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const exists = await User.findOne({ email: data.email });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  // auto-generate a temp password if none provided
  const tempPassword = data.password || crypto.randomBytes(6).toString('base64url');
  const user = await User.create({ ...data, password: tempPassword });

  const obj = user.toObject();
  delete obj.password;
  res.status(201).json({
    success: true,
    employee: obj,
    ...(data.password ? {} : { tempPassword }), // surface generated password once
  });
});

exports.update = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  if (data.password) delete data.password; // password changes go through a dedicated flow
  const user = await User.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('Employee not found');
  res.json({ success: true, employee: user });
});

exports.remove = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('Employee not found');
  // soft delete -> deactivate (keeps shift history intact)
  user.status = 'inactive';
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'Employee deactivated' });
});

// ---- self-service (employee updating own profile / availability) ----
exports.updateMe = asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
    availability: z.array(z.object({ day: z.string(), start: z.string(), end: z.string() })).optional(),
    preferences: z
      .object({
        preferredDays: z.array(z.string()).optional(),
        maxHoursPerWeek: z.number().optional(),
        maxConsecutiveDays: z.number().optional(),
      })
      .optional(),
  });
  const data = schema.parse(req.body);
  const user = await User.findByIdAndUpdate(req.user._id, data, { new: true, runValidators: true });
  res.json({ success: true, user });
});
