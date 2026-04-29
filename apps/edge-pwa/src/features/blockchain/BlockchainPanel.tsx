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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
      {items.map((c) => (
        <div key={c.name} style={{
          background: c.deployed ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${c.deployed ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: '0.5rem', padding: '0.6rem 0.75rem',
        }}>
          <div style={{ fontSize: '0.7rem', color: c.deployed ? '#065f46' : '#991b1b', fontWeight: 600 }}>
            {c.deployed ? '✓' : '✕'} {c.name}
          </div>
          <div style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: '#6b7280', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.deployed ? c.address.slice(0, 10) + '…' : 'Not deployed'}
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
    // Generate deterministic hashes from random bytes for demo
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
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '1rem' }}>
        <div style={{ fontWeight: 700, color: '#065f46', marginBottom: '0.5rem' }}>✅ Shipment Registered On-Chain</div>
        <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
          <span style={{ color: '#6b7280' }}>Shipment ID: </span>
          <code style={{ fontSize: '0.7rem', background: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>{shipmentId.slice(0, 18)}…</code>
        </div>
        <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
          <span style={{ color: '#6b7280' }}>Tx: </span>
          <code style={{ fontSize: '0.7rem' }}>{lastTx.txHash.slice(0, 18)}…</code>
        </div>
        <div style={{ fontSize: '0.75rem' }}>
          <span style={{ color: '#6b7280' }}>Block: </span>#{lastTx.blockNumber} · Gas: {lastTx.gasUsed}
        </div>
        <button onClick={() => setSubmitted(false)}
          style={{ marginTop: '0.5rem', fontSize: '0.75rem', background: '#059669', color: '#fff', border: 'none', borderRadius: '0.35rem', padding: '0.35rem 0.75rem', cursor: 'pointer' }}>
          Register Another
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>📝 Register New Shipment</div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          value={did}
          onChange={(e) => setDid(e.target.value)}
          placeholder="Registrar DID"
          style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.35rem', fontSize: '0.8rem' }}
        />
        <button
          onClick={handleRegister}
          disabled={isSubmitting || !did.trim()}
          className="btn btn-primary"
          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
        >
          {isSubmitting ? <>⏳ Sending…</> : '⛓ Register on Ganache'}
        </button>
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.4rem' }}>⚠ {error}</div>}
      <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.35rem' }}>
        Generates random SPHINCS+ meta hash & NFC seal fingerprint for demo.
      </div>
    </div>
  );
}

// ─── Shared: Freshness Lookup ───────────────────────────────────────

function FreshnessLookup() {
  const { getFreshnessScore, initializeFreshness, isSubmitting, error } = useContract();
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
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>📊 Freshness Score Lookup</div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          value={shipmentId}
          onChange={(e) => { setShipmentId(e.target.value); setLookupDone(false); }}
          placeholder="Shipment ID (0x…)"
          style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.35rem', fontSize: '0.8rem', fontFamily: 'monospace' }}
        />
        <button onClick={lookup} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
          🔍 Lookup
        </button>
      </div>
      {lookupDone && (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: score !== null ? '#f0fdf4' : '#fef2f2', border: `1px solid ${score !== null ? '#bbf7d0' : '#fecaca'}`, borderRadius: '0.35rem' }}>
          {score !== null ? (
            <span style={{ fontWeight: 700, color: score >= 80 ? '#065f46' : score >= 50 ? '#78350f' : '#991b1b' }}>
              Score: {score}/100 {score <= 30 ? '🚨 CRITICAL' : score >= 80 ? '✅' : '⚠️'}
            </span>
          ) : (
            <span style={{ color: '#991b1b', fontSize: '0.8rem' }}>Not found or not initialized</span>
          )}
        </div>
      )}
      {error && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.4rem' }}>⚠ {error}</div>}
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
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        🔎 On-Chain Shipment Audit
        {count !== null && <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '0.5rem' }}>({count} total registered)</span>}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          value={shipmentId}
          onChange={(e) => { setShipmentId(e.target.value); setLookupDone(false); }}
          placeholder="Shipment ID (0x…)"
          style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.35rem', fontSize: '0.8rem', fontFamily: 'monospace' }}
        />
        <button onClick={lookup} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
          🔍 Audit
        </button>
      </div>
      {lookupDone && shipment && (
        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
          <table style={{ width: '100%', fontSize: '0.78rem' }}>
            <tbody>
              {[
                ['Status', SHIPMENT_STATUS_LABELS[shipment.status] || 'Unknown'],
                ['Registrar', shipment.registrar],
                ['DID', shipment.registrarDid],
                ['Registered At', new Date(shipment.registeredAt * 1000).toLocaleString()],
                ['Meta Hash', shipment.sphincsPqMetaHash.slice(0, 18) + '…'],
                ['Seal FP', shipment.nfcSealFingerprint.slice(0, 18) + '…'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '0.3rem 0.5rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{k}</td>
                  <td style={{ padding: '0.3rem 0.5rem', fontWeight: 500, wordBreak: 'break-all', fontFamily: k === 'DID' || k === 'Meta Hash' || k === 'Seal FP' || k === 'Registrar' ? 'monospace' : undefined, fontSize: k === 'Registrar' ? '0.7rem' : undefined }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lookupDone && !shipment && (
        <div style={{ marginTop: '0.5rem', color: '#991b1b', fontSize: '0.8rem' }}>Shipment not found on-chain.</div>
      )}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────

export default function BlockchainPanel({ role }: BlockchainPanelProps) {
  const { isConnected, isGanache, connect } = useMetaMask();

  // Not connected prompt
  if (!isConnected || !isGanache) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">⛓ On-Chain Layer</span>
        </div>
        <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🦊</div>
          <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>
            {!isConnected ? 'Connect MetaMask to interact with the blockchain' : 'Switch to Ganache network (Chain ID 1337)'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>
            Required for on-chain shipment registration, handoff verification, and freshness scoring.
          </div>
          <button className="btn btn-primary" onClick={connect} style={{ background: '#F6851B' }}>
            🦊 Connect MetaMask
          </button>
        </div>
      </div>
    );
  }

  // Not deployed prompt
  if (!allDeployed) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">⛓ On-Chain Layer</span>
        </div>
        <div className="card-body">
          <ContractStatusGrid />
          <div className="alert alert-warning">
            ⚠ Contracts not fully deployed. Run the deployment script:
            <pre style={{ marginTop: '0.5rem', fontSize: '0.75rem', background: '#1f2937', color: '#e2e8f0', padding: '0.5rem 0.75rem', borderRadius: '0.35rem', overflowX: 'auto' }}>
{`cd contracts/foundry
forge script script/Deploy.s.sol \\
  --rpc-url http://127.0.0.1:7545 \\
  --private-key <GANACHE_PRIVATE_KEY> \\
  --broadcast`}
            </pre>
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Then add addresses to <code>apps/edge-pwa/.env.local</code>:
              <br /><code>VITE_REGISTRY_ADDRESS=0x…</code>
              <br /><code>VITE_DWH_ADDRESS=0x…</code>
              <br /><code>VITE_FRESHNESS_ADDRESS=0x…</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Role-specific content ──────────────────────────────────────

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">⛓ On-Chain Layer — {getRoleTitle(role)}</span>
        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#D1FAE5', color: '#065f46', borderRadius: '9999px', fontWeight: 600 }}>
          Live on Ganache
        </span>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <ContractStatusGrid />

        {/* Manufacturer: register + freshness */}
        {role === UserRole.MANUFACTURER && (
          <>
            <RegisterShipmentForm />
            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb' }} />
            <FreshnessLookup />
          </>
        )}

        {/* Carrier: freshness lookup (they monitor in-transit) */}
        {role === UserRole.CARRIER && (
          <>
            <FreshnessLookup />
            <div className="alert" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>
              🚛 As a carrier, handoff signatures are submitted automatically when you complete the physical handoff flow.
              You can look up any shipment's on-chain freshness score here.
            </div>
          </>
        )}

        {/* Receiver: freshness + contest info */}
        {role === UserRole.RECEIVER && (
          <>
            <FreshnessLookup />
            <div className="alert" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd' }}>
              📦 After accepting a handoff, the dual-witness signatures are anchored on-chain.
              If the seal or temperature data fails verification, use the Contest button to flag the handoff.
            </div>
          </>
        )}

        {/* Regulator: full audit + freshness + shipment count */}
        {role === UserRole.REGULATOR && (
          <>
            <ShipmentAuditLookup />
            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb' }} />
            <FreshnessLookup />
            <div className="alert" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}>
              ⚖️ Full read access to all on-chain records. Use the Deep Audit feature to query
              handoff history, contested shipments, and freshness score trends.
            </div>
          </>
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
