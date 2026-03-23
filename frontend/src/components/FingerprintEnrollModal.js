import React, { useState } from 'react';
import { MdClose, MdFingerprint, MdCheckCircle, MdWarning, MdInfo } from 'react-icons/md';
import API from '../utils/api';
import toast from 'react-hot-toast';

function bufferToBase64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function isWebAuthnSupported() {
  return !!(
    window.PublicKeyCredential &&
    navigator.credentials?.create &&
    (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
  );
}

export default function FingerprintEnrollModal({ student, onClose, onEnrolled }) {
  const [enrolling, setEnrolling] = useState(false);

  const [step,      setStep]      = useState('ready'); // ready | scanning | success | error
  const [errorMsg,  setErrorMsg]  = useState('');
  const supported = isWebAuthnSupported();

  const enrollFingerprint = async () => {
    setStep('scanning');
    setEnrolling(true);
    setErrorMsg('');

    // Demo mode — HTTPS nahi hai
    if (!supported) {
      try {
        await new Promise(r => setTimeout(r, 2000));
        const demoId = `demo_${Date.now()}`;
        await API.post(`/students/${student._id}/fingerprint`, { credentialId: demoId });
        setStep('success');
        
        toast.success(`✅ ${student.name} ka fingerprint enroll ho gaya! (Demo Mode)`);
        setTimeout(() => { onEnrolled(); onClose(); }, 1500);
      } catch (err) {
        setStep('error');
        setErrorMsg(err.response?.data?.message || 'Enrollment fail hua');
        toast.error('Enrollment fail hua');
      } finally {
        setEnrolling(false);
      }
      return;
    }

    // Real WebAuthn
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new TextEncoder().encode(student.studentId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'AttendAI School System' },
          user: {
            id:          userId,
            name:        student.email || student.studentId,
            displayName: student.name,
          },
          pubKeyCredParams: [
            { alg: -7,   type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification:        'required',
            residentKey:             'preferred',
          },
          timeout:     60000,
          attestation: 'none',
        }
      });

      const credentialId = bufferToBase64url(credential.rawId);
      await API.post(`/students/${student._id}/fingerprint`, { credentialId });

      setStep('success');
      
      toast.success(`✅ ${student.name} ka fingerprint register ho gaya!`);
      setTimeout(() => { onEnrolled(); onClose(); }, 1500);
    } catch (err) {
      console.error('Fingerprint enrollment error:', err);
      setStep('error');
      if (err.name === 'NotAllowedError')
        setErrorMsg('Fingerprint scan cancel ya timeout hua / Fingerprint cancelled or timed out');
      else if (err.name === 'InvalidStateError')
        setErrorMsg('Yeh device pehle se registered hai / This device already registered');
      else if (err.name === 'NotSupportedError')
        setErrorMsg('Device biometric support nahi karta / Device does not support biometric');
      else
        setErrorMsg(`Error: ${err.message}`);
      toast.error('Fingerprint enrollment fail hua');
    } finally {
      setEnrolling(false);
    }
  };

  const removeFingerprint = async () => {
    if (!window.confirm(`${student.name} ka fingerprint remove karein?`)) return;
    try {
      await API.post(`/students/${student._id}/fingerprint`, { credentialId: null });
      toast.success('Fingerprint remove ho gaya!');
      onEnrolled();
      onClose();
    } catch {
      toast.error('Remove fail hua');
    }
  };

  const isAlreadyEnrolled = !!student.fingerprintCredentialId;

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 99999, overflowY: 'auto', padding: '20px 16px',
      }}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '28px 28px 32px',
        width: '100%', maxWidth: 480,
        margin: 'auto', position: 'relative', zIndex: 100000,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MdFingerprint style={{ color: 'white', fontSize: 24 }} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
                {isAlreadyEnrolled ? 'Fingerprint Manage Karo' : 'Fingerprint Enroll Karo'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {student.name} — {student.studentId}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 24, padding: 4, lineHeight: 1
          }}>
            <MdClose />
          </button>
        </div>

        {/* Already enrolled notice */}
        {isAlreadyEnrolled && step === 'ready' && (
          <div style={{
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 10, padding: 14, marginBottom: 20,
            display: 'flex', gap: 10, alignItems: 'flex-start'
          }}>
            <MdCheckCircle style={{ color: '#10b981', fontSize: 20, flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#10b981', margin: 0 }}>
                Fingerprint pehle se enrolled hai! ✅
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {student.fingerprintCredentialId?.startsWith('demo_')
                  ? 'Demo mode mein enrolled hai'
                  : 'Device fingerprint se attendance de sakta hai'}
              </p>
            </div>
          </div>
        )}

        {/* WebAuthn support info */}
        {!supported && (
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 10, padding: 12, marginBottom: 16,
            display: 'flex', gap: 10
          }}>
            <MdWarning style={{ color: '#f59e0b', fontSize: 18, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#f59e0b', margin: 0 }}>
              <strong>Demo Mode:</strong> Real fingerprint ke liye HTTPS ya localhost chahiye.
              Demo mode mein attendance bina scan ke mark hogi.
            </p>
          </div>
        )}

        {/* How it works */}
        {step === 'ready' && (
          <div style={{
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 20,
            fontSize: 13, color: '#6366f1', lineHeight: 1.9
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              <MdInfo style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }} />
              Fingerprint enrollment kaise hoti hai:
            </div>
            <div>1️⃣ Neeche button dabao</div>
            <div>2️⃣ {supported ? 'Device fingerprint/FaceID scan karega' : 'Demo mode mein auto register hoga'}</div>
            <div>3️⃣ Successful hone pe green tick dikhega ✅</div>
            <div>4️⃣ Ab student fingerprint se attendance de sakta hai</div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              🔒 Biometric data kabhi server pe nahi jaata — sirf encrypted ID store hoti hai
            </div>
          </div>
        )}

        {/* Fingerprint scanner visual */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          {/* Animated circle */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 160, height: 160, borderRadius: '50%',
              background:
                step === 'success' ? 'rgba(16,185,129,0.12)' :
                step === 'error'   ? 'rgba(239,68,68,0.12)' :
                step === 'scanning'? 'rgba(59,130,246,0.12)' :
                'var(--bg-secondary)',
              border: `3px solid ${
                step === 'success' ? '#10b981' :
                step === 'error'   ? '#ef4444' :
                step === 'scanning'? '#3b82f6' :
                isAlreadyEnrolled  ? '#10b981' :
                'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.4s ease',
              boxShadow:
                step === 'success' ? '0 0 40px rgba(16,185,129,0.3)' :
                step === 'scanning'? '0 0 40px rgba(59,130,246,0.3)' :
                'none'
            }}>
              {step === 'success' ? (
                <MdCheckCircle style={{ fontSize: 80, color: '#10b981' }} />
              ) : (
                <MdFingerprint style={{
                  fontSize: 88,
                  color:
                    step === 'scanning' ? '#3b82f6' :
                    step === 'error'    ? '#ef4444' :
                    isAlreadyEnrolled   ? '#10b981' :
                    'var(--text-muted)',
                  transition: 'color 0.3s',
                  animation: step === 'scanning' ? 'fpulse 1s ease-in-out infinite' : 'none'
                }} />
              )}
            </div>

            {/* Pulse rings when scanning */}
            {step === 'scanning' && [1, 2, 3].map(i => (
              <div key={i} style={{
                position: 'absolute', inset: -(i * 14), borderRadius: '50%',
                border: `2px solid rgba(59,130,246,${0.3 - i * 0.08})`,
                animation: `fpulse-ring ${0.8 + i * 0.3}s ease-out infinite`,
                animationDelay: `${i * 0.15}s`
              }} />
            ))}
          </div>

          {/* Status text */}
          <div style={{ textAlign: 'center' }}>
            {step === 'ready' && (
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                {isAlreadyEnrolled ? '🔄 Re-enroll karne ke liye button dabao' : '👆 Button dabao fingerprint enroll karne ke liye'}
              </p>
            )}
            {step === 'scanning' && (
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#3b82f6', margin: 0 }}>
                  {supported ? '🖐 Apni finger rakhein...' : '⏳ Processing...'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {supported ? 'Device ka fingerprint sensor use ho raha hai' : 'Demo mode — auto enrolling...'}
                </p>
              </div>
            )}
            {step === 'success' && (
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#10b981', margin: 0 }}>
                  ✅ Fingerprint enroll ho gaya!
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {student.name} ab fingerprint se attendance de sakta hai
                </p>
              </div>
            )}
            {step === 'error' && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', margin: 0 }}>
                  ❌ Enrollment fail hua
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {errorMsg}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {step !== 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={enrollFingerprint}
              disabled={enrolling}
              className="btn"
              style={{
                width: '100%', justifyContent: 'center', padding: '14px',
                fontSize: 15, fontWeight: 700,
                background: step === 'error' ? '#ef444420' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                color: step === 'error' ? '#ef4444' : 'white',
                border: step === 'error' ? '2px solid #ef4444' : 'none',
              }}
            >
              {enrolling ? (
                <><span className="spinner" style={{ borderTopColor: 'white' }} /> {supported ? 'Scanning...' : 'Enrolling...'}</>
              ) : step === 'error' ? (
                <><MdFingerprint style={{ fontSize: 20 }} /> Dobara Try Karo / Try Again</>
              ) : isAlreadyEnrolled ? (
                <><MdFingerprint style={{ fontSize: 20 }} /> Re-Enroll Karo / Re-Enroll</>
              ) : (
                <><MdFingerprint style={{ fontSize: 20 }} /> {supported ? 'Fingerprint Scan Karo' : 'Demo Enroll Karo'}</>
              )}
            </button>

            {/* Remove button — only if already enrolled */}
            {isAlreadyEnrolled && !enrolling && (
              <button onClick={removeFingerprint} className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                Fingerprint Remove Karo / Remove
              </button>
            )}

            <button onClick={onClose} className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center' }}>
              Cancel / Baaad Mein Karo
            </button>
          </div>
        )}

        {step === 'success' && (
          <button onClick={onClose} className="btn btn-success"
            style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}>
            <MdCheckCircle /> Done! / हो गया
          </button>
        )}

        <style>{`
          @keyframes fpulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.96); }
          }
          @keyframes fpulse-ring {
            0%  { transform: scale(1); opacity: 0.6; }
            100%{ transform: scale(1.4); opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
}