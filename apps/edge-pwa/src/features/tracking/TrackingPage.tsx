import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { UserRole, getRoleDefinition } from '../auth/roles';
import { useShipmentTracking } from './useShipmentTracking';
import ShipmentMap from './ShipmentMap';

const ROLE_TITLE: Record<UserRole, string> = {
  [UserRole.MANUFACTURER]: '🏭 Origin Tracking — Your Shipments',
  [UserRole.CARRIER]:      '🚛 Active Transports — In Transit',
  [UserRole.RECEIVER]:     '📥 Incoming Deliveries — Your Destination',
  [UserRole.REGULATOR]:    '⚖️ All Active Shipments — Regulatory View',
};

export default function TrackingPage() {
  const { userRole, displayName, organization } = useAuth();
  const navigate = useNavigate();
  const { stats, isConnected } = useShipmentTracking(userRole);
  const def = userRole ? getRoleDefinition(userRole) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f2027' }}>

      {/* ── Header ── */}
      <header style={{
        background: 'rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '0 1.5rem',
        height: '3.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', borderRadius: '0.4rem', padding: '0.3rem 0.75rem',
              cursor: 'pointer', fontSize: '0.8rem',
            }}
          >
            ← Dashboard
          </button>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
            {userRole ? ROLE_TITLE[userRole] : 'Live Tracking'}
          </span>
        </div>

        {/* Stats + connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Role badge */}
          {def && (
            <span style={{
              background: def.color + '22', color: def.color,
              border: `1px solid ${def.color}44`,
              borderRadius: '9999px', padding: '0.2rem 0.7rem',
              fontSize: '0.72rem', fontWeight: 600,
            }}>
              {def.icon} {displayName} · {organization}
            </span>
          )}

          {/* Connection status */}
          <span style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isConnected ? '#10B981' : '#F59E0B',
              display: 'inline-block',
            }} />
            {isConnected ? 'Socket.io Connected' : 'Mock Simulation'}
          </span>
        </div>
      </header>

      {/* ── Role-specific stat bar ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0.6rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'Shipments Tracked', value: String(stats.total),       color: '#3B82F6' },
          { label: 'In Transit',        value: String(stats.inTransit),   color: '#10B981' },
          { label: 'Contested',         value: String(stats.contested),   color: '#EF4444' },
          { label: 'Avg Freshness',     value: `${stats.avgFreshness}%`,  color: '#F59E0B' },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>{s.label}</span>
          </div>
        ))}

        {/* Regulator-only: flagged alert */}
        {userRole === UserRole.REGULATOR && (
          <div style={{
            marginLeft: 'auto',
            background: '#EF444422', border: '1px solid #EF444455',
            borderRadius: '0.4rem', padding: '0.3rem 0.75rem',
            color: '#EF4444', fontSize: '0.78rem', fontWeight: 600,
          }}>
            🚩 1 shipment needs review — Insulin Batch 12C (11.4°C breach)
          </div>
        )}

        {/* Manufacturer: ETA notice */}
        {userRole === UserRole.MANUFACTURER && (
          <div style={{
            marginLeft: 'auto',
            background: '#10B98122', border: '1px solid #10B98144',
            borderRadius: '0.4rem', padding: '0.3rem 0.75rem',
            color: '#10B981', fontSize: '0.78rem', fontWeight: 600,
          }}>
            ✅ All your shipments on schedule
          </div>
        )}

        {/* Receiver: ETA */}
        {userRole === UserRole.RECEIVER && (
          <div style={{
            marginLeft: 'auto',
            background: '#3B82F622', border: '1px solid #3B82F644',
            borderRadius: '0.4rem', padding: '0.3rem 0.75rem',
            color: '#3B82F6', fontSize: '0.78rem', fontWeight: 600,
          }}>
            📦 SHIP-001 ETA: ~4 hours · Freshness 93%
          </div>
        )}
      </div>

      {/* ── Map (fills remaining height) ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <ShipmentMap userRole={userRole} height="100%" />
      </div>
    </div>
  );
}
