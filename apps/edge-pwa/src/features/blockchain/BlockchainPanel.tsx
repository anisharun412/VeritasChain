import React, { useState, useEffect } from 'react';
import { useMetaMask } from './useMetaMask';
import { useContract, SHIPMENT_STATUS_LABELS } from './useContract';
import { contracts, allDeployed } from './contractABI';
import { UserRole } from '../auth/roles';
import { ethers } from 'ethers';

interface BlockchainPanelProps {
  role: UserRole;
}

// ─── Shared: Contract status grid ───────────────────────────────────

function ContractStatusGrid() {
  const items = Object.values(contracts);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
      {items.map((c) => (
        <div key={c.name} style={{
          background: c.deployed ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${c.deployed ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 12, padding: '12px 16px',
        }}>
          <div style={{ fontSize: 13, color: c.deployed ? '#065f46' : '#991b1b', fontWeight: 700, marginBottom: 4 }}>
            {c.deployed ? '✅' : '❌'} {c.name}
          </div>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.deployed ? c.address.slice(0, 14) + '…' : 'Not deployed'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Manufacturer: Register Shipment Form ───────────────────────────

function RegisterShipmentForm() {
  const { registerShipment, isSubmitting, error, lastTx, clearError } = useContract();
  const [did, setDid] = useState('did:ethr:0xManufacturer');
  const [submitted, setSubmitted] = useState(false);
  const [shipmentId, setShipmentId] = useState('');

  const handleRegister = async () => {
    clearError();
    const metaHash = ethers.hexlify(ethers.randomBytes(32));
    const sealFP = ethers.hexlify(ethers.randomBytes(32));
    const result = await registerShipment(metaHash, did, sealFP);
    if (result) {
      setShipmentId(result.shipmentId);
      setSubmitted(true);
    }
  };

  if (submitted && lastTx) {
    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 800, color: '#065f46', marginBottom: 12, fontSize: 15 }}>✅ Shipment Registered On-Chain</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <div><span style={{ color: '#64748b' }}>Shipment ID: </span><code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>{shipmentId.slice(0, 18)}…</code></div>
          <div><span style={{ color: '#64748b' }}>Tx Hash: </span><code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>{lastTx.txHash.slice(0, 18)}…</code></div>
          <div><span style={{ color: '#64748b' }}>Block: </span>#{lastTx.blockNumber} <span style={{ color: '#64748b', marginLeft: 8 }}>Gas: </span>{lastTx.gasUsed}</div>
        </div>
        <button onClick={() => setSubmitted(false)} style={{ marginTop: 16, background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
          Register Another
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#0f172a' }}>📝 Register New Shipment</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          value={did} onChange={(e) => setDid(e.target.value)} placeholder="Registrar DID"
          style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
        />
        <button onClick={handleRegister} disabled={isSubmitting || !did.trim()} style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14, opacity: isSubmitting ? 0.7 : 1 }}>
          {isSubmitting ? '⏳ Sending…' : '⛓ Register on Ganache'}
        </button>
      </div>
      {error && <div style={{ color: '#EF4444', fontSize: 13, marginTop: 8, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>⚠ {error}</div>}
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>Generates random SPHINCS+ meta hash & NFC seal fingerprint for demo.</div>
    </div>
  );
}

// ─── Shared: Freshness Lookup ───────────────────────────────────────

function FreshnessLookup() {
  const { getFreshnessScore, isSubmitting, error } = useContract();
  const [shipmentId, setShipmentId] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [lookupDone, setLookupDone] = useState(false);

  const lookup = async () => {
    if (!shipmentId.trim()) return;
    const s = await getFreshnessScore(shipmentId);
    setScore(s);
    setLookupDone(true);
  };

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#0f172a' }}>📊 Freshness Score Lookup</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          value={shipmentId} onChange={(e) => { setShipmentId(e.target.value); setLookupDone(false); }} placeholder="Shipment ID (0x…)"
          style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', outline: 'none' }}
        />
        <button onClick={lookup} style={{ background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          🔍 Lookup
        </button>
      </div>
      {lookupDone && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: score !== null ? '#f0fdf4' : '#fef2f2', border: `1px solid ${score !== null ? '#bbf7d0' : '#fecaca'}`, borderRadius: 12 }}>
          {score !== null ? (
            <div style={{ fontWeight: 800, color: score >= 80 ? '#065f46' : score >= 50 ? '#78350f' : '#991b1b', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              {score <= 30 ? '🚨' : score >= 80 ? '✅' : '⚠️'} Score: {score}/100 
            </div>
          ) : (
            <div style={{ color: '#991b1b', fontSize: 13, fontWeight: 600 }}>Not found or not initialized</div>
          )}
        </div>
      )}
      {error && <div style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>⚠ {error}</div>}
    </div>
  );
}

// ─── Regulator: Full audit view ─────────────────────────────────────

function ShipmentAuditLookup() {
  const { getShipment, getShipmentCount } = useContract();
  const [shipmentId, setShipmentId] = useState('');
  const [shipment, setShipment] = useState<any>(null);
  const [count, setCount] = useState<number | null>(null);
  const [lookupDone, setLookupDone] = useState(false);

  useEffect(() => { getShipmentCount().then(setCount); }, [getShipmentCount]);

  const lookup = async () => {
    if (!shipmentId.trim()) return;
    const s = await getShipment(shipmentId);
    setShipment(s);
    setLookupDone(true);
  };

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
        🔎 On-Chain Shipment Audit
        {count !== null && <span style={{ fontWeight: 600, color: '#64748b', fontSize: 13, background: '#f1f5f9', padding: '2px 8px', borderRadius: 999 }}>{count} total registered</span>}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          value={shipmentId} onChange={(e) => { setShipmentId(e.target.value); setLookupDone(false); }} placeholder="Shipment ID (0x…)"
          style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', outline: 'none' }}
        />
        <button onClick={lookup} style={{ background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          🔍 Audit
        </button>
      </div>
      {lookupDone && shipment && (
        <div style={{ marginTop: 16, padding: 20, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Status', SHIPMENT_STATUS_LABELS[shipment.status] || 'Unknown'],
                ['Registrar', shipment.registrar],
                ['DID', shipment.registrarDid],
                ['Registered', new Date(shipment.registeredAt * 1000).toLocaleString()],
                ['Meta Hash', shipment.sphincsPqMetaHash.slice(0, 24) + '…'],
                ['Seal FP', shipment.nfcSealFingerprint.slice(0, 24) + '…'],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 0', color: '#64748b', whiteSpace: 'nowrap', width: 120 }}>{k}</td>
                  <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a', fontFamily: k === 'DID' || k === 'Meta Hash' || k === 'Seal FP' || k === 'Registrar' ? 'monospace' : undefined }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lookupDone && !shipment && <div style={{ marginTop: 16, color: '#EF4444', fontSize: 13, background: '#fef2f2', padding: '12px 16px', borderRadius: 12 }}>Shipment not found on-chain.</div>}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────

export default function BlockchainPanel({ role }: BlockchainPanelProps) {
  const { isConnected, isGanache, connect } = useMetaMask();

  if (!isConnected || !isGanache) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>⛓ On-Chain Layer</span>
        </div>
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🦊</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>
            {!isConnected ? 'Connect MetaMask' : 'Switch to Ganache Network'}
          </div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Required for on-chain shipment registration, handoff verification, and freshness scoring.
          </div>
          <button onClick={connect} style={{ background: '#F6851B', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 12px rgba(246,133,27,0.3)' }}>
            🦊 {isConnected ? 'Switch to Ganache' : 'Connect MetaMask'}
          </button>
        </div>
      </div>
    );
  }

  if (!allDeployed) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>⛓ On-Chain Layer</span>
        </div>
        <div style={{ padding: 24 }}>
          <ContractStatusGrid />
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 12 }}>⚠ Contracts not fully deployed.</div>
            <pre style={{ background: '#1e293b', color: '#f8fafc', padding: 16, borderRadius: 8, fontSize: 12, overflowX: 'auto', marginBottom: 12 }}>
{`cd contracts/foundry
forge script script/Deploy.s.sol \\
  --rpc-url http://127.0.0.1:7545 \\
  --private-key <GANACHE_PRIVATE_KEY> \\
  --broadcast`}
            </pre>
            <div style={{ fontSize: 13, color: '#92400e' }}>
              Then add addresses to <code style={{ background: 'rgba(255,255,255,0.5)', padding: '2px 6px', borderRadius: 4 }}>apps/edge-pwa/.env.local</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>⛓ On-Chain Layer — {getRoleTitle(role)}</span>
        <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>Live on Ganache</span>
      </div>
      <div style={{ padding: 32 }}>
        <ContractStatusGrid />

        {role === UserRole.MANUFACTURER && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <RegisterShipmentForm />
            <div style={{ height: 1, background: '#e2e8f0' }} />
            <FreshnessLookup />
          </div>
        )}

        {role === UserRole.CARRIER && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <FreshnessLookup />
            <div style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: 12, padding: 16, fontSize: 13, lineHeight: 1.5 }}>
              <span style={{ fontSize: 18, marginRight: 8 }}>🚛</span> As a carrier, handoff signatures are submitted automatically when you complete the physical handoff flow. You can look up any shipment's on-chain freshness score here.
            </div>
          </div>
        )}

        {role === UserRole.RECEIVER && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <FreshnessLookup />
            <div style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 12, padding: 16, fontSize: 13, lineHeight: 1.5 }}>
              <span style={{ fontSize: 18, marginRight: 8 }}>📦</span> After accepting a handoff, the dual-witness signatures are anchored on-chain. If the seal or temperature data fails verification, use the Contest button to flag the handoff.
            </div>
          </div>
        )}

        {role === UserRole.REGULATOR && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <ShipmentAuditLookup />
            <div style={{ height: 1, background: '#e2e8f0' }} />
            <FreshnessLookup />
            <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 12, padding: 16, fontSize: 13, lineHeight: 1.5 }}>
              <span style={{ fontSize: 18, marginRight: 8 }}>⚖️</span> Full read access to all on-chain records. Use the Deep Audit feature to query handoff history, contested shipments, and freshness score trends.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getRoleTitle(role: UserRole): string {
  switch (role) {
    case UserRole.MANUFACTURER: return 'Manufacturer Operations';
    case UserRole.CARRIER:      return 'Carrier Monitoring';
    case UserRole.RECEIVER:     return 'Receiver Verification';
    case UserRole.REGULATOR:    return 'Regulatory Audit';
    default: return 'Blockchain';
  }
}
