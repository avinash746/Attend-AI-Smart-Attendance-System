import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { MdWarning, MdPlayArrow, MdStop } from 'react-icons/md';
import toast from 'react-hot-toast';

// CDN se models load honge
const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const EMOTION_META = {
  happy:     { emoji: '😊', color: '#10b981', label: 'Happy'     },
  sad:       { emoji: '😢', color: '#3b82f6', label: 'Sad'       },
  angry:     { emoji: '😠', color: '#ef4444', label: 'Angry'     },
  surprised: { emoji: '😲', color: '#f59e0b', label: 'Surprised' },
  fearful:   { emoji: '😨', color: '#8b5cf6', label: 'Fearful'   },
  disgusted: { emoji: '🤢', color: '#84cc16', label: 'Disgusted' },
  neutral:   { emoji: '😐', color: '#94a3b8', label: 'Neutral'   },
};

function getEngagementScore(expressions) {
  const { happy = 0, surprised = 0, neutral = 0, sad = 0, angry = 0 } = expressions;
  return Math.round(Math.min(100,
    happy * 100 + surprised * 40 - neutral * 20 - sad * 30 - angry * 40 + 50
  ));
}

export default function EmotionTracking() {
  const webcamRef   = useRef(null);
  const canvasRef   = useRef(null);
  const intervalRef = useRef(null);

  const [loadingModels, setLoadingModels] = useState(true);
  const [modelError,    setModelError]    = useState(false);
  const [loadProgress,  setLoadProgress]  = useState('');
  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [running,       setRunning]       = useState(false);
  const [current,       setCurrent]       = useState(null);
  const [history,       setHistory]       = useState([]);
  const [sessionLog,    setSessionLog]    = useState([]);

  // Load models from CDN
  useEffect(() => {
    const load = async () => {
      try {
        setLoadProgress('Model 1/3 load ho raha hai...');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setLoadProgress('Model 2/3 load ho raha hai...');
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        setLoadProgress('Model 3/3 load ho raha hai...');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        setLoadProgress('Ready!');
      } catch (err) {
        console.error('Model load error:', err);
        setModelError(true);
      } finally {
        setLoadingModels(false);
      }
    };
    load();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const analyze = useCallback(async () => {
    if (!webcamRef.current?.video || !canvasRef.current) return;
    const video = webcamRef.current.video;
    if (video.readyState !== 4) return;

    try {
      const det = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!det) { setCurrent(null); return; }

      const expr     = det.expressions;
      const dominant = Object.entries(expr).sort((a, b) => b[1] - a[1])[0];
      const engagement = getEngagementScore(expr);

      const frame = { ...expr, dominant: dominant[0], dominantScore: Math.round(dominant[1] * 100), engagement, ts: Date.now() };
      setCurrent(frame);

      setHistory(prev => {
        const next = [...prev.slice(-29), frame];
        if (next.length === 30) {
          const avg = {};
          Object.keys(EMOTION_META).forEach(k => {
            avg[k] = Math.round(next.reduce((s, f) => s + (f[k] || 0), 0) / next.length * 100);
          });
          avg.engagement = Math.round(next.reduce((s, f) => s + f.engagement, 0) / next.length);
          avg.time = new Date().toLocaleTimeString();
          setSessionLog(p => [...p.slice(-20), avg]);
        }
        return next;
      });

      // Draw on canvas
      const canvas = canvasRef.current;
      const dims   = faceapi.matchDimensions(canvas, video, true);
      faceapi.draw.drawDetections(canvas, faceapi.resizeResults(det, dims));
      faceapi.draw.drawFaceExpressions(canvas, faceapi.resizeResults(det, dims), 0.05);
    } catch (err) {
      console.error('Emotion error:', err);
    }
  }, []);

  const start = () => {
    if (!modelsLoaded) return toast.error('Models load ho rahe hain...');
    setRunning(true);
    setHistory([]);
    intervalRef.current = setInterval(analyze, 400);
  };

  const stop = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, 9999, 9999);
  };

  const avgExpressions = Object.keys(EMOTION_META).map(k => ({
    emotion: EMOTION_META[k].label,
    emoji:   EMOTION_META[k].emoji,
    value:   history.length > 0
      ? Math.round(history.reduce((s, f) => s + (f[k] || 0), 0) / history.length * 100)
      : 0,
    color: EMOTION_META[k].color,
  }));

  const radarData      = avgExpressions.map(e => ({ subject: e.emotion, value: e.value }));
  const engagementAvg  = history.length > 0
    ? Math.round(history.reduce((s, f) => s + f.engagement, 0) / history.length)
    : 0;
  const engagementColor = engagementAvg >= 70 ? '#10b981' : engagementAvg >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Emotion Tracking</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Real-time facial expression analysis for engagement analytics
        </p>
      </div>

      {/* Model loading */}
      {loadingModels && (
        <div style={{
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 10, padding: 14, marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span className="spinner" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', margin: 0 }}>
              AI Models Load Ho Rahe Hain...
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {loadProgress} — Pehli baar thoda time lagega (internet se download)
            </p>
          </div>
        </div>
      )}

      {/* Model error */}
      {modelError && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: 14, marginBottom: 20,
          display: 'flex', gap: 12
        }}>
          <MdWarning style={{ color: '#ef4444', fontSize: 22, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', margin: 0 }}>
              Models load nahi hue — Internet check karo
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 8px' }}>
              GitHub se models download hote hain — internet connection chahiye
            </p>
            <button onClick={() => window.location.reload()}
              className="btn btn-danger" style={{ padding: '6px 14px', fontSize: 12 }}>
              Page Reload Karo
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      {!loadingModels && !modelError && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

            {/* Camera */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ position: 'relative', background: '#000' }}>
                <Webcam
                  ref={webcamRef} audio={false}
                  style={{ width: '100%', display: 'block' }}
                  videoConstraints={{ width: 480, height: 360, facingMode: 'user' }}
                />
                <canvas ref={canvasRef} style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'
                }} />
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={running ? stop : start}
                  disabled={!modelsLoaded}
                  className={`btn ${running ? 'btn-danger' : 'btn-primary'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {running ? <><MdStop /> Stop</> : <><MdPlayArrow /> Start Analysis</>}
                </button>
                {current && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 22 }}>
                      {EMOTION_META[current.dominant]?.emoji || '😶'}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: EMOTION_META[current.dominant]?.color }}>
                        {current.dominant}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {current.dominantScore}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Radar chart */}
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Expression Radar</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Averaged over last {history.length} frames
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Radar name="Expression" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Engagement + Bar chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, marginBottom: 20 }}>

            {/* Engagement score */}
            <div className="card" style={{
              textAlign: 'center', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
                ENGAGEMENT SCORE
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, color: engagementColor }}>{engagementAvg}</div>
              <div style={{ fontSize: 12, color: engagementColor, marginTop: 4 }}>
                {engagementAvg >= 70 ? '🌟 High Engaged'
                  : engagementAvg >= 40 ? '👀 Moderate'
                  : '😴 Low'}
              </div>
              <div style={{
                width: '80%', height: 6, background: 'var(--border)',
                borderRadius: 3, marginTop: 12
              }}>
                <div style={{
                  height: '100%', width: `${engagementAvg}%`,
                  background: engagementColor, borderRadius: 3, transition: 'width 0.4s'
                }} />
              </div>
            </div>

            {/* Bar chart */}
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Expression Breakdown</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={avgExpressions} layout="vertical" barSize={14}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="emoji" tick={{ fontSize: 16 }}
                    axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    formatter={v => [`${v}%`, 'Score']}
                    contentStyle={{ background: '#1a2235', border: '1px solid #1e293b', borderRadius: 8 }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {avgExpressions.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Session timeline */}
          {sessionLog.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Session Engagement Timeline</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {sessionLog.map((log, i) => {
                  const c = log.engagement >= 70 ? '#10b981' : log.engagement >= 40 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={i} title={`${log.time}: ${log.engagement}%`} style={{ textAlign: 'center', width: 48 }}>
                      <div style={{ height: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <div style={{
                          width: 20, background: c, borderRadius: '3px 3px 0 0',
                          height: `${Math.max(4, log.engagement)}%`, transition: 'height 0.3s'
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        {log.time?.split(':').slice(0, 2).join(':')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}