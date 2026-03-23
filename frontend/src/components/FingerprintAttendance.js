import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { MdFingerprint, MdCheckCircle, MdSearch, MdPersonAdd, MdInfo, MdWarning } from 'react-icons/md';

// ── Helpers ───────────────────────────────────────────────────────────────────
function bufferToBase64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

// ── Check if WebAuthn is truly available ──────────────────────────────────────
function isWebAuthnSupported() {
  return !!(
    window.PublicKeyCredential &&
    navigator.credentials &&
    navigator.credentials.create &&
    navigator.credentials.get &&
    (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
  );
}

export default function FingerprintAttendance() {
  const [allStudents,      setAllStudents]      = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [search,           setSearch]           = useState('');
  const [enrollSearch,     setEnrollSearch]     = useState('');
  const [selected,         setSelected]         = useState(null);
  const [enrollSelected,   setEnrollSelected]   = useState(null);
  const [scanning,         setScanning]         = useState(false);
  const [enrolling,        setEnrolling]        = useState(false);
  const [status,           setStatus]           = useState('idle');
  const [tab,              setTab]              = useState('scan');
  const [supported]        = useState(isWebAuthnSupported());

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data } = await API.get('/students');
      setAllStudents(data);
      setEnrolledStudents(data.filter(s => s.fingerprintCredentialId));
    } catch (err) {
      console.error(err);
    }
  };

  // ── ENROLL: Register fingerprint ──────────────────────────────────────────
  const enrollFingerprint = async () => {
    if (!enrollSelected) return toast.error('Pehle student select karo / Please select a student');

    if (!supported) {
      // Demo mode — simulate enrollment
      try {
        setEnrolling(true);
        await new Promise(r => setTimeout(r, 1500));
        const demoId = 'demo_' + Date.now();
        await API.post(`/students/${enrollSelected._id}/fingerprint`, { credentialId: demoId });
        toast.success(`✅ ${enrollSelected.name} ka fingerprint enroll ho gaya! (Demo Mode)`);
        setEnrollSelected(null);
        setEnrollSearch('');
        fetchStudents();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Enrollment fail hua / Enrollment failed');
      } finally {
        setEnrolling(false);
      }
      return;
    }

    setEnrolling(true);
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new TextEncoder().encode(enrollSelected.studentId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'AttendAI School System' },
          user: {
            id: userId,
            name: enrollSelected.email || enrollSelected.studentId,
            displayName: enrollSelected.name,
          },
          pubKeyCredParams: [
            { alg: -7,   type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        }
      });

      const credentialId = bufferToBase64url(credential.rawId);
      await API.post(`/students/${enrollSelected._id}/fingerprint`, { credentialId });

      toast.success(`✅ ${enrollSelected.name} ka fingerprint register ho gaya! / Fingerprint enrolled!`);
      setEnrollSelected(null);
      setEnrollSearch('');
      fetchStudents();
    } catch (err) {
      console.error('Enrollment error:', err);
      if (err.name === 'NotAllowedError')
        toast.error('Fingerprint cancel ya timeout hua / Fingerprint cancelled or timed out');
      else if (err.name === 'InvalidStateError')
        toast.error('Yeh device pehle se registered hai / Device already registered');
      else if (err.name === 'NotSupportedError')
        toast.error('Device biometric support nahi karta / Device does not support biometric');
      else
        toast.error(`Enrollment fail: ${err.message}`);
    } finally {
      setEnrolling(false);
    }
  };

  // ── VERIFY: Check fingerprint → mark attendance ───────────────────────────
  const verifyFingerprint = async () => {
    if (!selected) return toast.error('Pehle student select karo / Please select a student');
    setScanning(true);
    setStatus('scanning');

    // Demo mode
    if (!supported || selected.fingerprintCredentialId?.startsWith('demo_')) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        await API.post('/attendance/mark', { studentId: selected.studentId, method: 'fingerprint' });
        setStatus('success');
        toast.success(`✅ ${selected.name} — Attendance mark ho gayi! (Demo Mode)`);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed');
        setStatus('error');
      } finally {
        setScanning(false);
      }
      return;
    }

    try {
      const challenge    = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const credentialId = base64urlToUint8Array(selected.fingerprintCredentialId);

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            type: 'public-key',
            id: credentialId,
            transports: ['internal', 'hybrid']
          }],
          userVerification: 'required',
          timeout: 60000
        }
      });

      if (assertion) {
        await API.post('/attendance/mark', {
          studentId: selected.studentId,
          method: 'fingerprint'
        });
        setStatus('success');
        toast.success(`✅ ${selected.name} — Attendance mark ho gayi! / Attendance marked!`);
      }
    } catch (err) {
      console.error('Verification error:', err);
      if (err.name === 'NotAllowedError')
        toast.error('Fingerprint match nahi hua / Fingerprint did not match or was cancelled');
      else if (err.name === 'InvalidStateError')
        toast.error('Is device pe registered nahi / Not registered on this device');
      else
        toast.error('Verification fail hui / Fingerprint verification failed');
      setStatus('error');
    } finally {
      setScanning(false);
    }
  };

  // ── REMOVE enrollment ─────────────────────────────────────────────────────
  const removeEnrollment = async (student) => {
    if (!window.confirm(`${student.name} ka fingerprint remove karein?\nRemove fingerprint for ${student.name}?`)) return;
    try {
      await API.post(`/students/${student._id}/fingerprint`, { credentialId: null });
      toast.success(`Fingerprint remove ho gaya / Fingerprint removed for ${student.name}`);
      fetchStudents();
    } catch {
      toast.error('Remove fail hua / Failed to remove fingerprint');
    }
  };

  const filteredEnrolled = enrolledStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId.toLowerCase().includes(search.toLowerCase())
  );

  const notEnrolled = allStudents.filter(s =>
    !s.fingerprintCredentialId &&
    (s.name.toLowerCase().includes(enrollSearch.toLowerCase()) ||
     s.studentId.toLowerCase().includes(enrollSearch.toLowerCase()))
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <MdFingerprint style={{ fontSize: 24, color: '#3b82f6' }} />
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Fingerprint Attendance</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            WebAuthn — Windows Hello / Touch ID / Android Fingerprint
          </p>
        </div>
      </div>

      {/* Status Banner */}
      {!supported ? (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: '#f59e0b', display: 'flex', gap: 8 }}>
          <MdWarning style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Demo Mode Active</strong> — Real fingerprint ke liye HTTPS ya localhost chahiye.<br />
            <span style={{ opacity: 0.8, fontSize: 12 }}>Demo mode mein attendance mark hogi bina actual fingerprint ke. / Demo mode active — attendance will be marked without actual fingerprint scan.</span>
          </div>
        </div>
      ) : (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: '#10b981', display: 'flex', gap: 8 }}>
          <MdInfo style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>WebAuthn Ready! ✅</strong> — Device ka biometric use hoga. Fingerprint data kabhi server pe nahi jaata. /
            Device biometric will be used. Biometric data never leaves your device.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === 'scan' ? 'active' : ''}`} onClick={() => setTab('scan')}>
          <MdFingerprint /> Attendance Scan
        </button>
        <button className={`tab ${tab === 'enroll' ? 'active' : ''}`} onClick={() => setTab('enroll')}>
          <MdPersonAdd /> Enroll / Register
        </button>
      </div>

      {/* ── TAB 1: SCAN ─────────────────────────────────────────────────── */}
      {tab === 'scan' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Student list */}
          <div>
            <label className="label">Enrolled Students ({filteredEnrolled.length})</label>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
              <input className="input" placeholder="Naam ya ID se search..."
                value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredEnrolled.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30, fontSize: 13 }}>
                  Koi enrolled student nahi mila.<br />
                  <span style={{ fontSize: 12 }}>Pehle "Enroll / Register" tab mein register karo.</span><br />
                  <button onClick={() => setTab('enroll')} className="btn btn-primary"
                    style={{ marginTop: 12, padding: '8px 16px', fontSize: 12 }}>
                    Enroll Karo →
                  </button>
                </div>
              ) : filteredEnrolled.map(s => (
                <div key={s._id} onClick={() => { setSelected(s); setStatus('idle'); }}
                  style={{
                    padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                    background: selected?._id === s._id ? 'rgba(59,130,246,0.15)' : 'var(--bg-secondary)',
                    border: `1px solid ${selected?._id === s._id ? '#3b82f6' : 'var(--border)'}`,
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.studentId} • {s.class}-{s.section}</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>
                    ✓ {s.fingerprintCredentialId?.startsWith('demo_') ? 'Demo' : 'Enrolled'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Scanner UI */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            {/* Animated circle */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 150, height: 150, borderRadius: '50%',
                background: scanning
                  ? 'rgba(59,130,246,0.12)'
                  : status === 'success' ? 'rgba(16,185,129,0.12)'
                  : status === 'error'   ? 'rgba(239,68,68,0.12)'
                  : 'var(--bg-secondary)',
                border: `3px solid ${
                  scanning ? '#3b82f6'
                  : status === 'success' ? '#10b981'
                  : status === 'error'   ? '#ef4444'
                  : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s',
                boxShadow: scanning
                  ? '0 0 40px rgba(59,130,246,0.25)'
                  : status === 'success' ? '0 0 40px rgba(16,185,129,0.25)'
                  : 'none'
              }}>
                {status === 'success'
                  ? <MdCheckCircle style={{ fontSize: 70, color: '#10b981' }} />
                  : <MdFingerprint style={{
                      fontSize: 80,
                      color: scanning ? '#3b82f6' : status === 'error' ? '#ef4444' : 'var(--text-muted)',
                      transition: 'color 0.3s'
                    }} />
                }
              </div>
              {scanning && [1, 2, 3].map(i => (
                <div key={i} style={{
                  position: 'absolute', inset: -(i * 14), borderRadius: '50%',
                  border: `2px solid rgba(59,130,246,${0.3 - i * 0.08})`,
                  animation: `pulse-ring ${0.8 + i * 0.35}s ease-out infinite`
                }} />
              ))}
            </div>

            {/* Student name */}
            {selected ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.studentId} • {selected.class}</div>
                {status === 'success' && (
                  <div style={{ fontSize: 13, color: '#10b981', marginTop: 6, fontWeight: 600 }}>
                    ✅ Attendance mark ho gayi! / Attendance marked!
                  </div>
                )}
                {status === 'error' && (
                  <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>
                    ❌ Verification fail. Dobara try karo. / Verification failed. Try again.
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                ← Student select karo / Select a student
              </p>
            )}

            {/* Buttons */}
            {status !== 'success' ? (
              <button className="btn btn-primary"
                onClick={verifyFingerprint}
                disabled={!selected || scanning}
                style={{ width: '100%', justifyContent: 'center', padding: '13px' }}>
                <MdFingerprint />
                {scanning
                  ? 'Scanning... / स्कैन हो रहा है...'
                  : supported
                    ? 'Fingerprint Scan Karo / Scan Fingerprint'
                    : 'Demo Attendance Mark Karo'}
              </button>
            ) : (
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { setSelected(null); setStatus('idle'); }}>
                Aur Mark Karo / Mark Another
              </button>
            )}

            {/* Mode info */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.8 }}>
              {supported
                ? '🔐 Device biometric use hoga\nFingerprint data device se bahar nahi jaata'
                : '⚠️ Demo mode — HTTPS pe real fingerprint kaam karega'}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ENROLL ───────────────────────────────────────────────── */}
      {tab === 'enroll' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Not enrolled */}
          <div>
            <label className="label">Unenrolled Students ({notEnrolled.length})</label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Yeh students abhi fingerprint se attendance nahi de sakte /
              These students can't mark attendance via fingerprint yet
            </p>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
              <input className="input" placeholder="Student search karo..."
                value={enrollSearch} onChange={e => setEnrollSearch(e.target.value)} style={{ paddingLeft: 34 }} />
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {notEnrolled.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#10b981', padding: 30, fontSize: 13 }}>
                  🎉 Sabhi students enrolled hain! / All students are enrolled!
                </div>
              ) : notEnrolled.map(s => (
                <div key={s._id} onClick={() => setEnrollSelected(s)}
                  style={{
                    padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                    background: enrollSelected?._id === s._id ? 'rgba(139,92,246,0.15)' : 'var(--bg-secondary)',
                    border: `1px solid ${enrollSelected?._id === s._id ? '#8b5cf6' : 'var(--border)'}`,
                    transition: 'all 0.15s'
                  }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.studentId} • {s.class}-{s.section}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Enrollment panel */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{
              width: 150, height: 150, borderRadius: '50%',
              background: enrolling ? 'rgba(139,92,246,0.12)' : 'var(--bg-secondary)',
              border: `3px solid ${enrolling || enrollSelected ? '#8b5cf6' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s',
              boxShadow: enrolling ? '0 0 40px rgba(139,92,246,0.25)' : 'none'
            }}>
              <MdPersonAdd style={{
                fontSize: 70,
                color: enrolling || enrollSelected ? '#8b5cf6' : 'var(--text-muted)',
                transition: 'color 0.3s'
              }} />
            </div>

            {enrollSelected ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{enrollSelected.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{enrollSelected.studentId}</div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>← Student select karo / Select a student</p>
            )}

            <button className="btn"
              onClick={enrollFingerprint}
              disabled={!enrollSelected || enrolling}
              style={{ width: '100%', justifyContent: 'center', padding: '13px', background: '#8b5cf6', color: 'white' }}>
              <MdFingerprint />
              {enrolling
                ? 'Registering... / पंजीकरण हो रहा है...'
                : supported
                  ? 'Fingerprint Register Karo / Register Fingerprint'
                  : 'Demo Register Karo'}
            </button>

            {/* Steps guide */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 14, fontSize: 12, color: 'var(--text-muted)', lineHeight: 2, width: '100%' }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Steps:</div>
              <div>1️⃣ Student select karo / Select student</div>
              <div>2️⃣ Button dabao / Click button</div>
              <div>3️⃣ {supported ? 'Device fingerprint scan karega / Device will scan fingerprint' : 'Demo mode mein auto register hoga'}</div>
              <div>4️⃣ Done! Ab attendance de sakta hai ✅</div>
            </div>

            {/* Already enrolled */}
            {enrolledStudents.length > 0 && (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                  ENROLLED ({enrolledStudents.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                  {enrolledStudents.map(s => (
                    <div key={s._id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)'
                    }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{s.studentId}</span>
                        {s.fingerprintCredentialId?.startsWith('demo_') && (
                          <span style={{ fontSize: 10, marginLeft: 6, color: '#f59e0b' }}>(Demo)</span>
                        )}
                      </div>
                      <button onClick={() => removeEnrollment(s)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 11, color: '#ef4444', padding: '2px 6px'
                      }}>
                        Hatao / Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-ring {
          0%  { transform: scale(1);   opacity: 0.6; }
          100%{ transform: scale(1.4); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}