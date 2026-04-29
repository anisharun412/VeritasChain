import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useOfflineQueue } from '../offline/useOfflineQueue';
import { OfflineQueue } from '../offline/OfflineQueue';
import { WalletConnect } from '../blockchain/WalletConnect';

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
  const { logout, switchRole, userRole } = useAuth();
  const { queue, stats, sync, isSyncing } = useOfflineQueue();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Header */}
      <header className="app-header" style={{ background: `linear-gradient(135deg, #0f2027, #203a43)` }}>
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          <div className="logo-icon" style={{ background: accentColor }}>{icon}</div>
          <div>
            <div className="logo-text">{title}</div>
            <div className="logo-sub">{subtitle}</div>
          </div>
        </div>

        <div className="header-actions">
          <WalletConnect />
          {actions && <div>{actions}</div>}
          <button className="logout-btn" onClick={logout}>Sign out</button>
        </div>
      </header>

      {/* Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Offline queue widget */}
      <OfflineQueue queue={queue} stats={stats} onSync={sync} isSyncing={isSyncing} />
    </div>
  );
}
