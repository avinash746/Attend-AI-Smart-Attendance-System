import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import API from '../utils/api';
import { MdPeople, MdCheckCircle, MdCancel, MdAccessTime, MdFace, MdFingerprint, MdEditNote } from 'react-icons/md';

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{
      width: 52, height: 52, borderRadius: 14, flexShrink: 0,
      background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <Icon style={{ fontSize: 26, color }} />
    </div>
    <div>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/dashboard/stats').then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}><span className="spinner" style={{ width: 36, height: 36 }} /></div>;
  if (!stats) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 80 }}>Failed to load dashboard. Please check your connection.</div>;

  const pieData = [
    { name: 'Present', value: stats.today.present, color: '#10b981' },
    { name: 'Late', value: stats.today.late, color: '#f59e0b' },
    { name: 'Absent', value: stats.today.absent, color: '#ef4444' },
  ];
  const methodData = [
    { name: 'Face', value: stats.today.byMethod.face, color: '#8b5cf6', icon: MdFace },
    { name: 'Fingerprint', value: stats.today.byMethod.fingerprint, color: '#3b82f6', icon: MdFingerprint },
    { name: 'Manual', value: stats.today.byMethod.manual, color: '#94a3b8', icon: MdEditNote },
  ];

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>Today's attendance overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard icon={MdPeople} label="Total Students" value={stats.today.total} color="#3b82f6" />
        <StatCard icon={MdCheckCircle} label="Present" value={stats.today.present} color="#10b981"
          sub={`${stats.today.total ? Math.round(stats.today.present / stats.today.total * 100) : 0}%`} />
        <StatCard icon={MdAccessTime} label="Late" value={stats.today.late} color="#f59e0b" />
        <StatCard icon={MdCancel} label="Absent" value={stats.today.absent} color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Weekly Chart */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Weekly Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.weeklyData} barSize={8}>
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1a2235', border: '1px solid #1e293b', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} name="Present" />
              <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late" />
              <Bar dataKey="absent" fill="#ef444430" radius={[4, 4, 0, 0]} name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Today's Distribution</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <PieChart width={140} height={140}>
              <Pie data={pieData} cx={65} cy={65} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
            <div style={{ flex: 1 }}>
              {pieData.map(item => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{item.name}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Method breakdown & Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Attendance by Method</h3>
          {methodData.map(({ name, value, color, icon: Icon }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ color, fontSize: 18 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{value}</span>
                </div>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                  <div style={{ height: '100%', background: color, borderRadius: 2, width: `${stats.today.total ? Math.round(value / stats.today.total * 100) : 0}%`, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Mark Attendance (Face/Fingerprint)', color: 'var(--accent)', path: '/attendance' },
              { label: 'Manual Attendance Form', color: 'var(--accent-green)', path: '/attendance?tab=manual' },
              { label: 'Add New Student', color: 'var(--accent-purple)', path: '/students' },
              { label: 'View Reports', color: 'var(--accent-yellow)', path: '/reports' },
            ].map(({ label, color, path }) => (
              <button key={label} onClick={() => navigate(path)} style={{
                padding: '12px 16px', background: `${color}12`, border: `1px solid ${color}30`,
                borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                color, fontWeight: 600, fontSize: 13, fontFamily: 'Sora,sans-serif',
                transition: 'all 0.15s'
              }}
                onMouseOver={e => e.currentTarget.style.background = `${color}22`}
                onMouseOut={e => e.currentTarget.style.background = `${color}12`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}