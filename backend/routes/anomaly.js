const express    = require('express');
const router     = express.Router();
const moment     = require('moment');
const Attendance = require('../models/Attendance');
const Student    = require('../models/Student');
const AnomalyLog = require('../models/AnomalyLog');
const { protect } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════
// DETECTION RULES
// ═══════════════════════════════════════════════════════════════

// Rule 1 — Consecutive absences (2+ din — lowered threshold)
function detectConsecutiveAbsences(records, student) {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0, maxStreak = 0;
  for (const r of sorted) {
    if (r.status === 'absent') { streak++; maxStreak = Math.max(maxStreak, streak); }
    else streak = 0;
  }
  if (maxStreak >= 2) {
    return {
      type:     'consecutive_absence',
      severity: maxStreak >= 5 ? 'high' : maxStreak >= 3 ? 'medium' : 'low',
      message:  `${student.name} ${maxStreak} consecutive days absent`,
      data:     { streak: maxStreak }
    };
  }
  return null;
}

// Rule 2 — Chronic late pattern (30%+ days late)
function detectLatePattern(records) {
  const total     = records.length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const latePct   = total > 0 ? (lateCount / total) * 100 : 0;
  if (latePct >= 30 && lateCount >= 2) {
    return {
      type:     'late_pattern',
      severity: latePct >= 60 ? 'high' : 'medium',
      message:  `Chronic late pattern: ${Math.round(latePct)}% of days late`,
      data:     { lateCount, total, latePct: Math.round(latePct) }
    };
  }
  return null;
}

// Rule 3 — Sudden attendance drop (20%+ drop)
function detectSuddenDrop(records) {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 6) return null;
  const half       = Math.floor(sorted.length / 2);
  const pct        = arr => arr.filter(r => r.status !== 'absent').length / arr.length * 100;
  const firstHalf  = sorted.slice(0, half);
  const secondHalf = sorted.slice(half);
  const drop       = pct(firstHalf) - pct(secondHalf);
  if (drop >= 20) {
    return {
      type:     'sudden_drop',
      severity: drop >= 50 ? 'high' : 'medium',
      message:  `Attendance dropped ${Math.round(drop)}% recently`,
      data:     { firstHalfPct: Math.round(pct(firstHalf)), secondHalfPct: Math.round(pct(secondHalf)), drop: Math.round(drop) }
    };
  }
  return null;
}

// Rule 4 — Irregular check-in times (std dev > 30 min)
function detectIrregularCheckin(records) {
  const withTime = records.filter(r => r.checkInTime);
  if (withTime.length < 3) return null;
  const minutes = withTime.map(r => {
    const [h, m] = r.checkInTime.split(':').map(Number);
    return h * 60 + m;
  });
  const mean   = minutes.reduce((a, b) => a + b, 0) / minutes.length;
  const stdDev = Math.sqrt(minutes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / minutes.length);
  if (stdDev > 30) {
    return {
      type:     'irregular_checkin',
      severity: 'low',
      message:  `Irregular check-in times (std dev: ${Math.round(stdDev)} min)`,
      data:     { stdDevMinutes: Math.round(stdDev) }
    };
  }
  return null;
}

// Rule 5 — Overall low attendance (below 60%)
function detectOverallLowAttendance(records, student) {
  if (records.length < 3) return null;
  const pct = Math.round(records.filter(r => r.status !== 'absent').length / records.length * 100);
  if (pct < 60) {
    return {
      type:     'sudden_drop',
      severity: pct < 40 ? 'high' : 'medium',
      message:  `${student.name} overall attendance only ${pct}%`,
      data:     { overallPct: pct, totalDays: records.length }
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// RUN DETECTION FOR ONE STUDENT
// ═══════════════════════════════════════════════════════════════

async function runDetectionForStudent(studentId, days = 30) {
  const student = await Student.findOne({ studentId, isActive: true });
  if (!student) return [];

  const from    = moment().subtract(days, 'days').format('YYYY-MM-DD');
  const to      = moment().format('YYYY-MM-DD');
  const records = await Attendance.find({ studentId, date: { $gte: from, $lte: to } });

  // Even if no records, flag as potential issue
  if (records.length === 0) {
    // Check if student has never attended
    const anyRecord = await Attendance.findOne({ studentId });
    if (!anyRecord) {
      // No attendance at all — flag
      const exists = await AnomalyLog.findOne({
        studentId,
        type: 'consecutive_absence',
        detectedAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) }
      });
      if (!exists) {
        const log = await AnomalyLog.create({
          student:   student._id,
          studentId,
          type:      'consecutive_absence',
          severity:  'medium',
          message:   `${student.name} has NO attendance records yet`,
          data:      { streak: 0, note: 'No attendance marked' }
        });
        return [log];
      }
    }
    return [];
  }

  const rules = [
    detectConsecutiveAbsences(records, student),
    detectLatePattern(records),
    detectSuddenDrop(records),
    detectIrregularCheckin(records),
    detectOverallLowAttendance(records, student),
  ];

  const detected = [];
  for (const anomaly of rules.filter(Boolean)) {
    const recent = await AnomalyLog.findOne({
      studentId,
      type: anomaly.type,
      detectedAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) }
    });
    if (!recent) {
      const log = await AnomalyLog.create({
        student: student._id,
        studentId,
        ...anomaly
      });
      detected.push(log);
    }
  }
  return detected;
}

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

// Run detection for ALL students
router.post('/run', protect, async (req, res) => {
  try {
    const students    = await Student.find({ isActive: true }).select('studentId name');
    const allAnomalies = [];

    for (const s of students) {
      const found = await runDetectionForStudent(s.studentId, req.body.days || 30);
      allAnomalies.push(...found);
    }

    res.json({
      message:   `Detection complete. Found ${allAnomalies.length} new anomalies across ${students.length} students.`,
      anomalies: allAnomalies,
      total:     allAnomalies.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Run for single student
router.post('/run/:studentId', protect, async (req, res) => {
  try {
    const anomalies = await runDetectionForStudent(req.params.studentId, req.body.days || 30);
    res.json({ anomalies, total: anomalies.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all anomalies
router.get('/', protect, async (req, res) => {
  try {
    const { resolved, severity } = req.query;
    const filter = {};
    if (resolved !== undefined) filter.resolved = resolved === 'true';
    if (severity && severity !== 'all') filter.severity = severity;

    const anomalies = await AnomalyLog.find(filter)
      .populate('student', 'name studentId class section photo')
      .sort({ detectedAt: -1 })
      .limit(100);

    res.json(anomalies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get summary stats
router.get('/stats', protect, async (req, res) => {
  try {
    const total    = await AnomalyLog.countDocuments({ resolved: false });
    const high     = await AnomalyLog.countDocuments({ resolved: false, severity: 'high' });
    const medium   = await AnomalyLog.countDocuments({ resolved: false, severity: 'medium' });
    const low      = await AnomalyLog.countDocuments({ resolved: false, severity: 'low' });
    const resolved = await AnomalyLog.countDocuments({ resolved: true });

    res.json({ total, high, medium, low, resolved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Resolve anomaly
router.patch('/:id/resolve', protect, async (req, res) => {
  try {
    const anomaly = await AnomalyLog.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { new: true }
    );
    res.json(anomaly);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete all resolved
router.delete('/resolved/all', protect, async (req, res) => {
  try {
    const result = await AnomalyLog.deleteMany({ resolved: true });
    res.json({ message: `${result.deletedCount} resolved anomalies deleted` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;