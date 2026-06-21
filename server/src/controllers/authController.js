const { z } = require('zod');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const env = require('../config/env');

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['manager', 'employee']).optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function sanitize(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  return obj;
}

function setCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

exports.register = asyncHandler(async (req, res) => {
  const data = req.body;
  const exists = await User.findOne({ email: data.email });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create(data);
  const token = signToken({ id: user._id, role: user.role });
  setCookie(res, token);
  res.status(201).json({ success: true, token, user: sanitize(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (user.status === 'inactive') throw ApiError.forbidden('Account is inactive. Contact your administrator.');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken({ id: user._id, role: user.role });
  setCookie(res, token);
  res.json({ success: true, token, user: sanitize(user) });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
});

exports.updatePassword = asyncHandler(async (req, res) => {
  const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6) });
  const { currentPassword, newPassword } = schema.parse(req.body);
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated' });
});

exports.schemas = { registerSchema, loginSchema };
