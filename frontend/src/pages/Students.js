import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MdAdd, MdSearch, MdFace, MdFingerprint, MdEdit,
  MdDelete, MdClose, MdCheckCircle, MdPerson, MdUploadFile
} from 'react-icons/md';
import API from '../utils/api';
import toast from 'react-hot-toast';
import FaceEnrollModal from '../components/FaceEnrollModal';
import FingerprintEnrollModal from '../components/FingerprintEnrollModal';

const CLASSES  = ['Class 1','Class 2','Class 3','Class 4','Class 5',
  'Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12'];
const SECTIONS = ['A','B','C','D','E'];

const emptyForm = {
  studentId: '', name: '', email: '', phone: '',
  class: 'Class 1', section: 'A', rollNumber: ''
};

// ── Student Add/Edit Modal ────────────────────────────────────────────────────
function StudentModal({ student, onClose, onSave }) {
  const [form,   setForm]   = useState(student ? { ...student } : { ...emptyForm });
  const [photo,  setPhoto]  = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.name || !form.email || !form.rollNumber)
      return toast.error('Sabhi required fields bharo / Fill all required fields');

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') fd.append(k, v);
      });
      if (photo) fd.append('photo', photo);

      let res;
      if (student) {
        res = await API.put(`/students/${student._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Student update ho gaya / Student updated successfully');
      } else {
        res = await API.post('/students', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Student add ho gaya / Student added successfully');
      }
      onSave(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Kuch galat hua / Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            {student ? 'Student Edit Karo / Edit Student' : 'Naya Student Add Karo / Add New Student'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22 }}>
            <MdClose />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div>
              <label className="label">Student ID *</label>
              <input className="input" required value={form.studentId}
                onChange={e => setForm({ ...form, studentId: e.target.value })} placeholder="STU001" />
            </div>
            <div>
              <label className="label">Roll Number *</label>
              <input className="input" type="number" required value={form.rollNumber}
                onChange={e => setForm({ ...form, rollNumber: e.target.value })} placeholder="1" />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Poora Naam / Full Name *</label>
            <input className="input" required value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Rahul Sharma" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Email *</label>
            <input className="input" type="email" required value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} placeholder="rahul@school.com" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Phone <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input className="input" value={form.phone || ''}
              onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
          </div>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div>
              <label className="label">Class *</label>
              <select className="input" value={form.class} onChange={e => setForm({ ...form, class: e.target.value })}>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Section</label>
              <select className="input" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}>
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label className="label">Photo <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <button type="button" onClick={() => fileRef.current.click()}
              className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
              <MdUploadFile /> {photo ? photo.name : 'Photo Upload Karo / Upload Photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => setPhoto(e.target.files[0])} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
              Cancel / रद्द करें
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>
              {saving ? <span className="spinner" /> : <MdCheckCircle />}
              {student ? 'Update Karo / Update' : 'Add Karo / Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Students Page ────────────────────────────────────────────────────────
// Helper — properly check if face/fingerprint is truly enrolled
const isFaceEnrolled = (s) => !!(s.faceDescriptor && Array.isArray(s.faceDescriptor) && s.faceDescriptor.length > 0);
const isFpEnrolled   = (s) => !!(s.fingerprintCredentialId && s.fingerprintCredentialId.trim() !== '' && s.fingerprintCredentialId !== 'null');

export default function Students() {
  const [students,      setStudents]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [classFilter,   setClassFilter]   = useState('');
  const [showModal,     setShowModal]     = useState(false);
  const [editStudent,   setEditStudent]   = useState(null);
  const [enrollStudent,   setEnrollStudent]   = useState(null);
  const [fpStudent,       setFpStudent]       = useState(null); // fingerprint enroll modal

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)      params.search = search;
      if (classFilter) params.class  = classFilter;
      const { data } = await API.get('/students', { params });
      setStudents(data);
    } catch {
      toast.error('Students load nahi hue / Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [search, classFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  const handleSave = (student) => {
    if (editStudent) {
      setStudents(prev => prev.map(s => s._id === student._id ? student : s));
    } else {
      setStudents(prev => [student, ...prev]);
    }
    setShowModal(false);
    setEditStudent(null);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`${name} ko deactivate karein?\nDeactivate ${name}?`)) return;
    try {
      await API.delete(`/students/${id}`);
      setStudents(prev => prev.filter(s => s._id !== id));
      toast.success('Student deactivate ho gaya / Student deactivated');
    } catch {
      toast.error('Delete fail hua / Delete failed');
    }
  };

  // After face enrolled — refresh student list
  const handleFaceEnrolled = () => {
    fetchStudents();
  };

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Students / छात्र</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            {students.length} students registered / पंजीकृत
          </p>
        </div>
        <button onClick={() => { setEditStudent(null); setShowModal(true); }} className="btn btn-primary">
          <MdAdd /> Add Student / छात्र जोड़ें
        </button>
      </div>

      {/* Face Enrollment Info Banner */}
      <div style={{
        background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        <MdFace style={{ fontSize: 22, color: '#8b5cf6', flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: '#8b5cf6', margin: 0 }}>
          <strong>Face Enrollment:</strong> Student add karne ke baad purple{' '}
          <MdFace style={{ fontSize: 14, verticalAlign: 'middle' }} /> icon click karo — camera se face scan karke enroll karo!
          Tabhi Face Recognition attendance kaam karega. /
          After adding a student, click the purple face icon to enroll their face for attendance.
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 2, position: 'relative' }}>
            <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
            <input className="input" placeholder="Naam ya ID se dhundho / Search by name or ID..."
              style={{ paddingLeft: 34 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <select className="input" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
              <option value="">Sabhi Classes / All Classes</option>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <span className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
            <MdPerson style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>Koi student nahi mila / No students found</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>
              "Add Student" button se student add karo / Click "Add Student" to get started
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>ID / Roll</th>
                <th>Class</th>
                <th>Contact</th>
                <th style={{ textAlign: 'center' }}>Biometrics</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s._id}>
                  {/* Student info */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {s.photo ? (
                        <img src={s.photo.startsWith('data:') ? s.photo : `http://localhost:5000${s.photo}`}
                          alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                      ) : (
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 15, fontWeight: 700, color: 'white'
                        }}>
                          {s.name[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Roll #{s.rollNumber}</div>
                      </div>
                    </div>
                  </td>

                  <td><span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{s.studentId}</span></td>
                  <td style={{ fontSize: 13 }}>{s.class} – {s.section}</td>

                  <td>
                    <div style={{ fontSize: 12 }}>
                      <div style={{ color: 'var(--text-secondary)' }}>{s.email}</div>
                      {s.phone && <div style={{ color: 'var(--text-muted)' }}>{s.phone}</div>}
                    </div>
                  </td>

                  {/* Biometric status + enroll buttons */}
                  <td>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>

                      {/* ── FACE button ─────────────────────────────── */}
                      <button
                        onClick={() => {
                          if (isFaceEnrolled(s)) {
                            toast.success(`✅ ${s.name} ka face already enrolled hai! Re-enroll karne ke liye click karo.`, { duration: 3000 });
                          }
                          setEnrollStudent(s);
                        }}
                        title={isFaceEnrolled(s) ? '✅ Face already enrolled — click to re-enroll' : '📷 Face not enrolled — click to enroll'}
                        style={{
                          background: isFaceEnrolled(s) ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.1)',
                          border: `2px solid ${isFaceEnrolled(s) ? '#10b981' : 'var(--border)'}`,
                          borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                          transition: 'all 0.2s',
                          boxShadow: isFaceEnrolled(s) ? '0 0 8px rgba(16,185,129,0.25)' : 'none',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.background = isFaceEnrolled(s) ? 'rgba(16,185,129,0.25)' : 'rgba(139,92,246,0.15)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.background = isFaceEnrolled(s) ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.1)';
                        }}
                      >
                        <MdFace style={{ fontSize: 18, color: isFaceEnrolled(s) ? '#10b981' : 'var(--text-muted)' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: isFaceEnrolled(s) ? '#10b981' : 'var(--text-muted)' }}>
                          {isFaceEnrolled(s) ? '✓ Done' : '+ Enroll'}
                        </span>
                      </button>

                      {/* ── FINGERPRINT button ───────────────────────── */}
                      <button
                        onClick={() => {
                          if (isFpEnrolled(s)) {
                            toast.success(`✅ ${s.name} ka fingerprint already enrolled hai! Re-enroll ya remove karne ke liye click karo.`, { duration: 3000 });
                          }
                          setFpStudent(s);
                        }}
                        title={isFpEnrolled(s) ? '✅ Fingerprint already enrolled — click to manage' : '🖐 Fingerprint not enrolled — click to enroll'}
                        style={{
                          background: isFpEnrolled(s) ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.1)',
                          border: `2px solid ${isFpEnrolled(s) ? '#10b981' : 'var(--border)'}`,
                          borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                          transition: 'all 0.2s',
                          boxShadow: isFpEnrolled(s) ? '0 0 8px rgba(16,185,129,0.25)' : 'none',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.background = isFpEnrolled(s) ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.15)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.background = isFpEnrolled(s) ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.1)';
                        }}
                      >
                        <MdFingerprint style={{ fontSize: 18, color: isFpEnrolled(s) ? '#10b981' : 'var(--text-muted)' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: isFpEnrolled(s) ? '#10b981' : 'var(--text-muted)' }}>
                          {isFpEnrolled(s) ? '✓ Done' : '+ Enroll'}
                        </span>
                      </button>

                    </div>
                  </td>

                  {/* Edit / Delete */}
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => { setEditStudent(s); setShowModal(true); }}
                        className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }}>
                        <MdEdit /> Edit
                      </button>
                      <button onClick={() => handleDelete(s._id, s.name)}
                        className="btn btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 13, color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.3)' }}>
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Student Modal */}
      {showModal && (
        <StudentModal
          student={editStudent}
          onClose={() => { setShowModal(false); setEditStudent(null); }}
          onSave={handleSave}
        />
      )}

      {/* Face Enrollment Modal */}
      {enrollStudent && (
        <FaceEnrollModal
          student={enrollStudent}
          onClose={() => setEnrollStudent(null)}
          onEnrolled={handleFaceEnrolled}
        />
      )}

      {/* Fingerprint Enrollment Modal */}
      {fpStudent && (
        <FingerprintEnrollModal
          student={fpStudent}
          onClose={() => setFpStudent(null)}
          onEnrolled={() => { fetchStudents(); }}
        />
      )}
    </div>
  );
}