const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId:               { type: String, required: true, unique: true, trim: true },
  name:                    { type: String, required: true, trim: true },
  email:                   { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:                   { type: String, trim: true, default: '' },
  class:                   { type: String, required: true },
  section:                 { type: String, default: 'A' },
  rollNumber:              { type: Number, required: true },
  faceDescriptor:          { type: [Number], default: null },   // 128-d face vector (face-api.js)
  fingerprintCredentialId: { type: String,   default: null },   // WebAuthn credential ID
  photo:                   { type: String,   default: null },   // upload path
  isActive:                { type: Boolean,  default: true }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);