const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET all students
router.get('/', protect, async (req, res) => {
  try {
    const { class: cls, section, search } = req.query;
    let query = { isActive: true };
    if (cls) query.class = cls;
    if (section) query.section = section;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { studentId: { $regex: search, $options: 'i' } }
    ];
    const students = await Student.find(query).sort({ rollNumber: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single student
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE student
router.post('/', protect, upload.single('photo'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.photo = `/uploads/${req.file.filename}`;
    const student = await Student.create(data);
    res.status(201).json(student);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Student ID or Email already exists' });
    res.status(500).json({ message: err.message });
  }
});

// UPDATE student
router.put('/:id', protect, upload.single('photo'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.photo = `/uploads/${req.file.filename}`;
    const student = await Student.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SAVE face descriptor
router.post('/:id/face-descriptor', protect, async (req, res) => {
  try {
    const { descriptor, photo } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { faceDescriptor: descriptor, photo },
      { new: true }
    );
    res.json({ message: 'Face enrolled successfully', student });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SAVE fingerprint credential
router.post('/:id/fingerprint', protect, async (req, res) => {
  try {
    const { credentialId } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { fingerprintCredentialId: credentialId },
      { new: true }
    );
    res.json({ message: 'Fingerprint enrolled successfully', student });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE student
router.delete('/:id', protect, async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Student deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all face descriptors (for face recognition matching)
router.get('/face/all-descriptors', protect, async (req, res) => {
  try {
    const students = await Student.find({ faceDescriptor: { $ne: null }, isActive: true })
      .select('_id studentId name faceDescriptor photo class section');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;