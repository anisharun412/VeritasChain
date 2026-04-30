import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { UserRole, getRoleDefinition } from '../auth/roles';
import { useShipmentTracking } from './useShipmentTracking';
import ShipmentMap from './ShipmentMap';
import LiveTemperatureChart from './LiveTemperatureChart';

const ROLE_TITLE: Record<UserRole, string> = {
  [UserRole.MANUFACTURER]: '🏭 Origin Tracking',
  [UserRole.CARRIER]:      '🚛 Active Transports',
  [UserRole.RECEIVER]:     '📥 Incoming Deliveries',
  [UserRole.REGULATOR]:    '⚖️ Regulatory View',
};

export default function TrackingPage() {
  const { userRole, displayName, organization } = useAuth();
  const navigate = useNavigate();
  const { stats, isConnected } = useShipmentTracking(userRole);
  const def = userRole ? getRoleDefinition(userRole) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
      {/* ── Top Header Bar (matches DashboardShell) ── */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/dashboard')} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
          }}>← Dashboard</button>
          
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>
              {userRole ? ROLE_TITLE[userRole] : 'Live Tracking'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {def && (
            <span style={{
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600,
            }}>
              {def.icon} {organization}
            </span>
          )}

          <span style={{
            background: isConnected ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            border: `1px solid ${isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
            color: isConnected ? '#34d399' : '#fbbf24',
            borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? '#10B981' : '#F59E0B' }} />
            {isConnected ? 'Live Sync' : 'Offline / Mock'}
          </span>
        </div>
      </header>

      {/* ── Stats Bar ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 32, flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {[
          { label: 'Tracked',     value: String(stats.total),       color: '#3B82F6' },
          { label: 'In Transit',  value: String(stats.inTransit),   color: '#10B981' },
          { label: 'Contested',   value: String(stats.contested),   color: '#EF4444' },
          { label: 'Freshness',   value: `${stats.avgFreshness}%`,  color: '#F59E0B' },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Map Area ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <LiveTemperatureChart />
        <ShipmentMap userRole={userRole!} />
      </div>
    </div>
  );
}
