import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRoleAccess } from '../auth/useRoleAccess';
import DashboardShell from './DashboardShell';

export default function CarrierDashboard() {
  const { displayName, organization } = useAuth();
  const { roleDefinition, isSender, isReceiver } = useRoleAccess();
  const navigate = useNavigate();

  return (
    <DashboardShell
      accentColor="#F59E0B"
      icon="🚛"
      title={organization || 'Carrier'}
      subtitle={`${displayName} · ${roleDefinition?.label}`}
      actions={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isReceiver && (
            <span className="status-indicator status-completed">Can Accept Handoffs</span>
          )}
          {isSender && (
            <span className="status-indicator status-in-transit">Can Initiate Handoffs</span>
          )}
        </div>
      }
    >
      {/* Incoming handoff alert */}
      <div className="role-alert role-alert-amber">
        <div style={{ flex: 1 }}>
          <div className="role-alert-label">INCOMING HANDOFF</div>
          <div className="role-alert-title">Vaccine Batch 47B</div>
          <div className="role-alert-sub">From: Pfizer Belgium → Your Truck</div>
          <div style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
            Freshness: 100/100 · Temp: 4.1°C · 3 docs attached
          </div>
        </div>
        <button
          className="btn"
          style={{ background: '#fff', color: '#92400e', fontWeight: 700, flexShrink: 0 }}
          onClick={() => navigate('/handoff/receive/SHIP-001')}
        >
          📥 Accept (Receive Mode)
        </button>
      </div>

      {/* In-transit shipment */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">In Transit — Your Load</span>
          <span className="status-indicator status-in-transit">
            <span className="status-dot" />In Transit
          </span>
        </div>
        <div className="card-body">
          <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>Vaccine Batch 46C</div>
          <div className="text-sm text-gray" style={{ marginBottom: '0.75rem' }}>
            From: Your Truck → To: Dubai Cold Storage
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span className="freshness-badge freshness-green">✓ 94%</span>
            <span className="text-sm text-gray">🌡 4.2°C avg</span>
            <span className="text-sm text-gray">⏱ 2h 40m remaining</span>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/handoff/send/SHIP-003')}
          >
            🚀 Initiate Next Handoff (Sender Mode)
          </button>
        </div>
      </div>

      {/* Carrier capability note */}
      <div className="alert" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)', border: '1px solid var(--gray-200)' }}>
        💡 As a <strong>Carrier</strong>, you are the bridge in the chain — you can both
        accept handoffs from manufacturers and initiate handoffs to the next destination.
      </div>
    </DashboardShell>
  );
}
