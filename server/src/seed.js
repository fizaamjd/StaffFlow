/**
 * Seed the database with demo data.
 * Run: npm run seed   (uses MONGODB_URI from .env)
 *
 * Creates:
 *  - 1 manager + 8 employees (across departments)
 *  - ~3 weeks of shifts (past + upcoming) via the scheduling engine
 *  - time entries for past shifts (drives payroll/reports)
 *  - a few notifications
 */
const mongoose = require('mongoose');
const env = require('./config/env');
const connectDB = require('./config/db');
const User = require('./models/User');
const Shift = require('./models/Shift');
const TimeEntry = require('./models/TimeEntry');
const Notification = require('./models/Notification');
const engine = require('./services/recommendation');

const DEPARTMENTS = User.DEPARTMENTS;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const iso = (d) => engine.fmtDate(d);

const employeesSeed = [
  { name: 'Jane Smith', department: 'Sales', position: 'Sales Representative', skillLevel: 4, hourlyRate: 22 },
  { name: 'Mike Johnson', department: 'Support', position: 'Customer Support', skillLevel: 3, hourlyRate: 20 },
  { name: 'Sarah Williams', department: 'Kitchen', position: 'Chef', skillLevel: 5, hourlyRate: 26 },
  { name: 'David Brown', department: 'Delivery', position: 'Delivery Driver', skillLevel: 2, hourlyRate: 18 },
  { name: 'Lisa Chen', department: 'Admin', position: 'Office Manager', skillLevel: 4, hourlyRate: 28 },
  { name: 'Tom Wilson', department: 'Sales', position: 'Sales Associate', skillLevel: 3, hourlyRate: 21 },
  { name: 'Emma Davis', department: 'Support', position: 'Support Lead', skillLevel: 5, hourlyRate: 25 },
  { name: 'Carlos Ruiz', department: 'Cleaning', position: 'Facilities', skillLevel: 2, hourlyRate: 17 },
];

const slug = (name) => name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');

async function seed() {
  await connectDB();
  console.log('🌱 Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Shift.deleteMany({}),
    TimeEntry.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  // --- manager ---
  const manager = await User.create({
    name: 'Alex Manager',
    email: process.env.SEED_MANAGER_EMAIL || 'manager@staffflow.com',
    password: process.env.SEED_MANAGER_PASSWORD || 'Manager@123',
    role: 'manager',
    department: 'Admin',
    position: 'Operations Manager',
    status: 'active',
  });

  // --- employees ---
  const employees = [];
  for (let i = 0; i < employeesSeed.length; i++) {
    const e = employeesSeed[i];
    const isDemo = i === 0; // make first employee the demo login
    const user = await User.create({
      name: e.name,
      email: isDemo
        ? process.env.SEED_EMPLOYEE_EMAIL || 'employee@staffflow.com'
        : `${slug(e.name)}@staffflow.com`,
      password: isDemo ? process.env.SEED_EMPLOYEE_PASSWORD || 'Employee@123' : 'Employee@123',
      role: 'employee',
      department: e.department,
      position: e.position,
      skillLevel: e.skillLevel,
      hourlyRate: e.hourlyRate,
      status: 'active',
      availability: DAYS.map((day) => ({ day, start: '08:00', end: '20:00' })),
      preferences: { preferredDays: DAYS.slice(0, 3), maxHoursPerWeek: 40, maxConsecutiveDays: 5 },
    });
    employees.push(user);
  }
  console.log(`👥 Created manager + ${employees.length} employees`);

  // --- generate shifts: 2 weeks past + 2 weeks future ---
  const start = new Date();
  start.setDate(start.getDate() - 14);
  const end = new Date();
  end.setDate(end.getDate() + 14);

  const slots = engine.buildDefaultSlots({
    startDate: iso(start),
    endDate: iso(end),
    departments: DEPARTMENTS,
    slotsPerDay: 2,
    includeWeekends: false,
  });

  const { assignments } = engine.generateSchedule({
    employees,
    shiftSlots: slots,
    existing: [],
    options: { prioritizePreferences: true, considerSkill: true, maxConsecutiveDays: 5 },
  });

  const today = iso(new Date());
  const shiftDocs = assignments.map((a) => ({
    employee: a.employee._id,
    department: a.department,
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.date < today ? 'completed' : 'confirmed',
    source: 'ai',
    createdBy: manager._id,
  }));
  const shifts = await Shift.insertMany(shiftDocs);
  console.log(`📅 Created ${shifts.length} shifts`);

  // --- time entries for completed shifts ---
  const empById = new Map(employees.map((e) => [String(e._id), e]));
  const entries = shifts
    .filter((s) => s.status === 'completed')
    .map((s) => {
      const emp = empById.get(String(s.employee));
      const hours = engine.shiftHours(s);
      return {
        employee: s.employee,
        shift: s._id,
        department: s.department,
        date: s.date,
        hours,
        overtimeHours: hours > 8 ? hours - 8 : 0,
        hourlyRate: emp?.hourlyRate || 18,
        status: 'paid',
      };
    });
  await TimeEntry.insertMany(entries);
  console.log(`💰 Created ${entries.length} time entries`);

  // --- notifications ---
  await Notification.insertMany([
    {
      user: manager._id,
      title: 'Welcome to StaffFlow',
      message: 'Your demo workspace is ready. Try the AI Scheduling page!',
      type: 'system',
    },
    {
      user: employees[0]._id,
      title: 'Schedule published',
      message: 'Your shifts for the next two weeks are now available.',
      type: 'schedule',
    },
    {
      user: employees[0]._id,
      title: 'Shift reminder',
      message: 'You have an upcoming shift. Please confirm your availability.',
      type: 'shift',
    },
  ]);
  console.log('🔔 Created notifications');

  console.log('\n✅ Seed complete! Login with:');
  console.log(`   Manager:  ${manager.email} / ${process.env.SEED_MANAGER_PASSWORD || 'Manager@123'}`);
  console.log(`   Employee: ${employees[0].email} / ${process.env.SEED_EMPLOYEE_PASSWORD || 'Employee@123'}`);

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
