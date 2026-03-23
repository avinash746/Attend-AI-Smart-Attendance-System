const mongoose = require('mongoose');

const anomalyLogSchema = new mongoose.Schema({
  student:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  studentId:  { type: String, required: true },
  type: {
    type: String,
    enum: ['consecutive_absence', 'late_pattern', 'irregular_checkin', 'sudden_drop', 'weekend_checkin'],
    required: true
  },
  severity:   { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  message:    { type: String, required: true },
  data:       { type: Object, default: {} },
  resolved:   { type: Boolean, default: false },
  detectedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('AnomalyLog', anomalyLogSchema);