import React, { useState, useEffect, useCallback } from 'react';
import {
  MdWarning, MdCheckCircle, MdRefresh, MdTrendingDown,
  MdAccessTime, MdCalendarToday, MdDeleteSweep, MdInfo
} from 'react-icons/md';
import API from '../utils/api';
import toast from 'react-hot-toast';

const SEVERITY_STYLES = {
  high:   { bg: 'rgba(239,68,68,0.08)',  border: '#ef4444', color: '#ef4444', label: '🔴 High'   },
  medium: { bg: 'rgba(245,158,11,0.08)', border: '#f59e0b', color: '#f59e0b', label: '🟡 Medium' },
  low:    { bg: 'rgba(59,130,246,0.08)', border: '#3b82f6', color: '#3b82f6', label: '🔵 Low'    },
};

const TYPE_META = {
  consecutive_absence: { icon: MdCalendarToday, label: 'Consecutive Absence' },
  late_pattern:        { icon: MdAccessTime,    label: 'Late Pattern'        },
  irregular_checkin:   { icon: MdAccessTime,    label: 'Irregular Check-in'  },
  sudden_drop:         { icon: MdTrendingDown,  label: 'Sudden Drop'         },
  weekend_checkin:     { icon: MdCalendarToday, label: 'Weekend Check-in'    },
};

