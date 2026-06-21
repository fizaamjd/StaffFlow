const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    department: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD (kept as string for easy range queries)
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'open'],
      default: 'pending',
      index: true,
    },
    notes: { type: String, default: '' },
    source: { type: String, enum: ['manual', 'ai'], default: 'manual' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Common query patterns
shiftSchema.index({ employee: 1, date: 1 });
shiftSchema.index({ department: 1, date: 1 });

// Duration in hours (handles same-day shifts)
shiftSchema.virtual('hours').get(function () {
  const toMin = (t) => {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const diff = toMin(this.endTime) - toMin(this.startTime);
  return Math.max(0, diff) / 60;
});

shiftSchema.virtual('day').get(function () {
  const d = new Date(this.date + 'T00:00:00');
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
});

shiftSchema.set('toJSON', { virtuals: true });
shiftSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Shift', shiftSchema);
