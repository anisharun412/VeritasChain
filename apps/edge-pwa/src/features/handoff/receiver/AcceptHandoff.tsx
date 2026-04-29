import React, { useState, useEffect } from 'react';
import { Shipment } from '@veritaschain/types';
import { useNFCReader } from './useNFCReader';
import { useBLEReceiver } from './useBLEReceiver';
import { NFCTapPrompt } from './NFCTapPrompt';
import { SealVerification } from './SealVerification';
import { ChainSubmit } from '../../blockchain/ChainSubmit';

interface AcceptHandoffProps {
  shipment: Shipment;
  onComplete?: () => void;
}

export const AcceptHandoff: React.FC<AcceptHandoffProps> = ({ shipment, onComplete }) => {
  const { isScanning: isNFCScanning, nfcData, error: nfcError, scan: scanNFC, stop: stopNFC } = useNFCReader();
  const { isScanning: isBLEScanning, error: bleError, receivedBundle, startScan: startBLEScan, stopScan: stopBLEScan } = useBLEReceiver();
  
  const [verifiedSeal, setVerifiedSeal] = useState(false);
  const [showNFCPrompt, setShowNFCPrompt] = useState(false);
  const [contested, setContested] = useState(false);
  const [contestReason, setContestReason] = useState('');
  const [simulatedMode, setSimulatedMode] = useState(false);

  // Auto-verify if BLE bundle received
  useEffect(() => {
    if (receivedBundle && receivedBundle.shipmentId === shipment.id) {
      setVerifiedSeal(true);
      setShowNFCPrompt(false);
    }
  }, [receivedBundle, shipment.id]);

  const handleNFCScan = async () => {
    setShowNFCPrompt(true);
    await scanNFC();
  };

  const handleBLEScan = async () => {
    await startBLEScan();
  };

  const handleSimulate = () => {
    setSimulatedMode(true);
    setVerifiedSeal(true);
  };

  const verifySeal = () => {
    if (nfcData || simulatedMode) setVerifiedSeal(true);
  };

  const handleContest = () => {
    if (!contestReason.trim()) return;
    alert(`Handoff contested: "${contestReason}"\n\nContested bundle would be submitted to chain.`);
    onComplete?.();
  };

  const displayError = nfcError || bleError;

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

          {/* Step 1: Physical Handshake verification */}
          <div className="border-top">
            <div className="handoff-step">
              <div className={`handoff-step-num ${verifiedSeal ? 'done' : ''}`}>1</div>
              <div className="handoff-step-text">Verify Physical Handshake</div>
            </div>

            {!verifiedSeal ? (
              <div className="flex flex-col gap-3">
                <button className="btn btn-primary btn-full" onClick={handleNFCScan}>
                  📱 Tap to Scan NFC Seal
                </button>
                <button 
                  className="btn btn-outline btn-full" 
                  onClick={handleBLEScan}
                  disabled={isBLEScanning}
                  style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'var(--blue)' }}
                >
                  {isBLEScanning ? <><span className="spinner"/> Listening for Sender BLE...</> : '📡 Listen for BLE Handoff'}
                </button>
                
                {/* Hackathon Demo Button */}
                <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                  <button onClick={handleSimulate} style={{
                    background: 'transparent', border: '1px dashed var(--gray-400)',
                    color: 'var(--gray-500)', fontSize: '0.75rem', padding: '0.4rem 1rem',
                    borderRadius: '4px', cursor: 'pointer'
                  }}>
                    🧪 Simulate Physical Connection (Demo Mode)
                  </button>
                </div>
              </div>
            ) : (
              <>
                {(nfcData || simulatedMode || receivedBundle) && (
                  <div className="seal-valid mb-3">
                    <span className="seal-icon">✅</span>
                    <div>
                      <div className="font-semibold" style={{ color: '#065f46' }}>Handshake Verified</div>
                      <div className="text-xs text-gray" style={{ marginTop: '0.2rem' }}>
                        Method: {simulatedMode ? 'Demo Simulation' : receivedBundle ? 'BLE P2P Protocol' : 'NFC Hardware Seal'}
                      </div>
                    </div>
                  </div>
                )}
                
                {!nfcData && !simulatedMode && !receivedBundle && (
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
                    onClick={() => {
                      alert('Handoff completed successfully!');
                      onComplete?.();
                    }}
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

          {displayError && <div className="alert alert-error">{displayError}</div>}
        </div>
      </div>

      {showNFCPrompt && (
        <NFCTapPrompt
          isScanning={isNFCScanning}
          onCancel={() => { setShowNFCPrompt(false); stopNFC(); }}
        />
      )}
      
      {verifiedSeal && !contested && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--gray-200)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', whiteSpace: 'nowrap', fontWeight: 600 }}>
              ⛓ BLOCKCHAIN CO-SIGNATURE
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--gray-200)' }} />
          </div>
          <ChainSubmit
            shipmentId={shipment.id}
            merkleRoot={'0xMockRoot'}
            zkProofHash={'zk-proof-' + shipment.id}
            mode="receive"
          />
        </div>
      )}
    </div>
  );
};
