import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MdDashboard, MdPeople, MdCheckCircle, MdBarChart,
  MdLogout, MdMenu, MdClose, MdFingerprint, MdAutoAwesome
} from 'react-icons/md';

const navItems = [
  { to: '/', icon: MdDashboard, label: 'Dashboard' },
  { to: '/attendance', icon: MdCheckCircle, label: 'Attendance' },
  { to: '/students', icon: MdPeople, label: 'Students' },
  { to: '/reports', icon: MdBarChart, label: 'Reports' },
  { to: '/ai', icon: MdAutoAwesome, label: 'AI Features' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '240px' : '72px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden', flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <MdFingerprint style={{ color: 'white', fontSize: 22 }} />
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>AttendAI</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Smart Attendance</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 12px', borderRadius: 10, marginBottom: 4,
              textDecoration: 'none', transition: 'all 0.15s',
              background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: isActive ? '#3b82f6' : 'var(--text-muted)',
              fontWeight: isActive ? 600 : 400,
              borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
            })}>
              <Icon style={{ fontSize: 20, flexShrink: 0 }} />
              {sidebarOpen && <span style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User & Logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          {sidebarOpen && (
            <div style={{ padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: 'white'
              }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.role}</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 10, border: 'none',
            background: 'transparent', cursor: 'pointer', width: '100%',
            color: 'var(--accent-red)', transition: 'all 0.15s', fontFamily: 'Sora,sans-serif',
          }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <MdLogout style={{ fontSize: 20, flexShrink: 0 }} />
            {sidebarOpen && <span style={{ fontSize: 14, fontWeight: 500 }}>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          padding: '0 24px', height: 60, display: 'flex', alignItems: 'center',
          borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
          gap: 16, flexShrink: 0
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 22, display: 'flex'
          }}>
            {sidebarOpen ? <MdClose /> : <MdMenu />}
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}