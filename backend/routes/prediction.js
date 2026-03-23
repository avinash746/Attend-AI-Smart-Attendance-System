const express = require('express');
const router = express.Router();
const moment = require('moment');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

// ─── Weighted Moving Average Predictor ────────────────────────────────────────
// Mimics LSTM's recency-weighted memory using exponential smoothing (α=0.3).
// For full LSTM: use the Python microservice in /ml-service/ (see README).

function exponentialSmoothing(series, alpha = 0.3) {
  if (!series.length) return 0;
  let smoothed = series[0];
  for (let i = 1; i < series.length; i++) {
    smoothed = alpha * series[i] + (1 - alpha) * smoothed;
  }
  return smoothed;
}

function dayOfWeekBias(records) {
  // Calculate per-weekday attendance rate
  const byDay = Array(7).fill(null).map(() => ({ present: 0, total: 0 }));
  for (const r of records) {
    const dow = moment(r.date).day();
    byDay[dow].total++;
    if (r.status === 'present' || r.status === 'late') byDay[dow].present++;
  }
  return byDay.map(d => d.total > 0 ? d.present / d.total : 0.8);
}

function predictNextDays(records, daysAhead = 7) {
  if (records.length < 5) return null;
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const binary = sorted.map(r => (r.status === 'present' || r.status === 'late') ? 1 : 0);
  const dowBias = dayOfWeekBias(sorted);

  // Trend component: linear regression over last 14 days
  const recent = binary.slice(-14);
  const n = recent.length;
  const xMean = (n - 1) / 2;
  const yMean = recent.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  recent.forEach((y, i) => { num += (i - xMean) * (y - yMean); den += (i - xMean) ** 2; });
  const slope = den !== 0 ? num / den : 0;

  // Base probability via exponential smoothing
  const baseProb = exponentialSmoothing(binary, 0.3);

  const predictions = [];
  for (let i = 1; i <= daysAhead; i++) {
    const date = moment().add(i, 'days').format('YYYY-MM-DD');
    const dow = moment(date).day();
    if (dow === 0 || dow === 6) continue; // skip weekends

    // Combine: smoothing + trend + weekday bias
    const trendAdjust = slope * i * 0.1;
    const dowAdjust = (dowBias[dow] - 0.8) * 0.2;
    let probability = Math.min(1, Math.max(0, baseProb + trendAdjust + dowAdjust));

    predictions.push({
      date,
      dayLabel: moment(date).format('ddd, MMM D'),
      probability: Math.round(probability * 100),
      status: probability >= 0.75 ? 'likely_present' : probability >= 0.5 ? 'uncertain' : 'likely_absent',
      confidence: Math.round(Math.min(100, 60 + Math.min(records.length, 30) * 1.3))
    });
  }
  return predictions;
}

function classRiskSummary(allStudentPredictions) {
  const atRisk = allStudentPredictions.filter(s =>
    s.predictions && s.predictions.some(p => p.status === 'likely_absent')
  );
  return { total: allStudentPredictions.length, atRisk: atRisk.length, atRiskStudents: atRisk };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Predict for single student
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const { studentId } = req.params;
    const daysAhead = parseInt(req.query.days) || 7;
    const student = await Student.findOne({ studentId, isActive: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const from = moment().subtract(60, 'days').format('YYYY-MM-DD');
    const records = await Attendance.find({ studentId, date: { $gte: from } }).sort({ date: 1 });
    const predictions = predictNextDays(records, daysAhead);

    // Historical accuracy stats
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present').length;
    const avgAttendance = totalDays > 0 ? Math.round(presentDays / totalDays * 100) : 0;

    res.json({
      student: { name: student.name, studentId, class: student.class, photo: student.photo },
      predictions,
      historicalStats: { totalDays, presentDays, avgAttendance },
      modelInfo: { type: 'Exponential Smoothing + Linear Trend + Day-of-Week Bias', windowDays: 60 }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Predict at-risk students for entire class
router.get('/class-risk', protect, async (req, res) => {
  try {
    const { class: cls, section } = req.query;
    const query = { isActive: true };
    if (cls) query.class = cls;
    if (section) query.section = section;

    const students = await Student.find(query);
    const from = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const results = [];

    for (const student of students) {
      const records = await Attendance.find({ studentId: student.studentId, date: { $gte: from } });
      const predictions = predictNextDays(records, 5);
      const pct = records.length > 0
        ? Math.round(records.filter(r => r.status === 'present').length / records.length * 100)
        : 0;
      results.push({ student, predictions, currentAttendancePct: pct });
    }

    const summary = classRiskSummary(results);
    res.json({ summary, students: results.sort((a, b) => a.currentAttendancePct - b.currentAttendancePct) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;