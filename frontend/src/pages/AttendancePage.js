import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MdFace, MdFingerprint, MdEditNote } from 'react-icons/md';
import FaceAttendance        from '../components/FaceAttendance';
import FingerprintAttendance from '../components/FingerprintAttendance';
import ManualAttendance      from '../components/ManualAttendance';

const tabs = [
  { key: 'face',        label: 'Face Recognition', icon: MdFace,        color: '#8b5cf6' },
  { key: 'fingerprint', label: 'Fingerprint',       icon: MdFingerprint, color: '#3b82f6' },
  { key: 'manual',      label: 'Manual Form',       icon: MdEditNote,    color: '#10b981' },
];

export default function AttendancePage() {
  const [searchParams]  = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'face');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setActiveTab(t);
  }, [searchParams]);

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Mark Attendance</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
          Choose your preferred method to mark attendance
        </p>
      </div>

      {/* Method selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {tabs.map(({ key, label, icon: Icon, color }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            flex: 1, padding: '16px 20px', borderRadius: 14,
            cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            background:   activeTab === key ? `${color}18` : 'var(--bg-card)',
            border:       `2px solid ${activeTab === key ? color : 'var(--border)'}`,
            color:        activeTab === key ? color : 'var(--text-secondary)',
            transform:    activeTab === key ? 'translateY(-2px)' : 'none',
            boxShadow:    activeTab === key ? `0 8px 24px ${color}22` : 'none',
            transition:   'all 0.2s ease',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: activeTab === key ? `${color}20` : 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon style={{ fontSize: 26, color: activeTab === key ? color : 'var(--text-muted)' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div>
        {activeTab === 'face'        && <FaceAttendance />}
        {activeTab === 'fingerprint' && <FingerprintAttendance />}
        {activeTab === 'manual'      && <ManualAttendance />}
      </div>
    </div>
  );
}