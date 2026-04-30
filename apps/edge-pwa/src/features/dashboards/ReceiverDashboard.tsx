import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRoleAccess } from '../auth/useRoleAccess';
import DashboardShell from './DashboardShell';
import BlockchainPanel from '../blockchain/BlockchainPanel';
import { UserRole } from '../auth/roles';

export default function ReceiverDashboard() {
  const { displayName, organization } = useAuth();
  const { roleDefinition } = useRoleAccess();
  const navigate = useNavigate();

  const history = [
    { id: 'SHIP-099', product: 'Insulin Batch 11A', date: '2024-11-28', freshness: 96, status: 'ok' },
    { id: 'SHIP-085', product: 'Vaccine Batch 39C', date: '2024-11-22', freshness: 88, status: 'ok' },
    { id: 'SHIP-071', product: 'mRNA Batch 35B', date: '2024-11-15', freshness: 42, status: 'contested' },
  ];

  return (
    <DashboardShell
      accentColor="#10B981"
      icon="📦"
      title={organization || 'Receiver'}
      subtitle={`${displayName} · ${roleDefinition?.label}`}
    >
      {/* ── Incoming Shipment Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #065f46, #059669)',
        borderRadius: 14, padding: 24, marginBottom: 20,
        boxShadow: '0 4px 16px rgba(5,150,105,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>📦</span>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
            SHIPMENT ARRIVING
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>mRNA Vaccine Batch 47B</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>From: DHL Cold Chain Hub</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>ETA: 14:30 today</div>
      </div>

      {/* ── Main Delivery Card ── */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
        overflow: 'hidden', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: 24, textAlign: 'center' }}>
          {/* Freshness Score (large) */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
            border: '3px solid #10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column',
          }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#065f46' }}>94</span>
            <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>FRESHNESS</span>
          </div>

          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>mRNA Vaccine Batch 47B</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>From: DHL Cold Chain Hub · ETA 14:30</div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/physical/verify')} style={{
              background: '#10B981', color: '#fff', border: 'none', borderRadius: 10,
              padding: '14px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)', minHeight: 48,
            }}>📡 Verify Now</button>
            <button onClick={() => navigate('/handoff/receive/SHIP-001')} style={{
              background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '14px 28px', fontSize: 14, cursor: 'pointer', color: '#64748b',
              minHeight: 48,
            }}>Accept Delivery</button>
          </div>
        </div>
      </div>

      {/* ── History ── */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
        overflow: 'hidden', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Recent Deliveries</span>
        </div>
        {history.map((h) => (
          <div key={h.id} style={{
            padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{h.product}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{h.date} · {h.id}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                background: h.freshness >= 80 ? '#d1fae5' : h.freshness >= 50 ? '#fef9c3' : '#fee2e2',
                color: h.freshness >= 80 ? '#065f46' : h.freshness >= 50 ? '#78350f' : '#991b1b',
                fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '3px 10px',
              }}>{h.freshness}%</span>
              {h.status === 'contested' && (
                <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>🚩 Contested</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <BlockchainPanel role={UserRole.RECEIVER} />
    </DashboardShell>
  );
}
