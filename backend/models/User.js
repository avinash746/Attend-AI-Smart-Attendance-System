const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: [true, 'Naam required hai / Name is required'] },
  email:    { type: String, required: [true, 'Email required hai / Email is required'], unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, 'Password required hai / Password is required'], minlength: 6 },
  role:     { type: String, enum: ['admin', 'teacher'], default: 'teacher' }
}, { timestamps: true });

// Password hash karo save se pehle
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Password compare karo login ke time
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);