const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ── Register / Pehla account banao ────────────────────────────────────────────
// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Naam, email aur password required hain / Name, email and password are required' });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: 'Yeh email pehle se registered hai / Email already exists' });

    const user = await User.create({ name, email, password, role: role || 'admin' });

    res.status(201).json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      token: generateToken(user._id),
      message: 'Account ban gaya / Account created successfully'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email aur password dono chahiye / Email and password are required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Email ya password galat hai / Invalid email or password' });

    res.json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      token: generateToken(user._id)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get Current User Profile ──────────────────────────────────────────────────
// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// ── Add New Teacher/Staff (Admin Only) ───────────────────────────────────────
// POST /api/auth/add-user
router.post('/add-user', protect, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Sabhi fields required hain / All fields are required' });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: 'Yeh email pehle se registered hai / Email already exists' });

    const user = await User.create({ name, email, password, role: role || 'teacher' });

    res.status(201).json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      message: 'User add ho gaya / User added successfully'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get All Users ─────────────────────────────────────────────────────────────
// GET /api/auth/users
router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;