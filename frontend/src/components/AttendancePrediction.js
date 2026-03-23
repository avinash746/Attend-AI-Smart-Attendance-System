import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { MdSearch, MdTrendingUp, MdPeople } from 'react-icons/md';
import API from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLOR = {
  likely_present: '#10b981',
  uncertain:      '#f59e0b',
  likely_absent:  '#ef4444',
};

function PredictionCard({ p }) {
  const color = STATUS_COLOR[p.status];
  const label = {
    likely_present: 'Likely Present',
    uncertain:      'Uncertain',
    likely_absent:  'Likely Absent'
  }[p.status];
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12,
      border: `1px solid ${color}33`, background: `${color}0d`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.dayLabel}</div>
        <div style={{ fontSize: 12, color, marginTop: 2 }}>{label}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color }}>{p.probability}%</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>confidence: {p.confidence}%</div>
      </div>
    </div>
  );
}

export default function AttendancePrediction() {
  const [studentId,   setStudentId]   = useState('');
  const [result,      setResult]      = useState(null);
  const [classRisk,   setClassRisk]   = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [classLoading,setClassLoading]= useState(false);
  const [view,        setView]        = useState('student');

  const predictStudent = async () => {
    if (!studentId.trim()) return toast.error('Enter a Student ID');
    setLoading(true);
    try {
      const { data } = await API.get(`/prediction/student/${studentId}`, { params: { days: 7 } });
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const loadClassRisk = async () => {
    setClassLoading(true);
    try {
      const { data } = await API.get('/prediction/class-risk');
      setClassRisk(data);
    } catch {
      toast.error('Failed to load class risk');
    } finally {
      setClassLoading(false);
    }
  };

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Attendance Prediction</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Exponential smoothing + trend analysis predicts future attendance
        </p>
      </div>

      {/* Tab */}
      <div className="tabs" style={{ marginBottom: 24, maxWidth: 360 }}>
        <button className={`tab ${view === 'student' ? 'active' : ''}`} onClick={() => setView('student')}>
          <MdSearch /> Student
        </button>
        <button className={`tab ${view === 'class' ? 'active' : ''}`}
          onClick={() => { setView('class'); if (!classRisk) loadClassRisk(); }}>
          <MdPeople /> Class Risk
        </button>
      </div>

      {view === 'student' && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <input className="input" placeholder="Enter Student ID (e.g. STU001)"
                value={studentId} onChange={e => setStudentId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && predictStudent()}
                style={{ flex: 1 }} />
              <button onClick={predictStudent} disabled={loading} className="btn btn-primary">
                {loading ? <span className="spinner" /> : <MdTrendingUp />} Predict
              </button>
            </div>
          </div>

          {result && (
            <>
              <div className="grid-3" style={{ marginBottom: 20 }}>
                {[
                  { label: 'Total Days Tracked', value: result.historicalStats.totalDays,    color: '#3b82f6' },
                  { label: 'Days Present',        value: result.historicalStats.presentDays,  color: '#10b981' },
                  { label: 'Avg Attendance',      value: `${result.historicalStats.avgAttendance}%`,
                    color: result.historicalStats.avgAttendance >= 75 ? '#10b981' : '#ef4444' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>

              {result.predictions?.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                    Next {result.predictions.length} Days — Predicted Probability
                  </h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={result.predictions} barSize={28}>
                      <XAxis dataKey="dayLabel" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={v => [`${v}%`, 'Probability']} contentStyle={{ background: '#1a2235', border: '1px solid #1e293b', borderRadius: 8 }} />
                      <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '75%', fill: '#f59e0b', fontSize: 11 }} />
                      <Bar dataKey="probability" radius={[6, 6, 0, 0]}>
                        {result.predictions.map((p, i) => (
                          <Cell key={i} fill={STATUS_COLOR[p.status]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
                {result.predictions?.map((p, i) => <PredictionCard key={i} p={p} />)}
              </div>

              <div className="card" style={{ padding: '12px 16px' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  🤖 Model: {result.modelInfo?.type} | Window: last {result.modelInfo?.windowDays} days
                </p>
              </div>
            </>
          )}
        </>
      )}

      {view === 'class' && (
        <>
          {classLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : classRisk ? (
            <>
              <div className="grid-2" style={{ marginBottom: 20 }}>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6' }}>{classRisk.summary.total}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Students</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444' }}>{classRisk.summary.atRisk}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>At Risk</div>
                </div>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Current %</th>
                      <th>Next 5 Days</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classRisk.students.slice(0, 20).map(({ student: s, predictions, currentAttendancePct }) => {
                      const hasRisk = predictions?.some(p => p.status === 'likely_absent');
                      return (
                        <tr key={s._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                                {s.name[0]}
                              </div>
                              <span style={{ fontWeight: 600 }}>{s.name}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: 13 }}>{s.class}-{s.section}</td>
                          <td>
                            <span style={{ color: currentAttendancePct >= 75 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                              {currentAttendancePct}%
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {(predictions || []).slice(0, 5).map((p, i) => (
                                <div key={i} title={`${p.dayLabel}: ${p.probability}%`} style={{
                                  width: 20, height: 20, borderRadius: 4,
                                  background: STATUS_COLOR[p.status], opacity: 0.8
                                }} />
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${hasRisk ? 'badge-absent' : 'badge-present'}`}>
                              {hasRisk ? '⚠ At Risk' : '✓ OK'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <button onClick={loadClassRisk} className="btn btn-primary">Load Class Risk Analysis</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}