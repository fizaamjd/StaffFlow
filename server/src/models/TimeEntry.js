const mongoose = require('mongoose');

// Records worked hours per shift -> drives payroll & reports.
const timeEntrySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    department: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    hours: { type: Number, required: true, min: 0 },
    overtimeHours: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'approved', 'paid'], default: 'approved', index: true },
  },
  { timestamps: true }
);

timeEntrySchema.virtual('amount').get(function () {
  return +(this.hours * this.hourlyRate + this.overtimeHours * this.hourlyRate * 1.5).toFixed(2);
});

timeEntrySchema.set('toJSON', { virtuals: true });
timeEntrySchema.set('toObject', { virtuals: true });

timeEntrySchema.index({ employee: 1, date: 1 });

module.exports = mongoose.model('TimeEntry', timeEntrySchema);
