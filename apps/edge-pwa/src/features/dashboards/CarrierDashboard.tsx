import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRoleAccess } from '../auth/useRoleAccess';
import DashboardShell from './DashboardShell';
import BlockchainPanel from '../blockchain/BlockchainPanel';
import { UserRole } from '../auth/roles';

export default function CarrierDashboard() {
  const { displayName, organization } = useAuth();
  const { roleDefinition } = useRoleAccess();
  const navigate = useNavigate();

  return (
    <DashboardShell
      accentColor="#F59E0B"
      icon="🚛"
      title={organization || 'Carrier'}
      subtitle={`${displayName} · ${roleDefinition?.label}`}
    >
      {/* ── Incoming Handoff Alert ── */}
      <div style={{
        background: 'linear-gradient(135deg, #92400e, #b45309)',
        borderRadius: 14, padding: 24, marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 20, flexWrap: 'wrap', boxShadow: '0 4px 16px rgba(146,64,14,0.25)',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
            INCOMING HANDOFF
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Vaccine Batch 47B</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>From: Pfizer Belgium → Your Truck</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            <span>🌡️ 4.1°C</span>
            <span>✅ 100% Freshness</span>
            <span>📄 3 docs</span>
          </div>
        </div>
        <button onClick={() => navigate('/handoff/receive/SHIP-001')} style={{
          background: '#fff', color: '#92400e', border: 'none', borderRadius: 10,
          padding: '12px 24px', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minHeight: 48,
          transition: 'transform 0.15s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
        >📥 Accept Handoff</button>
      </div>

      {/* ── Active Transport Card ── */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
        overflow: 'hidden', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Active Transport — Your Load</span>
          <span style={{
            background: '#fffbeb', color: '#92400e', fontSize: 12, fontWeight: 600,
            borderRadius: 999, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block', animation: 'vc-pulse-ring 2s infinite' }} />
            In Transit
          </span>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Vaccine Batch 46C</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>Your Truck → Dubai Cold Storage</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>94%</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Freshness</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#3B82F6' }}>4.2°C</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                Temperature <span style={{ color: '#10B981' }}>→</span>
              </div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#F59E0B' }}>2h 40m</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>ETA</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/handoff/send/SHIP-003')} style={{
              background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              minHeight: 44,
            }}>🚀 Initiate Next Handoff</button>
            <button onClick={() => navigate('/tracking')} style={{
              background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '10px 20px', fontSize: 13, cursor: 'pointer', color: '#64748b',
              minHeight: 44,
            }}>🌍 View on Map</button>
          </div>
        </div>
      </div>

      {/* Info note */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
        padding: '14px 18px', fontSize: 13, color: '#1d4ed8', marginBottom: 20,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <span>💡</span>
        <div>As a <strong>Carrier</strong>, you are the bridge — accept handoffs from manufacturers and initiate handoffs to the next destination.</div>
      </div>

      <BlockchainPanel role={UserRole.CARRIER} />
    </DashboardShell>
  );
}
