import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { MdSearch, MdDownload, MdCalendarToday, MdPerson } from 'react-icons/md';
import API from '../utils/api';
import toast from 'react-hot-toast';

const CLASSES = ['Class 1','Class 2','Class 3','Class 4','Class 5',
  'Class 6','Class 7','Class 8','Class 9','Class 10'];

export default function Reports() {
  const [view, setView]           = useState('daily');
  const [date, setDate]           = useState(new Date().toISOString().split('T')[0]);
  const [studentId, setStudentId] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    end:   new Date().toISOString().split('T')[0]
  });
  const [dailyData,   setDailyData]   = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [classFilter, setClassFilter] = useState('');

  const fetchDaily = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (classFilter) params.class = classFilter;
      const { data } = await API.get(`/attendance/date/${date}`, { params });
      setDailyData(data);
    } catch {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  }, [date, classFilter]);

  useEffect(() => {
    if (view === 'daily') fetchDaily();
  }, [view, fetchDaily]);

  const fetchStudentReport = async () => {
    if (!studentId) return toast.error('Enter a Student ID');
    setLoading(true);
    try {
      const { data } = await API.get(`/attendance/student/${studentId}`, {
        params: { startDate: dateRange.start, endDate: dateRange.end }
      });
      setStudentData(data);
    } catch {
      toast.error('Failed to fetch student report');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!dailyData?.data?.length) return;
    const rows = [['Roll No','Student ID','Name','Class','Status','Method','Check In']];
    dailyData.data.forEach(({ student: s, attendance: a, status }) => {
      rows.push([s.rollNumber, s.studentId, s.name, `${s.class}-${s.section}`, status, a?.method || '—', a?.checkInTime || '—']);
    });
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `attendance_${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Reports</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>Attendance history and analytics</p>
      </div>

      {/* View toggle */}
      <div className="tabs" style={{ marginBottom: 24, maxWidth: 360 }}>
        <button className={`tab ${view === 'daily' ? 'active' : ''}`} onClick={() => setView('daily')}>
          <MdCalendarToday /> Daily Report
        </button>
        <button className={`tab ${view === 'student' ? 'active' : ''}`} onClick={() => setView('student')}>
          <MdPerson /> Student Report
        </button>
      </div>

      {/* ── DAILY VIEW ────────────────────────────────────────────────────── */}
      {view === 'daily' && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 180px' }}>
                <label className="label">Date</label>
                <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label className="label">Class</label>
                <select className="input" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                  <option value="">All Classes</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={exportCSV} className="btn btn-ghost" disabled={!dailyData?.data?.length}>
                <MdDownload /> Export CSV
              </button>
            </div>
          </div>

          {dailyData && (
            <>
              {/* Summary cards */}
              <div className="grid-4" style={{ marginBottom: 20 }}>
                {[
                  { label: 'Total',   value: dailyData.data.length,                                        color: '#3b82f6' },
                  { label: 'Present', value: dailyData.data.filter(d => d.status === 'present').length,    color: '#10b981' },
                  { label: 'Late',    value: dailyData.data.filter(d => d.status === 'late').length,       color: '#f59e0b' },
                  { label: 'Absent',  value: dailyData.data.filter(d => d.status === 'absent').length,     color: '#ef4444' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              {dailyData.data.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Attendance Overview</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={[
                      { name: 'Present', value: dailyData.data.filter(d => d.status === 'present').length, fill: '#10b981' },
                      { name: 'Late',    value: dailyData.data.filter(d => d.status === 'late').length,    fill: '#f59e0b' },
                      { name: 'Absent',  value: dailyData.data.filter(d => d.status === 'absent').length,  fill: '#ef4444' },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1a2235', border: '1px solid #1e293b', borderRadius: 8 }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <span className="spinner" style={{ width: 32, height: 32 }} />
                  </div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Roll #</th>
                        <th>Student</th>
                        <th>ID</th>
                        <th>Class</th>
                        <th>Status</th>
                        <th>Method</th>
                        <th>Check In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.data.map(({ student: s, attendance: a, status }) => (
                        <tr key={s._id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{s.rollNumber}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                                {s.name[0]}
                              </div>
                              <span style={{ fontWeight: 600 }}>{s.name}</span>
                            </div>
                          </td>
                          <td><span className="mono" style={{ fontSize: 12 }}>{s.studentId}</span></td>
                          <td style={{ fontSize: 13 }}>{s.class} – {s.section}</td>
                          <td><span className={`badge badge-${status}`} style={{ textTransform: 'capitalize' }}>{status}</span></td>
                          <td>{a ? <span className={`badge badge-${a.method}`} style={{ textTransform: 'capitalize' }}>{a.method}</span> : '—'}</td>
                          <td style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>{a?.checkInTime || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ── STUDENT VIEW ──────────────────────────────────────────────────── */}
      {view === 'student' && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 160px' }}>
                <label className="label">Student ID</label>
                <div style={{ position: 'relative' }}>
                  <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
                  <input className="input" placeholder="STU001" style={{ paddingLeft: 34 }}
                    value={studentId} onChange={e => setStudentId(e.target.value)} />
                </div>
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label className="label">From</label>
                <input type="date" className="input" value={dateRange.start}
                  onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label className="label">To</label>
                <input type="date" className="input" value={dateRange.end}
                  onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
              </div>
              <button onClick={fetchStudentReport} className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : <MdSearch />} Generate
              </button>
            </div>
          </div>

          {studentData && (
            <>
              <div className="grid-4" style={{ marginBottom: 20 }}>
                {[
                  { label: 'Total Days',  value: studentData.stats.total,   color: '#3b82f6' },
                  { label: 'Present',     value: studentData.stats.present,  color: '#10b981' },
                  { label: 'Late',        value: studentData.stats.late,     color: '#f59e0b' },
                  { label: 'Absent',      value: studentData.stats.absent,   color: '#ef4444' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Percentage bar */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700 }}>Attendance Percentage</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: studentData.stats.percentage >= 75 ? '#10b981' : '#ef4444' }}>
                    {studentData.stats.percentage}%
                  </span>
                </div>
                <div style={{ height: 10, background: 'var(--border)', borderRadius: 5 }}>
                  <div style={{
                    height: '100%', borderRadius: 5, transition: 'width 0.8s ease',
                    width: `${studentData.stats.percentage}%`,
                    background: studentData.stats.percentage >= 75
                      ? 'linear-gradient(90deg,#10b981,#34d399)'
                      : 'linear-gradient(90deg,#ef4444,#f87171)'
                  }} />
                </div>
                {studentData.stats.percentage < 75 && (
                  <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>⚠ Below 75% attendance threshold</p>
                )}
              </div>

              {/* History table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Method</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentData.records.map(r => (
                      <tr key={r._id}>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{r.date}</td>
                        <td><span className={`badge badge-${r.status}`} style={{ textTransform: 'capitalize' }}>{r.status}</span></td>
                        <td><span className={`badge badge-${r.method}`} style={{ textTransform: 'capitalize' }}>{r.method}</span></td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{r.checkInTime  || '—'}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{r.checkOutTime || '—'}</td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}