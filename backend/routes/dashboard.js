const express = require('express');
const router = express.Router();
const moment = require('moment');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const weekStart = moment().startOf('week').format('YYYY-MM-DD');
    const monthStart = moment().startOf('month').format('YYYY-MM-DD');

    const totalStudents = await Student.countDocuments({ isActive: true });
    const todayRecords = await Attendance.find({ date: today });
    const weekRecords = await Attendance.find({ date: { $gte: weekStart, $lte: today } });
    const monthRecords = await Attendance.find({ date: { $gte: monthStart, $lte: today } });

    // Weekly chart data
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const day = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const dayLabel = moment().subtract(i, 'days').format('ddd');
      const dayRecords = await Attendance.find({ date: day });
      weeklyData.push({
        day: dayLabel, date: day,
        present: dayRecords.filter(r => r.status === 'present').length,
        late: dayRecords.filter(r => r.status === 'late').length,
        absent: totalStudents - dayRecords.length
      });
    }

    res.json({
      today: {
        total: totalStudents,
        present: todayRecords.filter(r => r.status === 'present').length,
        late: todayRecords.filter(r => r.status === 'late').length,
        absent: totalStudents - todayRecords.length,
        byMethod: {
          face: todayRecords.filter(r => r.method === 'face').length,
          fingerprint: todayRecords.filter(r => r.method === 'fingerprint').length,
          manual: todayRecords.filter(r => r.method === 'manual').length
        }
      },
      week: { total: weekRecords.length, present: weekRecords.filter(r => r.status === 'present').length },
      month: { total: monthRecords.length, present: monthRecords.filter(r => r.status === 'present').length },
      weeklyData
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;