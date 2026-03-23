import React, { useState, useEffect, useCallback } from 'react';
import { MdSearch, MdCheckCircle, MdCancel, MdAccessTime, MdSave, MdInfo, MdPeople, MdCalendarToday } from 'react-icons/md';
import API from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present ✅', color: '#10b981', icon: MdCheckCircle },
  { value: 'late',    label: 'Late ⏰',    color: '#f59e0b', icon: MdAccessTime  },
  { value: 'absent',  label: 'Absent ❌',  color: '#ef4444', icon: MdCancel      },
];

const CLASSES = [
  'Class 1','Class 2','Class 3','Class 4','Class 5',
  'Class 6','Class 7','Class 8','Class 9','Class 10',
  'Class 11','Class 12'
];

export default function ManualAttendance() {
  const [students,   setStudents]   = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [filters,    setFilters]    = useState({ class: '', section: '', search: '' });
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);

  // ── Fetch students ──────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setSaved(false);
    try {
      const params = {};
      if (filters.class)   params.class   = filters.class;
      if (filters.section) params.section = filters.section;
      if (filters.search)  params.search  = filters.search;

      const { data } = await API.get('/students', { params });
      setStudents(data);

      // Default sab "present" karo
      const init = {};
      data.forEach(s => { init[s.studentId] = { status: 'present', notes: '' }; });
      setAttendance(init);
    } catch {
      toast.error('Students load nahi hue / Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // ── Set single student status ───────────────────────────────────────────────
  const setStatus = (studentId, status) => {
    setSaved(false);
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  };

  // ── Mark all students ───────────────────────────────────────────────────────
  const markAll = (status) => {
    const updated = {};
    students.forEach(s => { updated[s.studentId] = { status, notes: attendance[s.studentId]?.notes || '' }; });
    setAttendance(updated);
    toast.success(`Sabhi ${students.length} students ${status} mark ho gaye!`);
  };

  // ── Submit attendance ───────────────────────────────────────────────────────
  const submitAttendance = async () => {
    if (!students.length) {
      toast.error('Koi student nahi mila! Pehle students add karo / No students found!');
      return;
    }

    setSaving(true);
    try {
      const attendanceData = students.map(s => ({
        studentId: s.studentId,
        status:    attendance[s.studentId]?.status || 'absent',
        notes:     attendance[s.studentId]?.notes  || ''
      }));

      await API.post('/attendance/bulk', { attendanceData, date });

      setSaved(true);
      toast.success(
        `🎉 Attendance save ho gayi!\n✅ Present: ${presentCount} | ⏰ Late: ${lateCount} | ❌ Absent: ${absentCount}`,
        { duration: 4000 }
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save nahi hua / Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Counts ──────────────────────────────────────────────────────────────────
  const presentCount = Object.values(attendance).filter(a => a.status === 'present').length;
  const lateCount    = Object.values(attendance).filter(a => a.status === 'late').length;
  const absentCount  = Object.values(attendance).filter(a => a.status === 'absent').length;
  const totalCount   = students.length;

  return (
    <div>

      {/* ── HOW TO USE GUIDE ─────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 20,
        display: 'flex', gap: 12
      }}>
        <MdInfo style={{ color: '#3b82f6', fontSize: 22, flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: '#3b82f6', lineHeight: 2 }}>
          <strong>Manual Attendance Kaise Lagayein / How to mark attendance:</strong><br />
          <span style={{ color: 'var(--text-muted)' }}>
            1️⃣ <strong>Date select karo</strong> — aaj ki date already selected hai<br />
            2️⃣ <strong>Class/Section filter karo</strong> (optional) — specific class ke students dikhane ke liye<br />
            3️⃣ <strong>Har student ke liye status select karo</strong> — ✅ Present | ⏰ Late | ❌ Absent<br />
            4️⃣ <strong>"Save Attendance" button dabao</strong> — database mein save ho jayega ✅<br />
            💡 <strong>Tip:</strong> "Mark All Present" se ek click mein sabko present karo, phir absent walo ko individually change karo
          </span>
        </div>
      </div>

      {/* ── FILTERS ─────────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Date */}
          <div style={{ flex: '1 1 160px' }}>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MdCalendarToday style={{ fontSize: 13 }} /> Date / तारीख
            </label>
            <input type="date" className="input" value={date}
              onChange={e => { setDate(e.target.value); setSaved(false); }} />
          </div>

          {/* Class */}
          <div style={{ flex: '1 1 160px' }}>
            <label className="label">Class / कक्षा</label>
            <select className="input" value={filters.class}
              onChange={e => setFilters({ ...filters, class: e.target.value })}>
              <option value="">All Classes / सभी</option>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Section */}
          <div style={{ flex: '1 1 100px' }}>
            <label className="label">Section</label>
            <select className="input" value={filters.section}
              onChange={e => setFilters({ ...filters, section: e.target.value })}>
              <option value="">All</option>
              {['A','B','C','D','E'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Search */}
          <div style={{ flex: '2 1 200px' }}>
            <label className="label">Search / खोजें</label>
            <div style={{ position: 'relative' }}>
              <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
              <input className="input" placeholder="Naam ya ID se search karo..."
                style={{ paddingLeft: 34 }} value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      {/* ── SUMMARY + ACTIONS BAR ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>

        {/* Counts */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>{presentCount}</span>
            <span style={{ fontSize: 11, color: '#10b981' }}>Present</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>{lateCount}</span>
            <span style={{ fontSize: 11, color: '#f59e0b' }}>Late</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>{absentCount}</span>
            <span style={{ fontSize: 11, color: '#ef4444' }}>Absent</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <MdPeople style={{ color: 'var(--text-muted)', fontSize: 14 }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{totalCount}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total</span>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Mark All buttons */}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Sabko Mark Karo:</span>
        {STATUS_OPTIONS.map(({ value, label, color }) => (
          <button key={value} onClick={() => markAll(value)}
            style={{
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
              background: `${color}12`, border: `1px solid ${color}44`,
              color, fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 12,
              transition: 'all 0.15s'
            }}>
            {label}
          </button>
        ))}

        {/* Save Button */}
        <button
          onClick={submitAttendance}
          disabled={saving || !students.length}
          style={{
            padding: '9px 20px', borderRadius: 10, cursor: 'pointer',
            background: saved ? '#10b981' : 'var(--accent)',
            color: 'white', border: 'none',
            fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: !students.length ? 0.5 : 1,
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            transition: 'all 0.2s'
          }}>
          {saving ? (
            <><span className="spinner" style={{ borderTopColor: 'white' }} /> Saving...</>
          ) : saved ? (
            <><MdCheckCircle style={{ fontSize: 18 }} /> Saved! ✅</>
          ) : (
            <><MdSave style={{ fontSize: 18 }} /> Save Attendance / सेव करें</>
          )}
        </button>
      </div>

      {/* ── STUDENTS TABLE ───────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
            <span className="spinner" style={{ width: 36, height: 36 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Students load ho rahe hain...</p>
          </div>

        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <MdPeople style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Koi student nahi mila / No students found
            </p>
            <p style={{ fontSize: 13 }}>
              Students page pe jao aur pehle students add karo.<br />
              Ya Class/Section filter change karo.
            </p>
          </div>

        ) : (
          <>
            {/* Table header guide */}
            <div style={{
              padding: '10px 16px', background: 'rgba(16,185,129,0.06)',
              borderBottom: '1px solid var(--border)', fontSize: 12,
              color: '#10b981', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <MdCheckCircle style={{ fontSize: 14 }} />
              <span>
                <strong>{totalCount} students load hue.</strong> Har student ka status select karo phir "Save Attendance" dabao.
                Default: sabko <strong>Present</strong> mark kiya gaya hai.
              </span>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Class</th>
                  <th style={{ textAlign: 'center' }}>
                    Status — Click to change / क्लिक करके बदलें
                  </th>
                  <th>Notes (Optional)</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const current = attendance[student.studentId] || { status: 'present', notes: '' };
                  const rowBg   =
                    current.status === 'present' ? 'rgba(16,185,129,0.03)' :
                    current.status === 'late'    ? 'rgba(245,158,11,0.03)' :
                    'rgba(239,68,68,0.03)';
                  const leftBorder =
                    current.status === 'present' ? '3px solid #10b981' :
                    current.status === 'late'    ? '3px solid #f59e0b' :
                    '3px solid #ef4444';

                  return (
                    <tr key={student._id} style={{ background: rowBg, borderLeft: leftBorder }}>

                      {/* Roll number */}
                      <td style={{ color: 'var(--text-muted)', fontSize: 13, width: 40 }}>
                        {student.rollNumber}
                      </td>

                      {/* Student name + photo */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {/* Photo */}
                          {student.photo ? (
                            <img
                              src={
                                student.photo.startsWith('data:') ? student.photo :
                                student.photo.startsWith('http')  ? student.photo :
                                `http://localhost:5000${student.photo}`
                              }
                              alt={student.name}
                              onError={e => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }}
                            />
                          ) : null}
                          {/* Avatar fallback */}
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
                            display: student.photo ? 'none' : 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 800, color: 'white'
                          }}>
                            {student.name[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                            {student.name}
                          </span>
                        </div>
                      </td>

                      {/* Student ID */}
                      <td>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--accent)' }}>
                          {student.studentId}
                        </span>
                      </td>

                      {/* Class */}
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {student.class} – {student.section}
                      </td>

                      {/* STATUS BUTTONS — main action */}
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {STATUS_OPTIONS.map(({ value, label, color, icon: Icon }) => {
                            const isSelected = current.status === value;
                            return (
                              <button
                                key={value}
                                onClick={() => setStatus(student.studentId, value)}
                                title={label}
                                style={{
                                  padding: '6px 14px', borderRadius: 8,
                                  cursor: 'pointer', fontFamily: 'Sora,sans-serif',
                                  fontWeight: isSelected ? 700 : 500,
                                  fontSize: 12,
                                  background: isSelected ? `${color}20` : 'var(--bg-secondary)',
                                  color:      isSelected ? color         : 'var(--text-muted)',
                                  border:     isSelected ? `2px solid ${color}` : '2px solid transparent',
                                  outline:    'none',
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  transition: 'all 0.15s',
                                  transform:  isSelected ? 'scale(1.05)' : 'scale(1)',
                                  boxShadow:  isSelected ? `0 2px 8px ${color}33` : 'none',
                                }}>
                                <Icon style={{ fontSize: 15 }} />
                                {value === 'present' ? 'Present' : value === 'late' ? 'Late' : 'Absent'}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Notes */}
                      <td>
                        <input
                          className="input"
                          placeholder="Note likhо (optional)..."
                          value={current.notes}
                          onChange={e => setAttendance(prev => ({
                            ...prev,
                            [student.studentId]: { ...prev[student.studentId], notes: e.target.value }
                          }))}
                          style={{ padding: '6px 10px', fontSize: 12, minWidth: 160 }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Bottom save bar */}
            <div style={{
              padding: '14px 20px', background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                📅 Date: <strong style={{ color: 'var(--text-primary)' }}>{date}</strong> &nbsp;|&nbsp;
                👥 Total: <strong style={{ color: 'var(--text-primary)' }}>{totalCount}</strong> students
              </span>
              <button
                onClick={submitAttendance}
                disabled={saving || !students.length}
                style={{
                  padding: '10px 28px', borderRadius: 10, cursor: 'pointer',
                  background: saved ? '#10b981' : 'var(--accent)',
                  color: 'white', border: 'none',
                  fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
                  transition: 'all 0.2s'
                }}>
                {saving ? (
                  <><span className="spinner" style={{ borderTopColor: 'white' }} /> Saving...</>
                ) : saved ? (
                  <><MdCheckCircle style={{ fontSize: 18 }} /> Saved! ✅</>
                ) : (
                  <><MdSave style={{ fontSize: 18 }} /> Save Attendance / सेव करें</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}