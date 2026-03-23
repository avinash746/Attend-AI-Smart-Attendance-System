import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { MdClose, MdFace, MdCheckCircle, MdCameraAlt, MdWarning } from 'react-icons/md';
import API from '../utils/api';
import toast from 'react-hot-toast';

// CDN se models load karo — local /models folder ki zaroorat nahi
const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

export default function FaceEnrollModal({ student, onClose, onEnrolled }) {
  const webcamRef  = useRef(null);
  const canvasRef  = useRef(null);
  const intervalRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modelError,   setModelError]   = useState(false);
  const [detecting,    setDetecting]    = useState(false);
  const [detected,     setDetected]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [descriptor,   setDescriptor]   = useState(null);
  const [capturedImg,  setCapturedImg]  = useState(null);
  const [videoReady,   setVideoReady]   = useState(false);
  const [loadProgress, setLoadProgress] = useState('Models load ho rahe hain...');

  // ── Load models from CDN ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingModels(true);
      setModelError(false);
      try {
        setLoadProgress('TinyFaceDetector load ho raha hai...');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

        setLoadProgress('FaceLandmark model load ho raha hai...');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

        setLoadProgress('FaceRecognition model load ho raha hai...');
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

        setLoadProgress('Sabhi models ready! ✅');
        setModelsLoaded(true);
      } catch (err) {
        console.error('Model load error:', err);
        setModelError(true);
        setLoadProgress('Models load nahi hue. Internet check karo.');
      } finally {
        setLoadingModels(false);
      }
    };
    load();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Video ready check ────────────────────────────────────────────────────
  const handleVideoReady = useCallback(() => {
    setVideoReady(true);
  }, []);

  // ── Detect face ──────────────────────────────────────────────────────────
  const detectFace = useCallback(async () => {
    if (!modelsLoaded) {
      toast.error('Models abhi load ho rahe hain, thoda wait karo / Models still loading...');
      return;
    }

    if (!webcamRef.current) {
      toast.error('Camera ready nahi hai / Camera not ready');
      return;
    }

    const video = webcamRef.current.video;
    if (!video || video.readyState < 2) {
      toast.error('Camera start ho rahi hai, 2 second baad try karo / Camera starting, try after 2 seconds');
      return;
    }

    setDetecting(true);

    try {
      // Multiple attempts
      let detection = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        detection = await faceapi
          .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 416,
              scoreThreshold: 0.3  // Lower threshold = easier detection
            })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) break;

        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (!detection) {
        toast.error(
          'Face nahi dikha! / Face not detected!\n' +
          '• Zyada roshni mein baitho / Sit in brighter light\n' +
          '• Camera ke seedha saamne raho / Face camera directly\n' +
          '• Thoda paas aao / Move closer to camera'
        );
        setDetecting(false);
        return;
      }

      // Draw green box on canvas
      const canvas = canvasRef.current;
      if (canvas && video) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        const dims    = faceapi.matchDimensions(canvas, video, true);
        const resized = faceapi.resizeResults(detection, dims);
        const ctx     = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Green bounding box
        const box = resized.detection.box;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth   = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Label background
        ctx.fillStyle = '#10b981';
        ctx.fillRect(box.x, box.y - 30, box.width, 30);
        ctx.fillStyle = 'white';
        ctx.font      = 'bold 14px sans-serif';
        ctx.fillText(`✓ ${student.name}`, box.x + 8, box.y - 10);
      }

      // Capture screenshot
      const screenshot = webcamRef.current.getScreenshot({
        width: 400, height: 300
      });

      const desc = Array.from(detection.descriptor);
      setDescriptor(desc);
      setCapturedImg(screenshot);
      setDetected(true);
      toast.success(`✅ Face detect ho gaya! Ab "Save" dabao / Face detected! Click Save now`);

    } catch (err) {
      console.error('Detection error:', err);
      toast.error('Detection mein error: ' + err.message);
    } finally {
      setDetecting(false);
    }
  }, [modelsLoaded, student.name]);

  // ── Save to database ─────────────────────────────────────────────────────
  const saveFace = async () => {
    if (!descriptor) return toast.error('Pehle face detect karo / Detect face first');
    setSaving(true);
    try {
      await API.post(`/students/${student._id}/face-descriptor`, {
        descriptor,
        photo: capturedImg
      });
      toast.success(`✅ ${student.name} ka face enroll ho gaya! / Face enrolled!`);
      onEnrolled();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save fail hua / Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Retake ───────────────────────────────────────────────────────────────
  const retake = () => {
    setDetected(false);
    setDescriptor(null);
    setCapturedImg(null);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <MdFace style={{ color: 'white', fontSize: 24 }} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Face Enroll Karo / Enroll Face</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {student.name} — {student.studentId}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 24, padding: 4
          }}>
            <MdClose />
          </button>
        </div>

        {/* Model loading progress */}
        {loadingModels && (
          <div style={{
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 10, padding: 14, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <span className="spinner" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6' }}>
                AI Models Load Ho Rahe Hain / Loading AI Models...
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {loadProgress}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Pehli baar thoda time lagega (internet se download hoga) / First time may take a moment
              </p>
            </div>
          </div>
        )}

        {/* Model error */}
        {modelError && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: 14, marginBottom: 16,
            display: 'flex', gap: 12
          }}>
            <MdWarning style={{ color: '#ef4444', fontSize: 20, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>
                Models load nahi hue / Models failed to load
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Internet connection check karo aur page reload karo / Check internet and reload page
              </p>
              <button onClick={() => window.location.reload()} className="btn btn-danger"
                style={{ marginTop: 8, padding: '6px 14px', fontSize: 12 }}>
                Page Reload Karo / Reload
              </button>
            </div>
          </div>
        )}

        {/* Models loaded — show camera */}
        {!loadingModels && !modelError && (
          <>
            {/* Instructions */}
            <div style={{
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 10, padding: 12, marginBottom: 16,
              fontSize: 13, color: '#8b5cf6', lineHeight: 1.8
            }}>
              1️⃣ Camera ke seedha saamne baitho / Sit directly in front of camera<br />
              2️⃣ Achhi roshni mein raho / Make sure you have good lighting<br />
              3️⃣ <strong>"Detect Face"</strong> button dabao / Click Detect Face button<br />
              4️⃣ Green box aane ke baad <strong>"Save"</strong> dabao / Click Save after green box appears
            </div>

            {/* Camera / Captured image */}
            <div style={{
              position: 'relative', borderRadius: 12,
              overflow: 'hidden', background: '#000', marginBottom: 16,
              minHeight: 300
            }}>
              {!detected ? (
                <>
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={0.8}
                    onUserMedia={handleVideoReady}
                    onUserMediaError={() => toast.error('Camera access nahi mila / Camera access denied')}
                    style={{ width: '100%', display: 'block' }}
                    videoConstraints={{
                      facingMode: 'user',
                      width:  { ideal: 640 },
                      height: { ideal: 480 }
                    }}
                  />
                  <canvas ref={canvasRef} style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: '100%'
                  }} />

                  {/* Scan corner decorations */}
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {[
                      { top: '15%',    left: '20%',  borderWidth: '3px 0 0 3px' },
                      { top: '15%',    right: '20%', borderWidth: '3px 3px 0 0' },
                      { bottom: '15%', left: '20%',  borderWidth: '0 0 3px 3px' },
                      { bottom: '15%', right: '20%', borderWidth: '0 3px 3px 0' },
                    ].map((s, i) => (
                      <div key={i} style={{
                        position: 'absolute', width: 32, height: 32,
                        borderColor: '#8b5cf6', borderStyle: 'solid', ...s
                      }} />
                    ))}
                  </div>

                  {/* Video not ready overlay */}
                  {!videoReady && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'column', gap: 12
                    }}>
                      <span className="spinner" style={{ width: 32, height: 32 }} />
                      <p style={{ color: 'white', fontSize: 14 }}>
                        Camera start ho rahi hai... / Starting camera...
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* Captured image */
                <div style={{ position: 'relative' }}>
                  {capturedImg && (
                    <img src={capturedImg} alt="Captured face"
                      style={{ width: '100%', display: 'block' }} />
                  )}
                  <div style={{
                    position: 'absolute', top: 12, left: 12,
                    background: 'rgba(16,185,129,0.92)', borderRadius: 8,
                    padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <MdCheckCircle style={{ color: 'white', fontSize: 18 }} />
                    <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>
                      Face Detect Ho Gaya! ✓ / Face Detected!
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Model status badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 14, padding: '8px 12px',
              background: 'rgba(16,185,129,0.08)', borderRadius: 8,
              border: '1px solid rgba(16,185,129,0.2)'
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#10b981' }}>
                AI Models Ready ✅ — {videoReady ? 'Camera Ready ✅' : 'Camera Starting...'}
              </span>
            </div>

            {/* Action Buttons */}
            {!detected ? (
              <button
                onClick={detectFace}
                disabled={detecting || !modelsLoaded || !videoReady}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
              >
                {detecting ? (
                  <><span className="spinner" /> Detecting... Thoda wait karo / Please wait...</>
                ) : !videoReady ? (
                  <><span className="spinner" /> Camera ready ho rahi hai... / Camera starting...</>
                ) : (
                  <><MdCameraAlt style={{ fontSize: 20 }} /> Detect Face / Face Detect Karo</>
                )}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={retake} className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
                  Dobara Scan Karo / Retake
                </button>
                <button onClick={saveFace} disabled={saving} className="btn btn-success"
                  style={{ flex: 2, justifyContent: 'center', padding: '12px', fontSize: 15 }}>
                  {saving ? (
                    <><span className="spinner" /> Saving...</>
                  ) : (
                    <><MdCheckCircle style={{ fontSize: 20 }} /> Save Face / Face Save Karo</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}