const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DEPARTMENTS = ['Sales', 'Support', 'Kitchen', 'Delivery', 'Admin', 'Cleaning'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['manager', 'employee'], default: 'employee', index: true },
    department: { type: String, enum: DEPARTMENTS, default: 'Sales', index: true },
    position: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },

    // Recommendation engine inputs
    skillLevel: { type: Number, min: 1, max: 5, default: 3 }, // 1=junior .. 5=expert
    hourlyRate: { type: Number, min: 0, default: 15 },
    skills: { type: [String], default: [] },

    // Availability: which weekdays + time windows the employee can work
    availability: {
      type: [
        {
          day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
          start: { type: String, default: '09:00' }, // HH:mm
          end: { type: String, default: '17:00' },
        },
      ],
      default: [],
    },
    // Soft preferences used to rank assignments
    preferences: {
      preferredDays: { type: [String], default: [] }, // ['Mon','Tue']
      maxHoursPerWeek: { type: Number, default: 40 },
      maxConsecutiveDays: { type: Number, default: 5 },
    },

    avatar: { type: String, default: '' },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.virtual('initials').get(function () {
  return (this.name || '')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.statics.DEPARTMENTS = DEPARTMENTS;

module.exports = mongoose.model('User', userSchema);
