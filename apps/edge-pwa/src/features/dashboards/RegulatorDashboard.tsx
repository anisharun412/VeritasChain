import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { useRoleAccess } from '../auth/useRoleAccess';
import DashboardShell from './DashboardShell';
import BlockchainPanel from '../blockchain/BlockchainPanel';
import { UserRole } from '../auth/roles';

const ALL_SHIPMENTS = [
  { id: 'SHIP-001', product: 'Vaccine Batch 47B', route: 'Pfizer → DHL → Mombasa', freshness: 94, status: 'in-transit', flags: 0 },
  { id: 'SHIP-002', product: 'Vaccine Batch 46C', route: 'Pfizer → DHL → Dubai', freshness: 93, status: 'completed', flags: 0 },
  { id: 'SHIP-003', product: 'Insulin Batch 12C', route: 'Novo Nordisk → FedEx → Nairobi', freshness: 61, status: 'contested', flags: 1 },
];

export default function RegulatorDashboard() {
  const { displayName, organization } = useAuth();
  const { roleDefinition, canDeepAudit, canFlagAnomaly } = useRoleAccess();

  return (
    <DashboardShell
      accentColor="#EF4444"
      icon="⚖️"
      title={organization || 'Regulator'}
      subtitle={`${displayName} · ${roleDefinition?.label}`}
    >
      {/* Stats */}
      <div className="dash-stats">
        <div className="dash-stat-card" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
          <div className="dash-stat-value" style={{ color: 'var(--emerald)' }}>2</div>
          <div className="dash-stat-label">Compliant</div>
        </div>
        <div className="dash-stat-card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="dash-stat-value" style={{ color: 'var(--red)' }}>1</div>
          <div className="dash-stat-label">Flagged</div>
        </div>
        <div className="dash-stat-card" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
          <div className="dash-stat-value" style={{ color: 'var(--blue)' }}>3</div>
          <div className="dash-stat-label">Total Tracked</div>
        </div>
      </div>

      {/* All shipments audit table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">🔎 Shipment Audit — All Parties</span>
        </div>
        <div>
          {ALL_SHIPMENTS.map((s) => (
            <div key={s.id} className="dash-row">
              <div>
                <div className="font-semibold">{s.product}</div>
                <div className="text-xs text-mono text-gray">{s.route}</div>
                <div style={{ marginTop: '0.4rem' }}>
                  <span className="freshness-badge" style={{
                    background: s.freshness >= 80 ? '#D1FAE5' : s.freshness >= 50 ? '#FEF9C3' : '#FEE2E2',
                    color:      s.freshness >= 80 ? '#065f46' : s.freshness >= 50 ? '#78350f' : '#991b1b',
                  }}>
                    {s.freshness >= 80 ? '✓' : s.freshness >= 50 ? '⚠' : '✕'} {s.freshness}%
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                <span className={
                  s.status === 'contested' ? 'status-indicator status-contested' :
                  s.status === 'completed' ? 'status-indicator status-completed' :
                  'status-indicator status-in-transit'
                }>
                  <span className="status-dot" />
                  {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                </span>
                {s.flags > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--red)', fontWeight: 600 }}>
                    🚩 {s.flags} flag(s)
                  </span>
                )}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {canDeepAudit && (
                    <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                      onClick={() => alert(`Deep Audit ${s.id} — submit court order to decrypt documents`)}>
                      Deep Audit
                    </button>
                  )}
                  {canFlagAnomaly && s.status !== 'contested' && (
                    <button className="btn btn-danger" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                      onClick={() => alert(`Flagging ${s.id} for anomaly`)}>
                      🚩 Flag
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="alert" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)', border: '1px solid var(--gray-200)' }}>
        ⚖️ As a <strong>Regulator</strong>, you have read access to all shipments. Use the
        Deep Audit feature (with a court order) to decrypt encrypted documents.
      </div>

      {/* On-Chain Layer — Full Audit */}
      <div style={{ marginTop: '1.25rem' }}>
        <BlockchainPanel role={UserRole.REGULATOR} />
      </div>
    </DashboardShell>
  );
}
