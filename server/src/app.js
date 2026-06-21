const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const shiftRoutes = require('./routes/shifts');
const scheduleRoutes = require('./routes/schedule');
const payrollRoutes = require('./routes/payroll');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.set('trust proxy', 1);

// Security & parsing
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS
const corsOptions = {
  origin(origin, callback) {
    // allow non-browser clients (curl, server-to-server) with no origin
    if (!origin) return callback(null, true);
    // explicit allow-list, or "*" to allow everything
    if (env.clientOrigins.includes('*') || env.clientOrigins.includes(origin)) {
      return callback(null, true);
    }
    // allow any Vercel deployment (preview URLs change every deploy)
    try {
      if (new URL(origin).hostname.endsWith('.vercel.app')) return callback(null, true);
    } catch {
      /* fall through */
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Logging
if (!env.isProd) app.use(morgan('dev'));

// Rate limiting (global)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Stricter limiter for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

// Health check (for Render)
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/', (req, res) => res.json({ name: 'StaffFlow API', version: '1.0.0', docs: '/api' }));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 + error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
