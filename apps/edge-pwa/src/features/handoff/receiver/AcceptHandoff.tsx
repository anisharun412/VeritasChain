import React, { useState } from 'react';
import { Shipment } from '@veritaschain/types';
import { useNFCReader } from './useNFCReader';
import { NFCTapPrompt } from './NFCTapPrompt';
import { SealVerification } from './SealVerification';

interface AcceptHandoffProps {
  shipment: Shipment;
  onComplete?: () => void;
}

export const AcceptHandoff: React.FC<AcceptHandoffProps> = ({ shipment, onComplete }) => {
  const { isScanning, nfcData, error, scan, stop } = useNFCReader();
  const [verifiedSeal, setVerifiedSeal] = useState(false);
  const [showNFCPrompt, setShowNFCPrompt] = useState(false);
  const [contested, setContested] = useState(false);
  const [contestReason, setContestReason] = useState('');

  const handleScan = async () => {
    setShowNFCPrompt(true);
    await scan();
  };

  const verifySeal = () => {
    if (nfcData) setVerifiedSeal(true);
  };

  const handleContest = () => {
    if (!contestReason.trim()) return;
    alert(`Handoff contested: "${contestReason}"\n\nContested bundle would be submitted to chain.`);
    onComplete?.();
  };

  return (
    <div className="handoff-page">
      <div className="page-title">Accept Handoff</div>
      <div className="page-subtitle">Shipment {shipment.id} · {shipment.origin} → {shipment.destination}</div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body space-y-4">
          {/* Shipment details */}
          <div className="form-group">
            <label className="form-label">Shipment ID</label>
            <input className="form-input" value={shipment.id} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">Route</label>
            <input className="form-input" value={`${shipment.origin} → ${shipment.destination}`} disabled />
          </div>

          {/* Step 1: Seal verification */}
          <div className="border-top">
            <div className="handoff-step">
              <div className={`handoff-step-num ${verifiedSeal ? 'done' : ''}`}>1</div>
              <div className="handoff-step-text">Verify NFC Seal</div>
            </div>

            {!nfcData ? (
              <button className="btn btn-primary btn-full" onClick={handleScan}>
                📱 Tap to Scan NFC Seal
              </button>
            ) : (
              <>
                <SealVerification nfcData={nfcData} isValid={verifiedSeal} />
                {!verifiedSeal && (
                  <button
                    className="btn btn-success btn-full"
                    style={{ marginTop: '0.75rem' }}
                    onClick={verifySeal}
                  >
                    ✓ Verify Seal
                  </button>
                )}
              </>
            )}
          </div>

          {/* Step 2: Documents */}
          {verifiedSeal && (
            <div className="border-top">
              <div className="handoff-step">
                <div className="handoff-step-num done">2</div>
                <div className="handoff-step-text">Review Documents</div>
              </div>
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
          )}

          {/* Step 3: Sign or Contest */}
          {verifiedSeal && (
            <div className="border-top">
              <div className="handoff-step">
                <div className="handoff-step-num">3</div>
                <div className="handoff-step-text">Co-Sign or Contest</div>
              </div>

              {!contested ? (
                <div className="flex gap-3">
                  <button
                    className="btn btn-danger"
                    onClick={() => setContested(true)}
                  >
                    ⚠ Contest
                  </button>
                  <button
                    className="btn btn-success btn-full"
                    onClick={onComplete}
                  >
                    ✍ Accept & Co-Sign
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="alert alert-warning">
                    ⚠ You are contesting this handoff. Provide a mandatory reason.
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contest Reason *</label>
                    <textarea
                      className="form-textarea"
                      value={contestReason}
                      onChange={e => setContestReason(e.target.value)}
                      placeholder="e.g. Temperature proof failed — 3 readings out of range"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button className="btn btn-ghost" onClick={() => setContested(false)}>
                      ← Back
                    </button>
                    <button
                      className="btn btn-danger btn-full"
                      onClick={handleContest}
                      disabled={!contestReason.trim()}
                    >
                      Submit Contest
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
        </div>
      </div>

      {showNFCPrompt && (
        <NFCTapPrompt
          isScanning={isScanning}
          onCancel={() => { setShowNFCPrompt(false); stop(); }}
        />
      )}
    </div>
  );
};
