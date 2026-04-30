import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRoleAccess } from '../auth/useRoleAccess';
import DashboardShell from './DashboardShell';
import BlockchainPanel from '../blockchain/BlockchainPanel';
import { UserRole } from '../auth/roles';

const ALL_SHIPMENTS = [
  { id: 'SHIP-001', product: 'Vaccine Batch 47B', route: 'Pfizer → DHL → Mombasa', freshness: 94, status: 'in-transit', flags: 0, carrier: 'DHL' },
  { id: 'SHIP-002', product: 'Vaccine Batch 46C', route: 'Pfizer → DHL → Dubai', freshness: 93, status: 'completed', flags: 0, carrier: 'DHL' },
  { id: 'SHIP-003', product: 'Insulin Batch 12C', route: 'Novo Nordisk → FedEx → Nairobi', freshness: 61, status: 'contested', flags: 1, carrier: 'FedEx' },
];

const ANOMALIES = [
  { icon: '⚠️', text: 'SHIP-003: Freshness dropped 12 points on FedEx leg', time: '2 min ago', severity: 'warning' },
  { icon: '❌', text: 'SHIP-003: NFC seal broken at Dubai warehouse', time: '15 min ago', severity: 'error' },
  { icon: '⏳', text: 'SHIP-002: Missing ZK proof for last 3 hours', time: '1h ago', severity: 'warning' },
];

export default function RegulatorDashboard() {
  const { displayName, organization } = useAuth();
  const { roleDefinition, canDeepAudit, canFlagAnomaly } = useRoleAccess();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = ALL_SHIPMENTS.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search && !s.product.toLowerCase().includes(search.toLowerCase()) && !s.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = [
    { label: 'Total Tracked', value: ALL_SHIPMENTS.length, color: '#3B82F6', icon: '📊' },
    { label: 'Compliant', value: ALL_SHIPMENTS.filter((s) => s.status !== 'contested').length, color: '#10B981', icon: '✅' },
    { label: 'Flagged', value: ALL_SHIPMENTS.filter((s) => s.flags > 0).length, color: '#EF4444', icon: '🚩' },
    { label: 'Audits Today', value: 0, color: '#8B5CF6', icon: '🔍' },
  ];

  return (
    <DashboardShell
      accentColor="#EF4444"
      icon="⚖️"
      title={organization || 'Regulator'}
      subtitle={`${displayName} · ${roleDefinition?.label}`}
      actions={
        <button onClick={() => navigate('/regulator/stats')} style={{
          background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, minHeight: 36,
        }}>📊 View Analytics</button>
      }
    >
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 14, padding: '18px 16px',
            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Anomaly Feed */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
        overflow: 'hidden', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#EF4444' }}>🔴 Anomaly Feed</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Live</span>
        </div>
        {ANOMALIES.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#10B981', fontSize: 13 }}>
            ✅ No anomalies detected. All shipments compliant.
          </div>
        ) : (
          ANOMALIES.map((a, i) => (
            <div key={i} style={{
              padding: '12px 20px', borderBottom: '1px solid #f8fafc',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: a.severity === 'error' ? '#fef2f2' : 'transparent',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: a.severity === 'error' ? '#991b1b' : '#92400e' }}>{a.text}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{a.time}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Shipment Audit Table */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
        overflow: 'hidden', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>🔎 All Shipments</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID or product..."
                style={{
                  padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                  fontSize: 12, width: 180, outline: 'none', minHeight: 36,
                }} />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, minHeight: 36 }}>
                <option value="all">All Status</option>
                <option value="in-transit">In Transit</option>
                <option value="completed">Completed</option>
                <option value="contested">Contested</option>
              </select>
            </div>
          </div>
        </div>

        {filtered.map((s) => (
          <div key={s.id} style={{
            padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{s.product}</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#94a3b8', marginTop: 2 }}>{s.route}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  background: s.freshness >= 80 ? '#d1fae5' : s.freshness >= 50 ? '#fef9c3' : '#fee2e2',
                  color: s.freshness >= 80 ? '#065f46' : s.freshness >= 50 ? '#78350f' : '#991b1b',
                  fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '2px 8px',
                }}>{s.freshness}%</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>🚛 {s.carrier}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span style={{
                fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '3px 10px',
                background: s.status === 'contested' ? '#fee2e2' : s.status === 'completed' ? '#d1fae5' : '#fef9c3',
                color: s.status === 'contested' ? '#991b1b' : s.status === 'completed' ? '#065f46' : '#92400e',
              }}>{s.status}</span>
              {s.flags > 0 && <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>🚩 {s.flags} flag(s)</span>}
              <div style={{ display: 'flex', gap: 6 }}>
                {canDeepAudit && (
                  <button style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#64748b' }}
                    onClick={() => alert(`Deep Audit ${s.id}`)}>Audit</button>
                )}
                {canFlagAnomaly && s.status !== 'contested' && (
                  <button style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', color: '#EF4444', fontWeight: 600 }}
                    onClick={() => alert(`Flagging ${s.id}`)}>🚩 Flag</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <BlockchainPanel role={UserRole.REGULATOR} />
    </DashboardShell>
  );
}
