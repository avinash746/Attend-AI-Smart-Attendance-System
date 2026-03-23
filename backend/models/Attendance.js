const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentId:    { type: String, required: true },
  date:         { type: String, required: true },                           // YYYY-MM-DD
  status:       { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
  method:       { type: String, enum: ['face', 'fingerprint', 'manual'], required: true },
  checkInTime:  { type: String, default: null },                            // HH:mm:ss
  checkOutTime: { type: String, default: null },
  markedBy:     { type: String, default: 'system' },
  notes:        { type: String, default: '' },
  confidence:   { type: Number, default: null }                             // face match %
}, { timestamps: true });

// Ek student ek din mein ek hi attendance
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);