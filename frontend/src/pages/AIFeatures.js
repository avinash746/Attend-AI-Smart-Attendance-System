import React, { useState } from 'react';
import {
  MdAutoAwesome, MdWarning, MdTrendingUp,
  MdSecurity, MdPsychology, MdChat
} from 'react-icons/md';
import AnomalyDetection      from '../components/AnomalyDetection';
import AttendancePrediction  from '../components/AttendancePrediction';
import MaskLivenessDetection from '../components/MaskLivenessDetection';
import EmotionTracking       from '../components/EmotionTracking';
import NLPQueryBot           from '../components/NLPQueryBot';

const AI_TABS = [
  { key: 'anomaly',    label: 'Anomaly Detection',     icon: MdWarning,    color: '#f59e0b', desc: 'Pattern analysis' },
  { key: 'prediction', label: 'Attendance Prediction', icon: MdTrendingUp, color: '#3b82f6', desc: 'LSTM-style forecast' },
  { key: 'liveness',   label: 'Mask & Liveness',       icon: MdSecurity,   color: '#10b981', desc: 'Anti-spoofing' },
  { key: 'emotion',    label: 'Emotion Tracking',      icon: MdPsychology, color: '#8b5cf6', desc: 'Engagement analytics' },
  { key: 'nlp',        label: 'NLP Query Bot',         icon: MdChat,       color: '#ec4899', desc: 'Ask in English' },
];

export default function AIFeatures() {
  const [activeTab, setActiveTab] = useState('anomaly');

  return (
    <div className="animate-in">
      {/* Page header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <MdAutoAwesome style={{ color: 'white', fontSize: 26 }} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>AI Features</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 2 }}>
            6 AI/ML modules powering smart attendance insights
          </p>
        </div>
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {AI_TABS.map(({ key, label, icon: Icon, color, desc }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            flex: '1 1 160px', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
            fontFamily: 'Sora,sans-serif', textAlign: 'left',
            background: activeTab === key ? `${color}15` : 'var(--bg-card)',
            border: `2px solid ${activeTab === key ? color : 'var(--border)'}`,
            transform: activeTab === key ? 'translateY(-2px)' : 'none',
            boxShadow: activeTab === key ? `0 8px 24px ${color}20` : 'none',
            transition: 'all 0.2s ease'
          }}>
            <Icon style={{
              fontSize: 22, display: 'block', marginBottom: 8,
              color: activeTab === key ? color : 'var(--text-muted)'
            }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: activeTab === key ? color : 'var(--text-primary)' }}>
              {label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
          </button>
        ))}
      </div>

      {/* Active content */}
      <div className="card" style={{ minHeight: 400 }}>
        {activeTab === 'anomaly'    && <AnomalyDetection />}
        {activeTab === 'prediction' && <AttendancePrediction />}
        {activeTab === 'liveness'   && <MaskLivenessDetection />}
        {activeTab === 'emotion'    && <EmotionTracking />}
        {activeTab === 'nlp'        && <NLPQueryBot />}
      </div>
    </div>
  );
}