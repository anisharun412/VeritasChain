import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRoleAccess } from '../auth/useRoleAccess';
import DashboardShell from './DashboardShell';
import BlockchainPanel from '../blockchain/BlockchainPanel';
import { UserRole } from '../auth/roles';

export default function ReceiverDashboard() {
  const { displayName, organization } = useAuth();
  const { roleDefinition, isFinalReceiver } = useRoleAccess();
  const navigate = useNavigate();

  const isHospital = (organization || '').toLowerCase().includes('hospital');

  return (
    <DashboardShell
      accentColor="#10B981"
      icon={isHospital ? '🏥' : '📦'}
      title={organization || 'Receiver'}
      subtitle={`${displayName} · ${isHospital ? 'Final Destination' : 'Warehouse'}`}
      actions={
        isFinalReceiver
          ? <span className="status-indicator status-completed">Final Chain Node</span>
          : undefined
      }
    >
      {/* Incoming shipment */}
      <div className="role-alert role-alert-emerald">
        <div style={{ flex: 1 }}>
          <div className="role-alert-label">
            {isHospital ? 'FINAL DELIVERY' : 'INCOMING SHIPMENT'}
          </div>
          <div className="role-alert-title">mRNA Vaccine Batch 47B</div>
          <div className="role-alert-sub">From: DHL Cold Chain · Expected: Today 14:30</div>
          <div style={{
            marginTop: '0.75rem',
            fontSize: '2rem',
            fontWeight: 800,
            color: '#fff',
          }}>
            Freshness: 94/100
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          {isHospital ? (
            <button
              className="btn"
              style={{ background: '#fff', color: '#065f46', fontWeight: 700 }}
              onClick={() => navigate('/handoff/receive/SHIP-001')}
            >
              ✅ Accept Final Delivery
            </button>
          ) : (
            <button
              className="btn"
              style={{ background: '#fff', color: '#065f46', fontWeight: 700 }}
              onClick={() => navigate('/handoff/receive/SHIP-001')}
            >
              📥 Accept Shipment
            </button>
          )}
        </div>
      </div>

      {/* Receive-only note */}
      <div className="alert" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)', border: '1px solid var(--gray-200)' }}>
        💡 As a <strong>Receiver</strong>, you verify the integrity of goods and sign the
        final acknowledgment on the chain. You can contest shipments if the seal or freshness fails.
      </div>

      {/* On-Chain Layer */}
      <div style={{ marginTop: '1.25rem' }}>
        <BlockchainPanel role={UserRole.RECEIVER} />
      </div>
    </DashboardShell>
  );
}
