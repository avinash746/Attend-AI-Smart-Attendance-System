import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { MdFace, MdCheckCircle, MdCameraAlt, MdUploadFile, MdRefresh, MdInfo } from 'react-icons/md';

const MODELS_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

// ── Photo URL helper ──────────────────────────────────────────────────────────
function getPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith('data:')) return photo;
  if (photo.startsWith('http'))  return photo;
  return `http://localhost:5000${photo}`;
}

export default function FaceAttendance() {
  const webcamRef   = useRef(null);
  const canvasRef   = useRef(null);
  const intervalRef = useRef(null);
  const fileInputRef = useRef(null);

  const [modelsLoaded,       setModelsLoaded]       = useState(false);
  const [scanning,           setScanning]           = useState(false);
  const [status,             setStatus]             = useState('idle');
  const [recognizedStudent,  setRecognizedStudent]  = useState(null);
  const [labeledDescriptors, setLabeledDescriptors] = useState([]);
  const [allStudents,        setAllStudents]        = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [loadProgress,       setLoadProgress]       = useState('');
  const [scanMode,           setScanMode]           = useState('camera'); // camera | photo
  const [uploadedPhoto,      setUploadedPhoto]      = useState(null);
  const [photoScanning,      setPhotoScanning]      = useState(false);

  // ── Load models + descriptors ─────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setLoadProgress('Model 1/3 load ho raha hai...');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        setLoadProgress('Model 2/3 load ho raha hai...');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
        setLoadProgress('Model 3/3 load ho raha hai...');
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
        setModelsLoaded(true);
        setLoadProgress('Students ka data load ho raha hai...');
        await loadDescriptors();
      } catch (err) {
        console.error('Init error:', err);
        toast.error('Models load nahi hue — internet check karo');
        setStatus('error');
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // ── Load enrolled face descriptors ────────────────────────────────────────
  const loadDescriptors = async () => {
    try {
      const { data } = await API.get('/students/face/all-descriptors');
      setAllStudents(data);
      if (!data.length) { setStatus('no_faces'); return; }

      const valid = data.filter(s => s.faceDescriptor && s.faceDescriptor.length > 0);
      if (!valid.length) { setStatus('no_faces'); return; }

      const labeled = valid.map(s => new faceapi.LabeledFaceDescriptors(
        JSON.stringify({ id: s._id, studentId: s.studentId, name: s.name, photo: s.photo }),
        [new Float32Array(s.faceDescriptor)]
      ));
      setLabeledDescriptors(labeled);
      setStatus('idle');
    } catch (err) {
      console.error('Descriptors load error:', err);
    }
  };

  // ── CAMERA SCAN — start ───────────────────────────────────────────────────
  const startScanning = useCallback(async () => {
    if (!modelsLoaded || !labeledDescriptors.length) {
      toast.error('Pehle students ka face enroll karo! Students page → Face icon click karo.');
      return;
    }
    setScanning(true);
    setStatus('scanning');
    setRecognizedStudent(null);

    const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.55);

    intervalRef.current = setInterval(async () => {
      if (!webcamRef.current?.video) return;
      const video = webcamRef.current.video;
      if (video.readyState !== 4) return;

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width  = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          for (const det of detections) {
            const result    = matcher.findBestMatch(det.descriptor);
            const box       = det.detection.box;
            const isUnknown = result.label === 'unknown';
            const color     = isUnknown ? '#ef4444' : '#10b981';

            ctx.strokeStyle = color;
            ctx.lineWidth   = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            const label = isUnknown ? '❓ Unknown' : `✅ ${JSON.parse(result.label).name}`;
            ctx.fillStyle = color;
            ctx.fillRect(box.x, box.y - 28, box.width, 28);
            ctx.fillStyle = 'white';
            ctx.font      = 'bold 13px sans-serif';
            ctx.fillText(label, box.x + 8, box.y - 8);

            if (!isUnknown) {
              const info = JSON.parse(result.label);
              clearInterval(intervalRef.current);
              setScanning(false);
              setStatus('recognized');
              const confidence = Math.round((1 - result.distance) * 100);
              setRecognizedStudent({ ...info, confidence });
              await markAttendance(info.studentId, confidence);
            }
          }
        }
      } catch (err) {
        console.error('Scan error:', err);
      }
    }, 500);
  }, [modelsLoaded, labeledDescriptors]);

  const stopScanning = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setScanning(false);
    setStatus('idle');
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, 9999, 9999);
  }, []);

  // ── PHOTO UPLOAD — scan uploaded photo ───────────────────────────────────
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedPhoto(ev.target.result);
      setStatus('idle');
      setRecognizedStudent(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const scanUploadedPhoto = useCallback(async () => {
    if (!modelsLoaded) {
      toast.error('Models abhi load ho rahe hain, thoda wait karo...');
      return;
    }
    if (!uploadedPhoto) {
      toast.error('Pehle photo upload karo!');
      return;
    }
    if (!labeledDescriptors.length) {
      toast.error('Koi enrolled face nahi mila! Students page pe face enroll karo pehle.');
      return;
    }

    setPhotoScanning(true);
    setStatus('idle');
    setRecognizedStudent(null);

    try {
      // Step 1: Image load karo
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload  = resolve;
        img.onerror = reject;
        img.src     = uploadedPhoto;
      });

      // Step 2: Canvas pe draw karo (better detection)
      const canvas  = document.createElement('canvas');
      const maxSize = 640;
      let w = img.naturalWidth  || img.width  || 640;
      let h = img.naturalHeight || img.height || 480;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else       { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      // Step 3: Face detect karo — multiple threshold attempts
      let detection = null;
      for (const threshold of [0.3, 0.2, 0.15]) {
        detection = await faceapi
          .detectSingleFace(
            canvas,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: threshold })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (detection) break;
      }

      if (!detection) {
        toast.error(
          '❌ Photo mein face detect nahi hua!\n\nTips:\n• Face clearly visible hona chahiye\n• Achhi roshni wali photo use karo\n• Mask ya glasses nahi hone chahiye\n• Face seedha hona chahiye',
          { duration: 5000 }
        );
        setPhotoScanning(false);
        return;
      }

      // Step 4: Match with enrolled faces
      const matcher    = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
      const result     = matcher.findBestMatch(detection.descriptor);
      const confidence = Math.round((1 - result.distance) * 100);

      if (result.label === 'unknown' || confidence < 40) {
        toast.error(
          '❌ Koi match nahi mila!\n\nPossible reasons:\n• Is student ka face enrolled nahi hai\n• Photo quality achhi nahi hai\n• Students page pe pehle face enroll karo',
          { duration: 5000 }
        );
        setPhotoScanning(false);
        return;
      }

      // Step 5: Attendance mark karo
      const info = JSON.parse(result.label);
      setRecognizedStudent({ ...info, confidence });
      setStatus('recognized');
      await markAttendance(info.studentId, confidence);

    } catch (err) {
      console.error('Photo scan error:', err);
      toast.error('Photo scan mein error: ' + err.message);
    } finally {
      setPhotoScanning(false);
    }
  }, [uploadedPhoto, modelsLoaded, labeledDescriptors]);

  // ── Mark attendance ───────────────────────────────────────────────────────
  const markAttendance = async (studentId, confidence) => {
    try {
      const { data } = await API.post('/attendance/mark', { studentId, method: 'face', confidence });
      toast.success(`✅ ${data.student.name} — Attendance mark ho gayi!\nConfidence: ${confidence}%`, { duration: 4000 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Attendance mark nahi hui');
    }
  };

  const resetScan = () => {
    setStatus('idle');
    setRecognizedStudent(null);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, 9999, 9999);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <MdFace style={{ fontSize: 26, color: '#8b5cf6' }} />
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Face Recognition Attendance</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Camera se scan karo ya photo upload karo
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <span className="spinner" style={{ width: 36, height: 36, margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>AI Models Load Ho Rahe Hain...</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>{loadProgress}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Pehli baar thoda time lagega (internet se download)</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ── Mode Selector ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button
              onClick={() => { setScanMode('camera'); setUploadedPhoto(null); resetScan(); }}
              style={{
                flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 13,
                background: scanMode === 'camera' ? 'rgba(139,92,246,0.15)' : 'var(--bg-secondary)',
                border: `2px solid ${scanMode === 'camera' ? '#8b5cf6' : 'var(--border)'}`,
                color: scanMode === 'camera' ? '#8b5cf6' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s'
              }}>
              <MdCameraAlt style={{ fontSize: 20 }} />
              Camera se Scan Karo
            </button>
            <button
              onClick={() => { setScanMode('photo'); stopScanning(); resetScan(); }}
              style={{
                flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 13,
                background: scanMode === 'photo' ? 'rgba(59,130,246,0.15)' : 'var(--bg-secondary)',
                border: `2px solid ${scanMode === 'photo' ? '#3b82f6' : 'var(--border)'}`,
                color: scanMode === 'photo' ? '#3b82f6' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s'
              }}>
              <MdUploadFile style={{ fontSize: 20 }} />
              Photo Upload Karke
            </button>
          </div>

          {/* ── Enrolled students count ────────────────────────────────────── */}
          {labeledDescriptors.length > 0 && (
            <div style={{
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 10, padding: '8px 14px', marginBottom: 16,
              fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <MdCheckCircle style={{ fontSize: 16 }} />
              {labeledDescriptors.length} students enrolled hain — face recognition ready! ✅
              <button onClick={loadDescriptors} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', marginLeft: 'auto' }}>
                <MdRefresh style={{ fontSize: 16 }} />
              </button>
            </div>
          )}

          {/* ── No faces warning ───────────────────────────────────────────── */}
          {labeledDescriptors.length === 0 && (
            <div style={{
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 10, padding: '12px 14px', marginBottom: 16,
              display: 'flex', gap: 10
            }}>
              <MdInfo style={{ color: '#f59e0b', fontSize: 18, flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: '#f59e0b' }}>
                <strong>Koi enrolled face nahi mila!</strong><br />
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Students page pe jao → student ke face icon pe click karo → camera se scan karo → save karo
                </span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MODE 1 — CAMERA
          ══════════════════════════════════════════════════════════════════ */}
          {scanMode === 'camera' && (
            <div>
              <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', marginBottom: 16, maxWidth: 560, margin: '0 auto 16px' }}>
                <Webcam
                  ref={webcamRef} audio={false}
                  screenshotFormat="image/jpeg"
                  style={{ width: '100%', display: 'block' }}
                  videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
                />
                <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                {scanning && (
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {[
                      { top: '10%', left: '20%',  borderWidth: '3px 0 0 3px' },
                      { top: '10%', right: '20%', borderWidth: '3px 3px 0 0' },
                      { bottom: '10%', left: '20%',  borderWidth: '0 0 3px 3px' },
                      { bottom: '10%', right: '20%', borderWidth: '0 3px 3px 0' },
                    ].map((s, i) => (
                      <div key={i} style={{ position: 'absolute', width: 32, height: 32, borderColor: '#8b5cf6', borderStyle: 'solid', ...s }} />
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', maxWidth: 560, margin: '0 auto' }}>
                {!scanning && status !== 'recognized' && (
                  <button className="btn btn-primary" onClick={startScanning}
                    disabled={!modelsLoaded || labeledDescriptors.length === 0}
                    style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>
                    <MdCameraAlt style={{ fontSize: 20 }} /> Start Face Scan
                  </button>
                )}
                {scanning && (
                  <button className="btn btn-danger" onClick={stopScanning}
                    style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>
                    ⏹ Scan Band Karo / Stop
                  </button>
                )}
                {status === 'recognized' && (
                  <button className="btn btn-primary" onClick={resetScan}
                    style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>
                    <MdCameraAlt /> Agla Student Scan Karo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MODE 2 — PHOTO UPLOAD
          ══════════════════════════════════════════════════════════════════ */}
          {scanMode === 'photo' && (
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              {/* Upload area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${uploadedPhoto ? '#3b82f6' : 'var(--border)'}`,
                  borderRadius: 14, padding: '30px 20px',
                  textAlign: 'center', cursor: 'pointer',
                  background: uploadedPhoto ? 'rgba(59,130,246,0.05)' : 'var(--bg-secondary)',
                  marginBottom: 16, transition: 'all 0.2s'
                }}>
                {uploadedPhoto ? (
                  <div>
                    <img src={uploadedPhoto} alt="uploaded"
                      style={{ maxHeight: 280, maxWidth: '100%', borderRadius: 10, objectFit: 'contain', marginBottom: 10 }} />
                    <p style={{ fontSize: 13, color: '#3b82f6', fontWeight: 600 }}>
                      ✅ Photo upload ho gayi — ab "Scan" dabao
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Alag photo choose karne ke liye yahan click karo
                    </p>
                  </div>
                ) : (
                  <div>
                    <MdUploadFile style={{ fontSize: 48, color: 'var(--text-muted)', marginBottom: 12 }} />
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Photo Upload Karo / Upload Photo
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Student ki photo yahan click karke upload karo
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      JPG, PNG supported • Face clearly visible hona chahiye
                    </p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*"
                  style={{ display: 'none' }} onChange={handlePhotoUpload} />
              </div>

              {/* How it works info */}
              <div style={{
                background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8
              }}>
                <MdInfo style={{ color: '#3b82f6', fontSize: 14, verticalAlign: 'middle', marginRight: 4 }} />
                <strong style={{ color: '#3b82f6' }}>Photo Upload se Attendance kaise hoti hai:</strong><br />
                1️⃣ Student ki photo upload karo<br />
                2️⃣ "Photo se Attendance Mark Karo" button dabao<br />
                3️⃣ AI photo mein face dhundega aur enrolled students se match karega<br />
                4️⃣ Match milne pe attendance automatically mark ho jayegi ✅<br />
                <span style={{ color: '#f59e0b' }}>⚠️ Student ka face pehle se enrolled hona chahiye (Students page pe)</span>
              </div>

              {/* Scan button */}
              <button
                onClick={scanUploadedPhoto}
                disabled={!uploadedPhoto || photoScanning || !modelsLoaded || labeledDescriptors.length === 0}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}>
                {photoScanning ? (
                  <><span className="spinner" style={{ borderTopColor: 'white' }} /> Photo Scan Ho Rahi Hai...</>
                ) : (
                  <><MdFace style={{ fontSize: 20 }} /> Photo se Attendance Mark Karo</>
                )}
              </button>
            </div>
          )}

          {/* ── SUCCESS STATE ─────────────────────────────────────────────── */}
          {status === 'recognized' && recognizedStudent && (
            <div style={{
              background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.4)',
              borderRadius: 14, padding: '18px 20px',
              marginTop: 16, maxWidth: 560, margin: '16px auto 0',
              display: 'flex', alignItems: 'center', gap: 14
            }}>
              {/* Student photo */}
              {recognizedStudent.photo ? (
                <img src={getPhotoUrl(recognizedStudent.photo)} alt=""
                  style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '3px solid #10b981', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#10b981,#3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 800, color: 'white'
                }}>
                  {recognizedStudent.name?.[0]?.toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#10b981' }}>
                  ✅ {recognizedStudent.name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  ID: {recognizedStudent.studentId} &nbsp;•&nbsp;
                  Confidence: <strong style={{ color: recognizedStudent.confidence > 80 ? '#10b981' : '#f59e0b' }}>
                    {recognizedStudent.confidence}%
                  </strong>
                </div>
                <div style={{ fontSize: 13, color: '#10b981', marginTop: 4, fontWeight: 600 }}>
                  🎉 Attendance mark ho gayi! / Attendance marked successfully!
                </div>
              </div>
              <MdCheckCircle style={{ color: '#10b981', fontSize: 40, flexShrink: 0 }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}