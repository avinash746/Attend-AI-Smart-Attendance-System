import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { MdFace, MdSecurity, MdWarning, MdCheckCircle, MdPlayArrow, MdStop } from 'react-icons/md';
import toast from 'react-hot-toast';

// CDN se models load honge — no local folder needed
const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

function detectMaskFromLandmarks(landmarks) {
  const positions  = landmarks.positions;
  const mouthTop   = positions[51];
  const mouthBottom= positions[57];
  const noseTip    = positions[33];
  const mouthHeight= Math.abs(mouthBottom.y - mouthTop.y);
  const noseToMouth= Math.abs(mouthTop.y - noseTip.y);
  const ratio      = mouthHeight / (noseToMouth || 1);
  return ratio < 0.15;
}

function useLivenessChecker() {
  const frameHistory = useRef([]);
  const blinkCount   = useRef(0);
  const lastEyeOpen  = useRef(true);

  const check = (detection) => {
    if (!detection?.landmarks) return { liveness: false, reason: 'No landmarks' };
    const pos = detection.landmarks.positions;

    const leftEye  = Math.abs(pos[37].y - pos[41].y);
    const rightEye = Math.abs(pos[43].y - pos[47].y);
    const eyeOpen  = (leftEye + rightEye) / 2 > 3;

    if (lastEyeOpen.current && !eyeOpen) blinkCount.current++;
    lastEyeOpen.current = eyeOpen;

    const noseTip = pos[33];
    frameHistory.current.push({ x: noseTip.x, y: noseTip.y });
    if (frameHistory.current.length > 30) frameHistory.current.shift();

    let motion = 0;
    if (frameHistory.current.length > 5) {
      const recent = frameHistory.current.slice(-10);
      const dx = Math.max(...recent.map(p => p.x)) - Math.min(...recent.map(p => p.x));
      const dy = Math.max(...recent.map(p => p.y)) - Math.min(...recent.map(p => p.y));
      motion = dx + dy;
    }

    const isLive = blinkCount.current >= 1 || motion > 8;
    return {
      liveness: isLive,
      blinkCount: blinkCount.current,
      motion: Math.round(motion),
    };
  };

  const reset = () => {
    frameHistory.current = [];
    blinkCount.current   = 0;
  };
  return { check, reset };
}

