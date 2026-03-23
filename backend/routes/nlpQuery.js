const express  = require('express');
const router   = express.Router();
const moment   = require('moment');
const Attendance = require('../models/Attendance');
const Student    = require('../models/Student');
const AnomalyLog = require('../models/AnomalyLog');
const { protect } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED NLP INTENT ENGINE
// Supports: English, Hindi, Hinglish
// 15+ intents with context-aware responses
// ═══════════════════════════════════════════════════════════════════════════

const INTENTS = [
  // ── Greetings ────────────────────────────────────────────────────────────
  {
    name: 'greeting',
    patterns: [/^(hi|hello|hey|namaste|hii|helo|namaskar|good morning|good evening|salam)\b/i, /^(kya haal|kaisa hai|how are you)/i],
    handler: greeting
  },
  // ── Help ─────────────────────────────────────────────────────────────────
  {
    name: 'help',
    patterns: [/help|kya kar sakte|what can you do|commands|features|batao kya/i],
    handler: helpMenu
  },
  // ── Today summary ─────────────────────────────────────────────────────────
  {
    name: 'today_summary',
    patterns: [/today('s)? attendance/i, /aaj (ki|ka) attendance/i, /aaj kitne (aaye|present|students)/i, /how many (students )?(came|present|absent) today/i, /attendance (today|aaj)/i, /abhi (kitne|kaun)/i],
    handler: todaySummary
  },
  // ── Student status ────────────────────────────────────────────────────────
  {
    name: 'student_status',
    patterns: [/is (.+?) (present|absent|here|aaya|nahi aaya)/i, /(.+?) (aaya|present|absent|nahi) (hai|tha|kya)/i, /status of (.+)/i, /where is (.+)/i, /(.+?) ka status/i],
    handler: studentStatus
  },
  // ── Date attendance ───────────────────────────────────────────────────────
  {
    name: 'date_attendance',
    patterns: [/attendance (on|for|of) (.+)/i, /(.+) (ko|ka|ki) attendance/i, /who (was|were) (absent|present|late) (on|yesterday|today)/i, /kal (ki|ka) attendance/i, /yesterday('s)? attendance/i],
    handler: dateAttendance
  },
  // ── Low attendance ────────────────────────────────────────────────────────
  {
    name: 'low_attendance',
    patterns: [/who (has|have) (low|poor|bad|kam) attendance/i, /students (below|under|se kam) (\d+)%/i, /at.?risk students/i, /kitne (below|kam)/i, /(\d+)% se kam/i, /low attendance wale/i],
    handler: lowAttendance
  },
  // ── Absent streak ─────────────────────────────────────────────────────────
  {
    name: 'absent_streak',
    patterns: [/who (has been|is) absent (for|since|continuously)/i, /consecutive absence/i, /lagatar absent/i, /(\d+) din se absent/i, /continuously absent/i, /kaun lagatar nahi aaya/i],
    handler: absentStreak
  },
  // ── Best attendance ───────────────────────────────────────────────────────
  {
    name: 'best_attendance',
    patterns: [/best attendance/i, /top (\d+) students/i, /highest attendance/i, /sabse zyada (aane wale|regular)/i, /most regular/i, /100% attendance/i],
    handler: bestAttendance
  },
  // ── Monthly report ────────────────────────────────────────────────────────
  {
    name: 'monthly_report',
    patterns: [/(this|last|is|pichle|current) month/i, /monthly report/i, /mahine (ka|ki)/i, /is mahine/i, /month ka summary/i],
    handler: monthlyReport
  },
  // ── Weekly report ─────────────────────────────────────────────────────────
  {
    name: 'weekly_report',
    patterns: [/(this|last|pichle|current) week/i, /weekly report/i, /hafte (ka|ki)/i, /is hafte/i, /week ka summary/i],
    handler: weeklyReport
  },
  // ── Class wise report ─────────────────────────────────────────────────────
  {
    name: 'class_report',
    patterns: [/class (\d+|ten|nine|eight|seven|six|five|four|three|two|one) (attendance|report)/i, /class (ka|ki) attendance/i, /section (A|B|C|D) attendance/i, /konsi class/i],
    handler: classReport
  },
  // ── Total students ────────────────────────────────────────────────────────
  {
    name: 'total_students',
    patterns: [/how many students/i, /total students/i, /kitne students hain/i, /student count/i, /total registered/i, /kul students/i],
    handler: totalStudents
  },
  // ── Anomaly check ─────────────────────────────────────────────────────────
  {
    name: 'anomaly_check',
    patterns: [/anomal(y|ies)/i, /unusual pattern/i, /suspicious attendance/i, /koi problem/i, /attendance problem/i, /irregular students/i],
    handler: anomalyCheck
  },
  // ── Late students ─────────────────────────────────────────────────────────
  {
    name: 'late_students',
    patterns: [/who (came|is|was) late/i, /late (aane wale|students)/i, /late comers/i, /kaun late aaya/i, /der se aane wale/i, /late mark/i],
    handler: lateStudents
  },
  // ── Attendance percentage ─────────────────────────────────────────────────
  {
    name: 'attendance_percentage',
    patterns: [/attendance (percentage|percent|rate|%)/i, /(\w+) (ka|ki) attendance (percentage|%)/i, /overall attendance/i, /average attendance/i, /kitna percent/i],
    handler: attendancePercentage
  },
  // ── Specific student history ──────────────────────────────────────────────
  {
    name: 'student_history',
    patterns: [/(.+?) (ki|ka) history/i, /(.+?) attendance history/i, /(.+?) ne kitni baar/i, /history of (.+)/i, /(.+?) ka record/i],
    handler: studentHistory
  },
  // ── Goodbye ───────────────────────────────────────────────────────────────
  {
    name: 'goodbye',
    patterns: [/^(bye|goodbye|alvida|ok thanks|theek hai|shukriya|dhanyawad|thank you|thanks)\b/i],
    handler: goodbye
  }
];

function parseIntent(query) {
  const q = query.trim();
  for (const intent of INTENTS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(q)) return intent;
    }
  }
  return null;
}

function extractDateFromQuery(query) {
  if (/yesterday|kal|kal ka/i.test(query))   return moment().subtract(1,'days').format('YYYY-MM-DD');
  if (/today|aaj|abhi/i.test(query))         return moment().format('YYYY-MM-DD');
  if (/parso|day before yesterday/i.test(query)) return moment().subtract(2,'days').format('YYYY-MM-DD');
  const match = query.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (match) {
    const [, d, m, y] = match;
    return moment(`${y || new Date().getFullYear()}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`).format('YYYY-MM-DD');
  }
  return moment().format('YYYY-MM-DD');
}

function extractPercentFromQuery(query) {
  const match = query.match(/(\d+)%/);
  return match ? parseInt(match[1]) : 75;
}

function extractNameFromQuery(query) {
  // Try multiple patterns
  const patterns = [
    /(?:is|where is|status of)\s+([a-zA-Z\s]+?)(?:\s+present|\s+absent|\s+here|\s+aaya|\?|$)/i,
    /([a-zA-Z]+(?:\s[a-zA-Z]+)?)\s+(?:aaya|present|absent|ka status|nahi aaya)/i,
    /history of\s+([a-zA-Z\s]+?)(?:\s*$|\?)/i,
    /([a-zA-Z]+(?:\s[a-zA-Z]+)?)\s+(?:ki|ka)\s+(?:history|record|attendance)/i,
  ];
  for (const p of patterns) {
    const m = query.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

async function greeting() {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good Morning! 🌅' : hour < 17 ? 'Good Afternoon! ☀️' : 'Good Evening! 🌙';
  return {
    text: `${greet} Namaste! 🙏\n\nMain aapka **Attendance AI Assistant** hoon.\n\nAap mujhse pooch sakte hain:\n• 📊 "Aaj ki attendance kaisi hai?"\n• 👤 "Is Rahul present?"\n• ⚠️ "Kaun lagatar absent hai?"\n• 📈 "Is mahine ka report"\n• 🏆 "Sabse regular students"\n\nType **"help"** for all commands!`,
    type: 'greeting'
  };
}

async function helpMenu() {
  return {
    text: `🤖 **AttendAI Bot — Commands List**\n\n📊 **Attendance Queries:**\n• "Today's attendance" / "Aaj ki attendance"\n• "Yesterday's attendance" / "Kal ki attendance"\n• "Who was absent today?" / "Aaj kaun absent tha?"\n• "Who came late?" / "Kaun late aaya?"\n\n👤 **Student Queries:**\n• "Is [name] present?" / "[naam] aaya hai?"\n• "[name] ki attendance history"\n• "Total students kitne hain?"\n\n📈 **Reports:**\n• "This month report" / "Is mahine ki report"\n• "This week summary" / "Is hafte ka summary"\n• "Class 10 attendance"\n• "Overall attendance percentage"\n\n⚠️ **Alerts:**\n• "Who has low attendance?" / "Kam attendance wale"\n• "Students below 75%"\n• "Consecutive absences" / "Lagatar absent"\n• "Check anomalies"\n\n🏆 **Rankings:**\n• "Best attendance students"\n• "Top 5 regular students"\n\n💬 **Hinglish bhi kaam karta hai!**`,
    type: 'help'
  };
}

async function todaySummary() {
  const today   = moment().format('YYYY-MM-DD');
  const total   = await Student.countDocuments({ isActive: true });
  const records = await Attendance.find({ date: today });
  const present = records.filter(r => r.status === 'present').length;
  const late    = records.filter(r => r.status === 'late').length;
  const absent  = total - present - late;
  const pct     = total > 0 ? Math.round((present + late) / total * 100) : 0;

  const byMethod = { face: 0, fingerprint: 0, manual: 0 };
  records.forEach(r => { if (byMethod[r.method] !== undefined) byMethod[r.method]++; });

  const recentNames = await Attendance.find({ date: today, status: 'present' })
    .populate('student','name').sort({ createdAt: -1 }).limit(3);

  const recentList = recentNames.map(r => `  • ${r.student?.name || r.studentId}`).join('\n');

  const statusEmoji = pct >= 80 ? '🟢' : pct >= 60 ? '🟡' : '🔴';

  return {
    text: `📊 **Aaj ki Attendance — ${moment().format('dddd, MMMM D')}**\n\n${statusEmoji} Overall: **${pct}%**\n\n✅ Present: **${present}**\n⏰ Late:    **${late}**\n❌ Absent:  **${absent}**\n👥 Total:   **${total}**\n\n📱 Method Breakdown:\n  👤 Face: ${byMethod.face} | 🖐 Fingerprint: ${byMethod.fingerprint} | 📝 Manual: ${byMethod.manual}\n${recentList ? `\n🕐 Recently Marked:\n${recentList}` : ''}`,
    data: { present, late, absent, total, pct }
  };
}

async function studentStatus(query) {
  const name = extractNameFromQuery(query);
  if (!name) return { text: "Student ka naam batao!\nExample: 'Is Rahul present?' ya 'Priya aaya hai?'" };

  const student = await Student.findOne({ name: { $regex: name, $options: 'i' }, isActive: true });
  if (!student) return { text: `❓ "${name}" naam ka koi student nahi mila.\n\nSpelling check karo ya Students page pe dekho.` };

  const today  = moment().format('YYYY-MM-DD');
  const record = await Attendance.findOne({ studentId: student.studentId, date: today });
  const status = record ? record.status : 'absent';
  const emoji  = { present: '✅', late: '⏰', absent: '❌' }[status];

  // Last 7 days attendance
  const last7 = await Attendance.find({
    studentId: student.studentId,
    date: { $gte: moment().subtract(7,'days').format('YYYY-MM-DD') }
  }).sort({ date: -1 });

  const last7pct = last7.length > 0
    ? Math.round(last7.filter(r => r.status !== 'absent').length / 7 * 100)
    : 0;

  return {
    text: `${emoji} **${student.name}** — Aaj: **${status.toUpperCase()}**\n\n📋 Info:\n  ID: ${student.studentId}\n  Class: ${student.class}-${student.section}\n  Roll: #${student.rollNumber}\n${record ? `\n⏰ Check-in: ${record.checkInTime || 'N/A'}\n📱 Method: ${record.method}` : '\n⚠️ Aaj mark nahi hua'}\n\n📈 Last 7 days: ${last7pct}% attendance`,
    data: { student, record, status }
  };
}

async function dateAttendance(query) {
  const date     = extractDateFromQuery(query);
  const isAbsent = /absent|nahi aaya|nahi tha/i.test(query);
  const isLate   = /late|der se/i.test(query);

  const records = await Attendance.find({ date }).populate('student','name studentId class');
  const total   = await Student.countDocuments({ isActive: true });

  let filtered;
  let label;
  if (isAbsent) {
    // Students who did NOT mark attendance
    const marked = new Set(records.map(r => r.studentId));
    const allStudents = await Student.find({ isActive: true });
    const absentList  = allStudents.filter(s => !marked.has(s.studentId));
    return {
      text: `❌ **Absent on ${moment(date).format('ddd, MMM D')}** (${absentList.length} students):\n\n${absentList.slice(0,10).map(s => `• ${s.name} (${s.studentId})`).join('\n')}${absentList.length > 10 ? `\n...aur ${absentList.length - 10} aur` : ''}\n\n📊 Total: ${records.length}/${total} marked`,
      data: { date, absentCount: absentList.length }
    };
  } else if (isLate) {
    filtered = records.filter(r => r.status === 'late');
    label = 'Late';
  } else {
    filtered = records.filter(r => r.status === 'present' || r.status === 'late');
    label = 'Present/Late';
  }

  const names = filtered.slice(0,10).map(r => `• ${r.student?.name || r.studentId}`).join('\n');
  return {
    text: `📅 **${label} on ${moment(date).format('ddd, MMM D')}** (${filtered.length} students):\n\n${names || 'Koi nahi mila'}${filtered.length > 10 ? `\n...aur ${filtered.length-10} aur` : ''}\n\n📊 Total marked: ${records.length}/${total}`,
    data: { date, records: filtered }
  };
}

async function lowAttendance(query) {
  const threshold = extractPercentFromQuery(query);
  const from      = moment().subtract(30,'days').format('YYYY-MM-DD');
  const students  = await Student.find({ isActive: true });
  const atRisk    = [];

  for (const s of students) {
    const records = await Attendance.find({ studentId: s.studentId, date: { $gte: from } });
    if (!records.length) { atRisk.push({ student: s, pct: 0, days: 0 }); continue; }
    const pct = Math.round(records.filter(r => r.status !== 'absent').length / records.length * 100);
    if (pct < threshold) atRisk.push({ student: s, pct, days: records.length });
  }
  atRisk.sort((a,b) => a.pct - b.pct);

  if (!atRisk.length) return {
    text: `🎉 Koi bhi student ${threshold}% se kam nahi hai!\n\nSabki attendance achhi hai! ✅`
  };

  const list = atRisk.slice(0,8).map((r,i) =>
    `${i+1}. ${r.student.name} — **${r.pct}%** (${r.days} days tracked)`
  ).join('\n');

  return {
    text: `⚠️ **Students below ${threshold}%** (Last 30 days):\n\n${list}\n\n📊 Total at-risk: ${atRisk.length} students\n\n💡 Tip: Inko alert bhejo ya parents ko inform karo!`,
    data: { atRisk, threshold }
  };
}

async function absentStreak() {
  const students = await Student.find({ isActive: true });
  const streaks  = [];

  for (const s of students) {
    const records = await Attendance.find({ studentId: s.studentId }).sort({ date: -1 }).limit(14);
    let streak = 0;
    for (const r of records) {
      if (r.status === 'absent') streak++;
      else break;
    }
    if (streak >= 2) streaks.push({ student: s, streak });
  }
  streaks.sort((a,b) => b.streak - a.streak);

  if (!streaks.length) return {
    text: '✅ Kisi bhi student ki consecutive absence nahi hai!\n\nSab regular aa rahe hain! 🎉'
  };

  const list = streaks.slice(0,8).map((r,i) =>
    `${i+1}. ${r.student.name} — **${r.streak} din** se absent\n   (${r.student.class}-${r.student.section})`
  ).join('\n\n');

  return {
    text: `🔴 **Consecutive Absences Alert!**\n\n${list}\n\n💡 Inhe turant contact karo!`,
    data: { streaks }
  };
}

async function bestAttendance() {
  const from     = moment().subtract(30,'days').format('YYYY-MM-DD');
  const students = await Student.find({ isActive: true });
  const ranked   = [];

  for (const s of students) {
    const records = await Attendance.find({ studentId: s.studentId, date: { $gte: from } });
    if (!records.length) continue;
    const pct = Math.round(records.filter(r => r.status !== 'absent').length / records.length * 100);
    ranked.push({ student: s, pct, days: records.length });
  }
  ranked.sort((a,b) => b.pct - a.pct || b.days - a.days);

  const medals   = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  const list     = ranked.slice(0,10).map((r,i) =>
    `${medals[i]} ${r.student.name} — **${r.pct}%** (${r.days} days)`
  ).join('\n');

  return {
    text: `🏆 **Top Students by Attendance** (Last 30 days):\n\n${list || 'Data nahi mila'}\n\n⭐ ${ranked[0]?.student.name} is leading with ${ranked[0]?.pct}%!`,
    data: { ranked: ranked.slice(0,10) }
  };
}

async function monthlyReport() {
  const start   = moment().startOf('month').format('YYYY-MM-DD');
  const end     = moment().format('YYYY-MM-DD');
  const records = await Attendance.find({ date: { $gte: start, $lte: end } });
  const total   = await Student.countDocuments({ isActive: true });
  const days    = moment().date();

  const present = records.filter(r => r.status === 'present').length;
  const late    = records.filter(r => r.status === 'late').length;
  const byMethod= { face: 0, fingerprint: 0, manual: 0 };
  records.forEach(r => { if (byMethod[r.method] !== undefined) byMethod[r.method]++; });

  const avgRate  = total > 0 ? Math.round((present + late) / (total * days) * 100) : 0;
  const emoji    = avgRate >= 80 ? '🟢' : avgRate >= 60 ? '🟡' : '🔴';

  return {
    text: `📆 **${moment().format('MMMM YYYY')} Report**\n\n${emoji} Average Attendance: **${avgRate}%**\n📅 Working days so far: ${days}\n👥 Total students: ${total}\n\n✅ Present entries: ${present}\n⏰ Late entries: ${late}\n📊 Total records: ${records.length}\n\n📱 By Method:\n  👤 Face Recognition: ${byMethod.face}\n  🖐 Fingerprint: ${byMethod.fingerprint}\n  📝 Manual Form: ${byMethod.manual}`,
    data: { avgRate, records: records.length }
  };
}

async function weeklyReport() {
  const start   = moment().startOf('week').format('YYYY-MM-DD');
  const end     = moment().format('YYYY-MM-DD');
  const total   = await Student.countDocuments({ isActive: true });

  const weeklyData = [];
  for (let i = 0; i < 7; i++) {
    const day     = moment().startOf('week').add(i,'days').format('YYYY-MM-DD');
    if (day > end) break;
    const dayRecs = await Attendance.find({ date: day });
    const present = dayRecs.filter(r => r.status !== 'absent').length;
    weeklyData.push({
      day:     moment(day).format('ddd'),
      date:    day,
      present,
      absent:  total - present,
      pct:     total > 0 ? Math.round(present/total*100) : 0
    });
  }

  const avgPct = weeklyData.length > 0
    ? Math.round(weeklyData.reduce((s,d) => s+d.pct, 0) / weeklyData.length)
    : 0;

  const dayList = weeklyData.map(d =>
    `  ${d.day}: ${'█'.repeat(Math.round(d.pct/10))}${'░'.repeat(10-Math.round(d.pct/10))} ${d.pct}%`
  ).join('\n');

  return {
    text: `📅 **This Week's Report**\n\nAverage: **${avgPct}%**\n\n${dayList}\n\nBest day: ${weeklyData.sort((a,b)=>b.pct-a.pct)[0]?.day || 'N/A'}`,
    data: { weeklyData, avgPct }
  };
}

async function classReport(query) {
  const classMatch = query.match(/class (\d+|ten|nine|eight|seven|six|five)/i);
  const classNum   = classMatch ? classMatch[1] : null;
  const className  = classNum ? `Class ${classNum}` : null;

  const filter = { isActive: true };
  if (className) filter.class = { $regex: classNum, $options: 'i' };

  const students = await Student.find(filter);
  if (!students.length) return { text: `❓ ${className || 'Is class'} ke koi students nahi mile.` };

  const from    = moment().subtract(30,'days').format('YYYY-MM-DD');
  const today   = moment().format('YYYY-MM-DD');
  let totalPct  = 0;
  let counted   = 0;

  for (const s of students) {
    const records = await Attendance.find({ studentId: s.studentId, date: { $gte: from } });
    if (!records.length) continue;
    totalPct += Math.round(records.filter(r => r.status !== 'absent').length / records.length * 100);
    counted++;
  }

  const todayRecs  = await Attendance.find({
    date: today,
    studentId: { $in: students.map(s => s.studentId) }
  });

  const avgPct = counted > 0 ? Math.round(totalPct / counted) : 0;

  return {
    text: `📚 **${className || 'Class'} Report**\n\n👥 Total Students: ${students.length}\n✅ Present Today: ${todayRecs.filter(r=>r.status!=='absent').length}/${students.length}\n📈 Avg Attendance (30d): ${avgPct}%\n\n${avgPct >= 80 ? '🟢 Class performance: Excellent!' : avgPct >= 60 ? '🟡 Class performance: Average' : '🔴 Class needs attention!'}`,
    data: { className, students: students.length, avgPct }
  };
}

async function totalStudents() {
  const total    = await Student.countDocuments({ isActive: true });
  const withFace = await Student.countDocuments({ isActive: true, faceDescriptor: { $ne: null } });
  const withFP   = await Student.countDocuments({ isActive: true, fingerprintCredentialId: { $ne: null } });

  const today    = moment().format('YYYY-MM-DD');
  const todayRec = await Attendance.find({ date: today });
  const present  = todayRec.filter(r => r.status !== 'absent').length;

  return {
    text: `👥 **Student Statistics**\n\n📊 Total Registered: **${total}**\n✅ Present Today: **${present}**\n❌ Absent Today: **${total - present}**\n\n🔐 Biometric Enrollment:\n  👤 Face Enrolled: ${withFace}/${total}\n  🖐 Fingerprint Enrolled: ${withFP}/${total}\n\n💡 Tip: Baaki ${total - withFace} students ka face enroll karo!`,
    data: { total, withFace, withFP, present }
  };
}

async function anomalyCheck() {
  const anomalies = await AnomalyLog.find({ resolved: false })
    .populate('student','name class')
    .sort({ detectedAt: -1 })
    .limit(5);

  if (!anomalies.length) return {
    text: '✅ **No Anomalies Detected!**\n\nSabhi attendance patterns normal hain.\n\n💡 AI Features → Anomaly Detection pe jaao aur "Run Detection" dabao latest check ke liye!'
  };

  const sevEmoji = { high: '🔴', medium: '🟡', low: '🔵' };
  const list     = anomalies.map(a =>
    `${sevEmoji[a.severity]} **${a.student?.name || a.studentId}** — ${a.message.substring(0,60)}...`
  ).join('\n\n');

  return {
    text: `⚠️ **${anomalies.length} Active Anomalies Found!**\n\n${list}\n\n🔍 AI Features → Anomaly Detection pe details dekho!`,
    data: { count: anomalies.length }
  };
}

async function lateStudents() {
  const today   = moment().format('YYYY-MM-DD');
  const records = await Attendance.find({ date: today, status: 'late' })
    .populate('student','name studentId class');

  if (!records.length) return {
    text: `⏰ Aaj koi late nahi aaya! ${moment().format('MMM D')} pe sab time pe aaye.\n\n🎉 Great punctuality!`
  };

  const list = records.map(r =>
    `• ${r.student?.name || r.studentId} — ${r.checkInTime || 'N/A'} (${r.student?.class || ''})`
  ).join('\n');

  return {
    text: `⏰ **Late Students Today** (${records.length}):\n\n${list}`,
    data: { lateCount: records.length }
  };
}

async function attendancePercentage(query) {
  const name = extractNameFromQuery(query);

  if (name) {
    // Specific student
    const student = await Student.findOne({ name: { $regex: name, $options: 'i' }, isActive: true });
    if (!student) return { text: `❓ "${name}" naam ka koi student nahi mila.` };

    const records = await Attendance.find({
      studentId: student.studentId,
      date: { $gte: moment().subtract(30,'days').format('YYYY-MM-DD') }
    });
    const pct = records.length > 0
      ? Math.round(records.filter(r => r.status !== 'absent').length / records.length * 100)
      : 0;

    return {
      text: `📊 **${student.name} ka Attendance:**\n\n${pct >= 75 ? '✅' : '⚠️'} **${pct}%** (last 30 days)\n\nTotal days tracked: ${records.length}\nPresent/Late: ${records.filter(r=>r.status!=='absent').length}\nAbsent: ${records.filter(r=>r.status==='absent').length}\n\n${pct < 75 ? '⚠️ 75% se kam! Attendance badhao.' : '🎉 Good attendance!'}`,
      data: { student, pct }
    };
  }

  // Overall
  const total   = await Student.countDocuments({ isActive: true });
  const records = await Attendance.find({ date: { $gte: moment().subtract(30,'days').format('YYYY-MM-DD') } });
  const pct     = total > 0
    ? Math.round(records.filter(r => r.status !== 'absent').length / (total * 30) * 100)
    : 0;

  return {
    text: `📊 **Overall Attendance (Last 30 days):**\n\n${pct >= 80 ? '🟢' : pct >= 60 ? '🟡' : '🔴'} School Average: **${pct}%**\n\nTotal Records: ${records.length}\nTotal Students: ${total}`,
    data: { pct, total }
  };
}

async function studentHistory(query) {
  const name = extractNameFromQuery(query);
  if (!name) return { text: "Kaunse student ki history chahiye?\nExample: 'Rahul ki attendance history'" };

  const student = await Student.findOne({ name: { $regex: name, $options: 'i' }, isActive: true });
  if (!student) return { text: `❓ "${name}" naam ka koi student nahi mila.` };

  const records = await Attendance.find({ studentId: student.studentId })
    .sort({ date: -1 }).limit(10);

  if (!records.length) return {
    text: `📋 ${student.name} ka koi attendance record nahi mila abhi tak.`
  };

  const total   = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const late    = records.filter(r => r.status === 'late').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const pct     = Math.round((present+late)/total*100);

  const statEmoji = { present: '✅', late: '⏰', absent: '❌' };
  const histList  = records.slice(0,7).map(r =>
    `  ${statEmoji[r.status]} ${moment(r.date).format('MMM D')} — ${r.status} (${r.method})`
  ).join('\n');

  return {
    text: `📋 **${student.name} — Attendance History**\n\n📊 Last ${total} records:\n  ✅ Present: ${present} | ⏰ Late: ${late} | ❌ Absent: ${absent}\n  📈 Rate: ${pct}%\n\n📅 Recent Records:\n${histList}`,
    data: { student, records, pct }
  };
}

async function goodbye() {
  return {
    text: `Alvida! 👋\n\nAttendance system theek se kaam kar raha hai.\nKoi bhi sawaal ho toh wapas aana! 😊\n\n🎓 AttendAI — Smart Attendance System`
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UNKNOWN QUERY — Smart suggestions
// ═══════════════════════════════════════════════════════════════════════════

function unknownResponse(query) {
  return {
    text: `🤔 Samajh nahi aaya: **"${query}"**\n\nShayad aap poochh rahe hain:\n• "Today's attendance"\n• "Who was absent?"\n• "Students below 75%"\n• "Is [name] present?"\n• "This month report"\n\nType **"help"** for all commands! 😊`,
    intent: 'unknown'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

router.post('/query', protect, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query?.trim()) return res.status(400).json({ message: 'Query required' });

    const intent = parseIntent(query.trim());
    if (!intent) return res.json({ ...unknownResponse(query), query });

    const result = await intent.handler(query);
    res.json({ ...result, intent: intent.name, query });
  } catch (err) {
    console.error('NLP Error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/suggestions', protect, (req, res) => {
  res.json([
    "Aaj ki attendance kaisi hai?",
    "Who has low attendance?",
    "Is Rahul present today?",
    "Students below 75%",
    "Kaun lagatar absent hai?",
    "This month ka report",
    "Best attendance students",
    "Who came late today?",
    "Total students kitne hain?",
    "Check anomalies",
    "Class 10 attendance",
    "Yesterday ki attendance",
  ]);
});

module.exports = router;