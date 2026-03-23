const express = require('express');
const router = express.Router();
const moment = require('moment');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

// Mark attendance (all methods)
router.post('/mark', protect, async (req, res) => {
  try {
    const { studentId, method, status, notes, confidence, date } = req.body;
    const student = await Student.findOne({ studentId, isActive: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const today = date || moment().format('YYYY-MM-DD');
    const now = moment().format('HH:mm:ss');

    const existing = await Attendance.findOne({ student: student._id, date: today });
    if (existing) {
      // Update checkout time if already checked in
      existing.checkOutTime = now;
      await existing.save();
      return res.json({ message: 'Check-out recorded', attendance: existing, student });
    }

    const attendance = await Attendance.create({
      student: student._id,
      studentId,
      date: today,
      status: status || 'present',
      method,
      checkInTime: now,
      markedBy: req.user.name,
      notes: notes || '',
      confidence: confidence || null
    });

    res.status(201).json({ message: 'Attendance marked successfully', attendance, student });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Attendance already marked for today' });
    res.status(500).json({ message: err.message });
  }
});

// Mark bulk attendance (manual form - whole class)
router.post('/bulk', protect, async (req, res) => {
  try {
    const { attendanceData, date } = req.body;
    const today = date || moment().format('YYYY-MM-DD');
    const results = [];

    for (const item of attendanceData) {
      try {
        const student = await Student.findOne({ studentId: item.studentId, isActive: true });
        if (!student) continue;
        const existing = await Attendance.findOne({ student: student._id, date: today });
        if (existing) {
          existing.status = item.status;
          existing.method = 'manual';
          await existing.save();
          results.push({ studentId: item.studentId, action: 'updated' });
        } else {
          await Attendance.create({
            student: student._id,
            studentId: item.studentId,
            date: today,
            status: item.status,
            method: 'manual',
            checkInTime: moment().format('HH:mm:ss'),
            markedBy: req.user.name,
            notes: item.notes || ''
          });
          results.push({ studentId: item.studentId, action: 'created' });
        }
      } catch (e) {
        results.push({ studentId: item.studentId, action: 'error', error: e.message });
      }
    }
    res.json({ message: 'Bulk attendance processed', results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET attendance by date
router.get('/date/:date', protect, async (req, res) => {
  try {
    const { class: cls, section } = req.query;
    let studentQuery = { isActive: true };
    if (cls) studentQuery.class = cls;
    if (section) studentQuery.section = section;

    const students = await Student.find(studentQuery).sort({ rollNumber: 1 });
    const attendance = await Attendance.find({ date: req.params.date })
      .populate('student', 'name studentId class section rollNumber photo');

    const attendanceMap = {};
    attendance.forEach(a => {
      attendanceMap[a.studentId] = a;
    });

    const result = students.map(s => ({
      student: s,
      attendance: attendanceMap[s.studentId] || null,
      status: attendanceMap[s.studentId]?.status || 'absent'
    }));

    res.json({ date: req.params.date, data: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET student attendance history
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { studentId: req.params.studentId };
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    const records = await Attendance.find(query).sort({ date: -1 });
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const late = records.filter(r => r.status === 'late').length;
    const absent = records.filter(r => r.status === 'absent').length;
    res.json({
      records,
      stats: { total, present, late, absent, percentage: total ? Math.round((present + late) / total * 100) : 0 }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET today's attendance summary
router.get('/today/summary', protect, async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const totalStudents = await Student.countDocuments({ isActive: true });
    const todayAttendance = await Attendance.find({ date: today });
    const present = todayAttendance.filter(a => a.status === 'present').length;
    const late = todayAttendance.filter(a => a.status === 'late').length;
    const byMethod = { face: 0, fingerprint: 0, manual: 0 };
    todayAttendance.forEach(a => { if (byMethod[a.method] !== undefined) byMethod[a.method]++; });
    res.json({
      date: today,
      totalStudents,
      present,
      late,
      absent: totalStudents - present - late,
      byMethod,
      recentAttendance: await Attendance.find({ date: today })
        .populate('student', 'name studentId photo class')
        .sort({ createdAt: -1 })
        .limit(10)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;