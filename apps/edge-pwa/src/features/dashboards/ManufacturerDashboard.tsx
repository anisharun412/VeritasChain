import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRoleAccess } from '../auth/useRoleAccess';
import DashboardShell from './DashboardShell';
import BlockchainPanel from '../blockchain/BlockchainPanel';
import { UserRole } from '../auth/roles';

const SHIPMENTS = [
  {
    id: 'SHIP-001',
    product: 'mRNA Vaccine Batch 47B',
    destination: 'Mombasa General Hospital',
    status: 'ready' as const,
    freshness: 100,
    docs: 3,
  },
  {
    id: 'SHIP-002',
    product: 'mRNA Vaccine Batch 48A',
    destination: 'Nairobi Central Pharmacy',
    status: 'in-transit' as const,
    freshness: 97,
    docs: 2,
  },
  {
    id: 'SHIP-003',
    product: 'Insulin Batch 12C',
    destination: 'Dubai Cold Storage',
    status: 'completed' as const,
    freshness: 93,
    docs: 4,
  },
];

const STATUS_STYLE: Record<string, string> = {
  ready:      'status-indicator status-ready',
  'in-transit':'status-indicator status-in-transit',
  completed:  'status-indicator status-completed',
};

const STATUS_LABEL: Record<string, string> = {
  ready: 'Ready for Handoff',
  'in-transit': 'In Transit',
  completed: 'Completed',
};

export default function ManufacturerDashboard() {
  const { displayName, organization } = useAuth();
  const { roleDefinition } = useRoleAccess();
  const navigate = useNavigate();

  const stats = [
    { label: 'Active Shipments', value: '3', color: 'var(--blue)' },
    { label: 'Pending Handoffs', value: '1', color: 'var(--yellow)' },
    { label: 'Avg Freshness', value: '97', color: 'var(--emerald)' },
  ];

  return (
    <DashboardShell
      accentColor="#3B82F6"
      icon={roleDefinition?.icon || '🏭'}
      title={organization || 'Manufacturer'}
      subtitle={`${displayName} · ${roleDefinition?.label}`}
      actions={
        <button className="btn btn-primary" onClick={() => alert('Create Shipment – connect to chain')}>
          + Create Shipment
        </button>
      }
    >
      {/* Stats */}
      <div className="dash-stats">
        {stats.map((s) => (
          <div key={s.label} className="dash-stat-card" style={{ borderColor: s.color + '33' }}>
            <div className="dash-stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="dash-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Shipment table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">My Shipments</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{SHIPMENTS.length} records</span>
        </div>
        <div>
          {SHIPMENTS.map((s) => (
            <div key={s.id} className="dash-row" onClick={() => navigate(`/handoff/send/${s.id}`)}>
              <div>
                <div className="font-semibold">{s.product}</div>
                <div className="text-sm text-gray">{s.destination}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="text-xs text-mono" style={{ background: 'var(--gray-100)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                    {s.id}
                  </span>
                  <span className="freshness-badge" style={{
                    background: s.freshness >= 80 ? '#D1FAE5' : '#FEF9C3',
                    color:      s.freshness >= 80 ? '#065f46' : '#78350f',
                  }}>
                    ✓ {s.freshness}%
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span className={STATUS_STYLE[s.status]}>
                  <span className="status-dot" />{STATUS_LABEL[s.status]}
                </span>
                <div className="text-xs text-gray" style={{ marginTop: '0.4rem' }}>
                  📄 {s.docs} docs
                </div>
                {s.status === 'ready' && (
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/handoff/send/${s.id}`); }}
                  >
                    Initiate Handoff →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* On-Chain Layer */}
      <div style={{ marginTop: '1.25rem' }}>
        <BlockchainPanel role={UserRole.MANUFACTURER} />
      </div>
    </DashboardShell>
  );
}
