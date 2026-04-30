import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRoleAccess } from '../auth/useRoleAccess';
import DashboardShell from './DashboardShell';
import BlockchainPanel from '../blockchain/BlockchainPanel';
import { UserRole } from '../auth/roles';

const SHIPMENTS = [
  { id: 'SHIP-001', product: 'mRNA Vaccine Batch 47B', destination: 'Mombasa General Hospital', status: 'ready' as const, freshness: 100, docs: 3, handoffs: 0 },
  { id: 'SHIP-002', product: 'mRNA Vaccine Batch 48A', destination: 'Nairobi Central Pharmacy', status: 'in-transit' as const, freshness: 97, docs: 2, handoffs: 1 },
  { id: 'SHIP-003', product: 'Insulin Batch 12C', destination: 'Dubai Cold Storage', status: 'completed' as const, freshness: 93, docs: 4, handoffs: 3 },
];

const STATUS_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  ready:       { bg: '#eff6ff', color: '#2563eb', dot: '#3B82F6' },
  'in-transit': { bg: '#fffbeb', color: '#92400e', dot: '#F59E0B' },
  completed:   { bg: '#f0fdf4', color: '#065f46', dot: '#10B981' },
  contested:   { bg: '#fef2f2', color: '#991b1b', dot: '#EF4444' },
};

const STATUS_LABELS: Record<string, string> = {
  ready: 'Ready for Handoff', 'in-transit': 'In Transit', completed: 'Delivered', contested: 'Contested',
};

function FreshnessBadge({ score }: { score: number }) {
  const bg = score >= 80 ? '#d1fae5' : score >= 50 ? '#fef9c3' : '#fee2e2';
  const color = score >= 80 ? '#065f46' : score >= 50 ? '#78350f' : '#991b1b';
  const icon = score >= 80 ? '✅' : score >= 50 ? '⚠️' : '❌';
  return (
    <span style={{ background: bg, color, fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {icon} {score}%
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.ready;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function ManufacturerDashboard() {
  const { displayName, organization } = useAuth();
  const { roleDefinition } = useRoleAccess();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

  const stats = [
    { label: 'Active Shipments', value: '3', color: '#3B82F6', icon: '📦' },
    { label: 'Pending Handoffs', value: '1', color: '#F59E0B', icon: '⏳' },
    { label: 'Avg Freshness', value: '97%', color: '#10B981', icon: '🌡️' },
  ];

  return (
    <DashboardShell
      accentColor="#3B82F6"
      icon={roleDefinition?.icon || '🏭'}
      title={organization || 'Manufacturer'}
      subtitle={`${displayName} · ${roleDefinition?.label}`}
      actions={
        <button onClick={() => alert('Create Shipment – coming soon')} style={{
          background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, minHeight: 36,
          boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
        }}>+ Create Shipment</button>
      }
    >
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 14, padding: '20px 18px',
            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Shipments Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>My Shipments</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{SHIPMENTS.length} records</span>
        </div>

        {SHIPMENTS.map((s) => (
          <div key={s.id}>
            <div
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              style={{
                padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                gap: 16, cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fafbfc'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a', marginBottom: 3 }}>{s.product}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{s.destination}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, color: '#64748b' }}>{s.id}</span>
                  <FreshnessBadge score={s.freshness} />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>📄 {s.docs} docs</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <StatusPill status={s.status} />
                {s.status === 'ready' && (
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/handoff/send/${s.id}`); }}
                    style={{
                      background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8,
                      padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      minHeight: 32,
                    }}>
                    Initiate Handoff →
                  </button>
                )}
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === s.id && (
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Documents</div>
                    {['Temperature Log', 'Certificate of Origin', 'Phytosanitary Cert'].slice(0, s.docs).map((d) => (
                      <div key={d} style={{ fontSize: 13, color: '#475569', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        📄 {d}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Handoff Chain</div>
                    {s.handoffs === 0 ? (
                      <div style={{ fontSize: 13, color: '#94a3b8' }}>No handoffs yet</div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#475569' }}>{s.handoffs} handoff(s) recorded</div>
                    )}
                    <button onClick={() => navigate('/tracking')} style={{
                      marginTop: 8, background: 'transparent', border: '1px solid #e2e8f0',
                      borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                      color: '#3B82F6', fontWeight: 500,
                    }}>🌍 View on Map</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Blockchain Panel */}
      <div style={{ marginTop: 20 }}>
        <BlockchainPanel role={UserRole.MANUFACTURER} />
      </div>
    </DashboardShell>
  );
}