export default function AnomalyDetection() {
  const [anomalies,    setAnomalies]    = useState([]);
  const [stats,        setStats]        = useState({ total: 0, high: 0, medium: 0, low: 0, resolved: 0 });
  const [loading,      setLoading]      = useState(true);
  const [running,      setRunning]      = useState(false);
  const [filter,       setFilter]       = useState('all');
  const [showResolved, setShowResolved] = useState(false);
  const [runResult,    setRunResult]    = useState(null);

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    try {
      const params = { resolved: showResolved };
      if (filter !== 'all') params.severity = filter;
      const [anomRes, statsRes] = await Promise.all([
        API.get('/anomaly', { params }),
        API.get('/anomaly/stats')
      ]);
      setAnomalies(anomRes.data);
      setStats(statsRes.data);
    } catch (err) {
      toast.error('Failed to load anomalies');
    } finally {
      setLoading(false);
    }
  }, [filter, showResolved]);

  useEffect(() => { fetchAnomalies(); }, [fetchAnomalies]);

  const runDetection = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const { data } = await API.post('/anomaly/run', { days: 30 });
      setRunResult(data);
      toast.success(data.message);
      fetchAnomalies();
    } catch (err) {
      toast.error('Detection failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setRunning(false);
    }
  };

  const resolveAnomaly = async (id) => {
    try {
      await API.patch(`/anomaly/${id}/resolve`);
      setAnomalies(prev => prev.filter(a => a._id !== id));
      setStats(prev => ({ ...prev, total: prev.total - 1, resolved: prev.resolved + 1 }));
      toast.success('Anomaly resolved ✅');
    } catch {
      toast.error('Failed to resolve');
    }
  };

  const clearResolved = async () => {
    if (!window.confirm('Sabhi resolved anomalies delete karein?')) return;
    try {
      await API.delete('/anomaly/resolved/all');
      toast.success('Cleared!');
      fetchAnomalies();
    } catch { toast.error('Delete failed'); }
  };

  const filteredAnomalies = anomalies.filter(a => {
    if (filter === 'all') return true;
    return a.severity === filter;
  });

  return (
    <div className="animate-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>⚠️ Anomaly Detection</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            AI-powered attendance pattern analysis — 5 detection rules
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {stats.resolved > 0 && (
            <button onClick={clearResolved} className="btn btn-ghost"
              style={{ fontSize: 12, padding: '8px 12px', color: '#ef4444' }}>
              <MdDeleteSweep /> Clear Resolved ({stats.resolved})
            </button>
          )}
          <button onClick={runDetection} disabled={running} className="btn btn-primary">
            {running ? <><span className="spinner" /> Scanning...</> : <><MdRefresh /> Run Detection</>}
          </button>
        </div>
      </div>

      {/* Run result banner */}
      {runResult && (
        <div style={{
          background: runResult.total > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${runResult.total > 0 ? '#f59e0b' : '#10b981'}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13
        }}>
          {runResult.total > 0
            ? <MdWarning style={{ color: '#f59e0b', fontSize: 20, flexShrink: 0 }} />
            : <MdCheckCircle style={{ color: '#10b981', fontSize: 20, flexShrink: 0 }} />
          }
          <span style={{ color: runResult.total > 0 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
            {runResult.message}
          </span>
        </div>
      )}

      {/* Info banner — when no data */}
      {!loading && anomalies.length === 0 && stats.total === 0 && (
        <div style={{
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 16,
          display: 'flex', gap: 12
        }}>
          <MdInfo style={{ color: '#3b82f6', fontSize: 20, flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: '#3b82f6' }}>
            <strong>Anomalies detect karne ke liye:</strong><br />
            <span style={{ color: 'var(--text-muted)', lineHeight: 2 }}>
              1. Pehle students add karo (Students page)<br />
              2. Attendance mark karo (Attendance page) — kuch din ka data chahiye<br />
              3. Yahan "Run Detection" dabao — AI automatically patterns dhundega<br />
              <strong>Note:</strong> Agar students ka koi attendance record nahi hai — woh bhi flag honge!
            </span>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'all',    label: 'Total',    count: stats.total,    color: '#94a3b8' },
          { key: 'high',   label: '🔴 High',  count: stats.high,     color: '#ef4444' },
          { key: 'medium', label: '🟡 Medium',count: stats.medium,   color: '#f59e0b' },
          { key: 'low',    label: '🔵 Low',   count: stats.low,      color: '#3b82f6' },
        ].map(({ key, label, count, color }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '10px 18px', borderRadius: 20, cursor: 'pointer',
            background: filter === key ? `${color}20` : 'var(--bg-secondary)',
            border: `2px solid ${filter === key ? color : 'var(--border)'}`,
            color: filter === key ? color : 'var(--text-muted)',
            fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
          }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{count}</span>
            <span>{label}</span>
          </button>
        ))}

        <label style={{
          display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto',
          cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)'
        }}>
          <input type="checkbox" checked={showResolved}
            onChange={e => setShowResolved(e.target.checked)} />
          Show Resolved
        </label>
      </div>

      {/* Anomaly list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : filteredAnomalies.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <MdCheckCircle style={{ fontSize: 52, color: '#10b981', marginBottom: 12 }} />
          <p style={{ fontWeight: 700, fontSize: 17 }}>
            {filter === 'all' ? 'No anomalies detected!' : `No ${filter} severity anomalies`}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8, maxWidth: 360, margin: '8px auto 0' }}>
            {filter === 'all'
              ? 'Sab normal lag raha hai. "Run Detection" dabao latest check ke liye.'
              : 'Filter change karo ya "All" select karo.'}
          </p>
          <button onClick={runDetection} disabled={running} className="btn btn-primary"
            style={{ marginTop: 20 }}>
            <MdRefresh /> Run Detection Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredAnomalies.map(a => {
            const sev  = SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.low;
            const meta = TYPE_META[a.type] || { icon: MdWarning, label: a.type };
            const Icon = meta.icon;
            const timeAgo = a.detectedAt
              ? (() => {
                  const diff = Date.now() - new Date(a.detectedAt).getTime();
                  const mins  = Math.floor(diff / 60000);
                  const hours = Math.floor(mins / 60);
                  const days  = Math.floor(hours / 24);
                  if (days > 0)  return `${days}d ago`;
                  if (hours > 0) return `${hours}h ago`;
                  return `${mins}m ago`;
                })()
              : '';

            return (
              <div key={a._id} style={{
                background: sev.bg,
                border: `1px solid ${sev.border}33`,
                borderLeft: `4px solid ${sev.border}`,
                borderRadius: 12, padding: '16px 20px',
                animation: 'fadeIn 0.3s ease',
                opacity: a.resolved ? 0.6 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

                  {/* Student avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${sev.color}88, ${sev.color})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, color: 'white'
                  }}>
                    {a.student?.name?.[0]?.toUpperCase() || '?'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                        {a.student?.name || a.studentId}
                      </span>
                      <span style={{
                        fontSize: 11, padding: '2px 10px', borderRadius: 12,
                        background: `${sev.color}22`, color: sev.color, fontWeight: 700
                      }}>
                        {sev.label}
                      </span>
                      <span style={{
                        fontSize: 11, padding: '2px 10px', borderRadius: 12,
                        background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <Icon style={{ fontSize: 12 }} /> {meta.label}
                      </span>
                      {a.resolved && (
                        <span style={{
                          fontSize: 11, padding: '2px 10px', borderRadius: 12,
                          background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600
                        }}>
                          ✓ Resolved
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.5 }}>
                      {a.message}
                    </p>

                    {/* Details row */}
                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      {a.student?.class && (
                        <span>📚 {a.student.class}{a.student.section ? `-${a.student.section}` : ''}</span>
                      )}
                      <span>🆔 {a.studentId}</span>
                      {a.data?.streak > 0 && <span>🔴 Streak: {a.data.streak} days</span>}
                      {a.data?.latePct   && <span>⏰ Late: {a.data.latePct}%</span>}
                      {a.data?.drop      && <span>📉 Drop: {a.data.drop}%</span>}
                      {a.data?.overallPct && <span>📊 Overall: {a.data.overallPct}%</span>}
                      {timeAgo && <span style={{ marginLeft: 'auto' }}>🕐 {timeAgo}</span>}
                    </div>
                  </div>

                  {/* Resolve button */}
                  {!a.resolved && (
                    <button onClick={() => resolveAnomaly(a._id)}
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      <MdCheckCircle /> Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}