export default function MaskLivenessDetection() {
  const webcamRef   = useRef(null);
  const canvasRef   = useRef(null);
  const intervalRef = useRef(null);

  const [loadingModels, setLoadingModels] = useState(true);
  const [modelError,    setModelError]    = useState(false);
  const [loadProgress,  setLoadProgress]  = useState('');
  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [running,       setRunning]       = useState(false);
  const [detection,     setDetection]     = useState(null);

  const liveness = useLivenessChecker();

  // Load models from CDN
  useEffect(() => {
    const load = async () => {
      try {
        setLoadProgress('Model 1/3 load ho raha hai...');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setLoadProgress('Model 2/3 load ho raha hai...');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setLoadProgress('Model 3/3 load ho raha hai...');
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
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

      if (!det) {
        setDetection({ face: false });
        return;
      }

      const maskDetected   = detectMaskFromLandmarks(det.landmarks);
      const livenessResult = liveness.check(det);
      const expressions    = det.expressions;
      const dominant       = Object.entries(expressions).sort((a, b) => b[1] - a[1])[0];

      setDetection({
        face: true,
        mask: maskDetected,
        liveness: livenessResult,
        confidence: Math.round(det.detection.score * 100),
        dominantExpression: {
          name:  dominant[0],
          score: Math.round(dominant[1] * 100)
        }
      });

      // Draw on canvas
      const canvas = canvasRef.current;
      const dims   = faceapi.matchDimensions(canvas, video, true);
      faceapi.draw.drawDetections(canvas, faceapi.resizeResults(det, dims));
      faceapi.draw.drawFaceLandmarks(canvas, faceapi.resizeResults(det, dims));
    } catch (err) {
      console.error('Analysis error:', err);
    }
  }, [liveness]);

  const startScan = () => {
    if (!modelsLoaded) return toast.error('Models load ho rahe hain, wait karo...');
    liveness.reset();
    setRunning(true);
    intervalRef.current = setInterval(analyze, 400);
  };

  const stopScan = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setDetection(null);
  };

  const EMOJI_MAP = {
    happy: '😊', sad: '😢', angry: '😠',
    surprised: '😲', fearful: '😨', disgusted: '🤢', neutral: '😐'
  };

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Mask & Liveness Detection</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Real-time mask detection + anti-spoofing liveness check
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
              {loadProgress} — Internet se download ho raha hai, thoda wait karo
            </p>
          </div>
        </div>
      )}

      {/* Model error */}
      {modelError && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: 14, marginBottom: 20,
          display: 'flex', gap: 12, alignItems: 'flex-start'
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
              Page Reload Karo / Reload Page
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      {!loadingModels && !modelError && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>

          {/* Camera */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ position: 'relative', background: '#000' }}>
              <Webcam
                ref={webcamRef} audio={false}
                style={{ width: '100%', display: 'block' }}
                videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
              />
              <canvas ref={canvasRef} style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'
              }} />
              {running && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {[
                    { top: '15%', left: '25%',  borderWidth: '3px 0 0 3px' },
                    { top: '15%', right: '25%', borderWidth: '3px 3px 0 0' },
                    { bottom: '15%', left: '25%',  borderWidth: '0 0 3px 3px' },
                    { bottom: '15%', right: '25%', borderWidth: '0 3px 3px 0' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      position: 'absolute', width: 28, height: 28,
                      borderColor: 'var(--accent)', borderStyle: 'solid', ...s
                    }} />
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 16px' }}>
              <button
                onClick={running ? stopScan : startScan}
                className={`btn ${running ? 'btn-danger' : 'btn-primary'}`}
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={!modelsLoaded}
              >
                {running ? <><MdStop /> Stop Scan</> : <><MdPlayArrow /> Start Scan</>}
              </button>
            </div>
          </div>

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Face */}
            <div className="card">
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>FACE DETECTION</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MdFace style={{ fontSize: 24, color: detection?.face ? '#10b981' : 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {detection?.face ? '✅ Face Detected' : '— No Face'}
                  </div>
                  {detection?.confidence && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Confidence: {detection.confidence}%
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mask */}
            <div className="card" style={{
              borderLeft: `3px solid ${detection?.face
                ? (detection?.mask ? '#ef4444' : '#10b981')
                : 'var(--border)'}`
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>MASK DETECTION</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {detection?.mask
                  ? <MdWarning style={{ fontSize: 24, color: '#ef4444' }} />
                  : <MdCheckCircle style={{ fontSize: 24, color: '#10b981' }} />
                }
                <div>
                  <div style={{
                    fontWeight: 700,
                    color: !detection?.face ? 'var(--text-muted)' : detection?.mask ? '#ef4444' : '#10b981'
                  }}>
                    {!detection?.face ? '—' : detection?.mask ? '😷 Mask Detected' : '✅ No Mask'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Landmark geometry analysis</div>
                </div>
              </div>
            </div>

            {/* Liveness */}
            <div className="card" style={{
              borderLeft: `3px solid ${detection?.liveness?.liveness ? '#10b981' : '#ef4444'}`
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>LIVENESS CHECK</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MdSecurity style={{
                  fontSize: 24,
                  color: detection?.liveness?.liveness ? '#10b981' : '#ef4444'
                }} />
                <div>
                  <div style={{
                    fontWeight: 700,
                    color: !detection?.face ? 'var(--text-muted)' : detection?.liveness?.liveness ? '#10b981' : '#ef4444'
                  }}>
                    {!detection?.face ? '—'
                      : detection?.liveness?.liveness ? '✅ Live Person'
                      : '⚠ Blink ya move karo'}
                  </div>
                  {detection?.liveness && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Blinks: {detection.liveness.blinkCount} | Motion: {detection.liveness.motion}px
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Expression */}
            {detection?.dominantExpression && (
              <div className="card">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>EXPRESSION</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>
                    {EMOJI_MAP[detection.dominantExpression.name] || '😶'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                      {detection.dominantExpression.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {detection.dominantExpression.score}% confidence
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="card" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, marginBottom: 6 }}>LIVENESS TIPS</div>
              <ul style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 16, lineHeight: 2, margin: 0 }}>
                <li>Ek baar blink karo / Blink naturally</li>
                <li>Thoda move karo / Move head slightly</li>
                <li>Achhi roshni mein raho / Good lighting</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}