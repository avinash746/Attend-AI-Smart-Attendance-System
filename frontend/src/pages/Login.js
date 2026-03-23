import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MdFingerprint, MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdPersonAdd } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function Login() {
  const { login, loading } = useAuth();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [tab, setTab]         = useState('login');   // 'login' | 'register'
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [regLoading, setRegLoading] = useState(false);

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password)
      return toast.error('Email aur password dono bharo / Please fill both fields');
    const res = await login(form.email, form.password);
    if (!res.success) toast.error(res.message);
  };

  // ── Register (Pehla Admin Account) ───────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.email || !regForm.password)
      return toast.error('Sabhi fields bharo / Please fill all fields');
    if (regForm.password.length < 6)
      return toast.error('Password kam se kam 6 characters ka hona chahiye / Password must be at least 6 characters');
    if (regForm.password !== regForm.confirmPassword)
      return toast.error('Passwords match nahi kar rahe / Passwords do not match');

    setRegLoading(true);
    try {
      await API.post('/auth/register', {
        name:     regForm.name,
        email:    regForm.email,
        password: regForm.password,
        role:     'admin'
      });
      toast.success('Account ban gaya! Ab login karo / Account created! Please login now');
      setTab('login');
      setForm({ email: regForm.email, password: '' });
      setRegForm({ name: '', email: '', password: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration fail hui / Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.08) 0%, transparent 50%)'
    }}>
      <div style={{ width: '100%', maxWidth: 440, padding: '0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(59,130,246,0.3)'
          }}>
            <MdFingerprint style={{ fontSize: 40, color: 'white' }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>AttendAI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Smart Attendance Management System
          </p>
        </div>

        {/* Tab Switch */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>
            Login / लॉगिन
          </button>
          <button className={`tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>
            <MdPersonAdd /> New Account / नया अकाउंट
          </button>
        </div>

        {/* ── LOGIN FORM ─────────────────────────────────────────────────── */}
        {tab === 'login' && (
          <div className="card">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              Login Karo / Sign In
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              Apna email aur password daalo / Enter your email and password
            </p>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Email</label>
                <div style={{ position: 'relative' }}>
                  <MdEmail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
                  <input className="input" type="email" required
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="aapka@email.com" style={{ paddingLeft: 38 }} />
                </div>
              </div>
              <div style={{ marginBottom: 28 }}>
                <label className="label">Password</label>
                <div style={{ position: 'relative' }}>
                  <MdLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
                  <input className="input" type={showPass ? 'text' : 'password'} required
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••" style={{ paddingLeft: 38, paddingRight: 38 }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18
                  }}>
                    {showPass ? <MdVisibilityOff /> : <MdVisibility />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: 13 }}>
                {loading ? <span className="spinner" /> : 'Login Karo / Sign In'}
              </button>
            </form>
            <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              Pehli baar? →{' '}
              <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setTab('register')}>
                Naya account banao / Create account
              </span>
            </p>
          </div>
        )}

        {/* ── REGISTER FORM ──────────────────────────────────────────────── */}
        {tab === 'register' && (
          <div className="card">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              Admin Account Banao / Create Admin Account
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              Pehli baar setup kar rahe ho / Setting up for the first time
            </p>
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Aapka Naam / Your Name</label>
                <input className="input" type="text" required
                  value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                  placeholder="Aapka poora naam / Your full name" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Email</label>
                <input className="input" type="email" required
                  value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="aapka@email.com" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Password (kam se kam 6 characters)</label>
                <input className="input" type="password" required
                  value={regForm.password} onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                  placeholder="Strong password likho / Enter strong password" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="label">Password Confirm Karo / Confirm Password</label>
                <input className="input" type="password" required
                  value={regForm.confirmPassword} onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                  placeholder="Wahi password dobara likho / Re-enter password" />
              </div>
              <button type="submit" disabled={regLoading} className="btn btn-success"
                style={{ width: '100%', justifyContent: 'center', padding: 13 }}>
                {regLoading ? <span className="spinner" /> : 'Account Banao / Create Account'}
              </button>
            </form>
            <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              Account hai pehle se? →{' '}
              <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setTab('login')}>
                Login karo / Sign in
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}