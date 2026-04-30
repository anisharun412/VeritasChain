import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shipment, HandoffBundle } from '@veritaschain/types';
import { useAuth } from '../../auth/AuthContext';
import { useBLEAdvertiser } from './useBLEAdvertiser';
import { HandoffSummary } from './HandoffSummary';
import { ChainSubmit } from '../../blockchain/ChainSubmit';

interface InitiateHandoffProps {
  shipment: Shipment;
  onComplete?: () => void;
}

export const InitiateHandoff: React.FC<InitiateHandoffProps> = ({ shipment, onComplete }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [fieldNotes, setFieldNotes] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const { isAdvertising, error, startAdvertise, stopAdvertise } = useBLEAdvertiser();

  // Compute a simple Merkle root from document hashes for on-chain submission
  const merkleRoot = useMemo(() => {
    const hashes = shipment.documents.map((d) => d.hash).join('');
    // Simple hex digest (in production: real Merkle tree from packages/crypto)
    const combined = hashes || shipment.id;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
  }, [shipment]);

  const createBundle = (): HandoffBundle => ({
    shipmentId: shipment.id,
    previousAnchor: shipment.handoffChain[shipment.handoffChain.length - 1]?.merkleRoot || '',
    documentHashes: shipment.documents.map(d => d.hash),
    zkTemperatureProof: 'mock-proof-' + Math.random().toString(36),
    fieldNotes: fieldNotes || undefined,
    gpsLat: 40.7128,
    gpsLng: -74.006,
    utcTimestamp: Math.floor(Date.now() / 1000),
  });

  const handleInitiate = async () => {
    navigate('/handshake');
  };

  if (!isAuthenticated) {
    return (
      <div className="alert alert-error" style={{ margin: '1rem' }}>
        🔒 Not authenticated. Please log in first.
      </div>
    );
  }

  return (
    <div className="handoff-page">
      <div className="page-title">Initiate Handoff</div>
      <div className="page-subtitle">Shipment {shipment.id} · {shipment.origin} → {shipment.destination}</div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body space-y-4">
          {/* Shipment ID (readonly) */}
          <div className="form-group">
            <label className="form-label">Shipment ID</label>
            <input className="form-input" value={shipment.id} disabled />
          </div>

          {/* Documents */}
          <div className="form-group">
            <label className="form-label">Documents to Hand Over</label>
            <div className="card" style={{ padding: '0.75rem', background: 'var(--gray-50)' }}>
              {shipment.documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ padding: '0.3rem 0' }}>
                  <span style={{ color: 'var(--emerald)' }}>✓</span>
                  <span className="font-semibold">{doc.name}</span>
                  <span className="text-xs text-mono text-gray">{doc.hash.slice(0, 10)}…</span>
                </div>
              ))}
            </div>
          </div>

          {/* Field Notes */}
          <div className="form-group">
            <label className="form-label">Field Notes (optional)</label>
            <textarea
              className="form-textarea"
              value={fieldNotes}
              onChange={e => setFieldNotes(e.target.value)}
              placeholder="e.g. One box slightly damp, slight temperature fluctuation noted"
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="flex gap-3">
            <button
              className="btn btn-ghost"
              onClick={onComplete}
            >← Back</button>
            <button
              className="btn btn-primary btn-full"
              onClick={handleInitiate}
              disabled={isAdvertising}
            >
              {isAdvertising
                ? <><span className="spinner" /> Searching for Receiver…</>
                : '📡 Start BLE Handoff'}
            </button>
          </div>
        </div>
      </div>

      {showSummary && (
        <HandoffSummary
          bundle={createBundle()}
          onConfirm={() => { onComplete?.(); }}
          onCancel={() => { setShowSummary(false); stopAdvertise(); }}
          isLoading={isAdvertising}
        />
      )}

      {/* ── Blockchain submission ───────────────────────────────── */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--gray-200)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', whiteSpace: 'nowrap', fontWeight: 600 }}>
            ⛓ RECORD ON BLOCKCHAIN
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--gray-200)' }} />
        </div>
        <ChainSubmit
          shipmentId={shipment.id}
          merkleRoot={merkleRoot}
          zkProofHash={'zk-proof-' + shipment.id + '-' + Date.now()}
          mode="send"
        />
      </div>
    </div>
  );
};
