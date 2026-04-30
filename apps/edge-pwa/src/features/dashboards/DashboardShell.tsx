import React, { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useOfflineQueue } from '../offline/useOfflineQueue';
import { OfflineQueue } from '../offline/OfflineQueue';
import { WalletConnect } from '../blockchain/WalletConnect';
import { getRoleDefinition } from '../auth/roles';

interface DashboardShellProps {
  accentColor: string;
  icon: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function DashboardShell({
  accentColor, icon, title, subtitle, actions, children,
}: DashboardShellProps) {
  const { logout, userRole } = useAuth();
  const { queue, stats, sync, isSyncing } = useOfflineQueue();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleDef = userRole ? getRoleDefinition(userRole) : null;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/tracking', label: 'Track', icon: '🌍' },
    { path: '/physical/verify', label: 'Verify', icon: '📡' },
    { path: '/physical/history', label: 'History', icon: '📋' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Header Bar ── */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}>
        {/* Left: Logo + identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
             onClick={() => navigate('/dashboard')}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 18,
            background: accentColor, boxShadow: `0 4px 12px ${accentColor}44`,
          }}>{icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{subtitle}</div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Sync indicator */}
          {stats.pending > 0 && (
            <span style={{
              background: 'rgba(245,158,11,0.2)', color: '#F59E0B',
              borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              ⏳ {stats.pending} queued
            </span>
          )}

          <WalletConnect />

          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}

          <button onClick={() => navigate('/tracking')} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
            minHeight: 36,
          }}>🌍 Map</button>

          <button onClick={logout} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '7px 14px',
            cursor: 'pointer', fontSize: 12, minHeight: 36,
          }}>Sign out</button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, maxWidth: 1000, width: '100%', margin: '0 auto', padding: '1.5rem' }}>
        {children}
      </main>

      {/* ── Bottom Navigation Bar ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: 60, zIndex: 100, boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
      }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path === '/dashboard' && location.pathname === '/dashboard');
          return (
            <button key={item.path} onClick={() => navigate(item.path)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              color: isActive ? accentColor : '#94a3b8', padding: '6px 12px',
              minWidth: 60, minHeight: 44,
            }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Offline Queue Widget ── */}
      <OfflineQueue queue={queue} stats={stats} onSync={sync} isSyncing={isSyncing} />

      {/* Bottom nav spacer */}
      <div style={{ height: 60 }} />
    </div>
  );
}
