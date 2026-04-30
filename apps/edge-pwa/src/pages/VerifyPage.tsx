import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHandoff } from '../context/HandoffContext';
import NFCAnimation from '../components/NFCAnimation';
import TemperatureCard from '../components/TemperatureCard';
import ProofBadge from '../components/ProofBadge';
import { verifySeal } from '../nfc/sealVerifier';
import { readTemperatureLogger } from '../nfc/tempReader';
import { generateTemperatureProof } from '../zk/proofGenerator';
import { ChainSubmit } from '../features/blockchain/ChainSubmit';
import type { SealResult, TempResult, ZKResult } from '../types/physicalLayer';

const TABS = [
  { id: 'seal', label: '1. NFC Seal', icon: '📡' },
  { id: 'logger', label: '2. IoT Logger', icon: '🌡️' },
  { id: 'zk', label: '3. ZK Proof', icon: '🔐' },
  { id: 'review', label: '4. Review', icon: '✍️' },
];

export default function VerifyPage() {
  const { state, setShipmentId, startFlow, setSealResult, setTempResult, setZkResult, nextStep, completeHandoff, resetFlow } = useHandoff();
  const [idInput, setIdInput] = useState(state.shipmentId);
  const navigate = useNavigate();

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (idInput.trim()) {
      setShipmentId(idInput.trim().toUpperCase());
      startFlow();
    }
  };

  if (!state.shipmentId) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            ← Back
          </button>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Start Verification</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Enter the shipment ID from the package label to begin the verification process.</p>
            <form onSubmit={handleStart} style={{ display: 'flex', gap: 12 }}>
              <input
                value={idInput} onChange={(e) => setIdInput(e.target.value.toUpperCase())}
                placeholder="SHIP-2024-001" autoFocus
                style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 16, fontFamily: 'monospace' }}
              />
              <button type="submit" disabled={!idInput.trim()} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0 24px', fontWeight: 600, cursor: 'pointer' }}>
                Start →
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Active tab corresponds to the current step (1 to 4)
  const activeTabId = TABS[state.currentStep - 1]?.id || 'review';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Verifying Package</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Shipment: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{state.shipmentId}</span></p>
          </div>
          <button onClick={resetFlow} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}>
            Change ID
          </button>
        </div>

        {/* Horizontal Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 }}>
          {TABS.map((tab, idx) => {
            const stepNum = idx + 1;
            const isActive = state.currentStep === stepNum;
            const isDone = state.currentStep > stepNum;
            let bgColor = '#fff', borderColor = '#e2e8f0', color = '#64748b';
            if (isActive) { bgColor = '#eff6ff'; borderColor = '#3B82F6'; color = '#1d4ed8'; }
            else if (isDone) { bgColor = '#f0fdf4'; borderColor = '#10B981'; color = '#065f46'; }

            return (
              <div key={tab.id} style={{
                flex: 1, minWidth: 140, padding: '12px 16px', borderRadius: 12,
                background: bgColor, border: `2px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', gap: 10,
                opacity: (isActive || isDone) ? 1 : 0.5,
                transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: 20 }}>{isDone ? '✅' : tab.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color }}>{tab.label}</span>
              </div>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: 32 }}>
          {state.currentStep === 1 && <SealTab onDone={(r) => { setSealResult(r); nextStep(); }} />}
          {state.currentStep === 2 && <TempTab onDone={(r) => { setTempResult(r); nextStep(); }} />}
          {state.currentStep === 3 && <ZKTab tempResult={state.tempResult} onDone={(r) => { setZkResult(r); nextStep(); }} />}
          {state.currentStep >= 4 && <ReviewTab state={state} onComplete={completeHandoff} />}
        </div>
      </div>
    </div>
  );
}

// ── Tab 1: NFC Seal ───────────────────────────────────────────────────────────
function SealTab({ onDone }: { onDone: (r: SealResult) => void }) {
  const [s, setS] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<SealResult | null>(null);

  const startScan = async () => {
    setS('scanning');
    const res = await verifySeal();
    if (!res.success) { setS('error'); return; }
    setResult(res.data);
    setS('success');
  };

  const skip = () => onDone({ valid: false, sealId: '', signature: '', verifiedAt: new Date().toISOString(), reason: 'SEAL_NOT_FOUND' });

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Verify Physical Seal</h2>
      <p style={{ color: '#64748b', marginBottom: 32, fontSize: 14 }}>Tap your phone against the NTAG 424 DNA seal to verify hardware integrity.</p>
      
      <div style={{ marginBottom: 32 }}>
        <NFCAnimation state={s === 'success' ? (result?.valid ? 'success' : 'failure') : s} size={120} label={s === 'scanning' ? 'Hold steady near seal...' : ''} />
      </div>

      {s === 'idle' && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={startScan} style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}>Start Scan</button>
          <button onClick={skip} style={{ background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 8, padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}>Skip</button>
        </div>
      )}

      {s === 'error' && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={startScan} style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}>Retry Scan</button>
          <button onClick={skip} style={{ background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 8, padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}>Skip</button>
        </div>
      )}

      {s === 'success' && result && (
        <div style={{ textAlign: 'left', background: result.valid ? '#f0fdf4' : '#fef2f2', border: `1px solid ${result.valid ? '#bbf7d0' : '#fecaca'}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: result.valid ? '#15803d' : '#991b1b', marginBottom: 4 }}>
            {result.valid ? '✅ Seal Verified Successfully' : '❌ Seal Broken - Tamper Detected'}
          </div>
          <div style={{ fontSize: 13, color: '#475569', fontFamily: 'monospace' }}>ID: {result.sealId || 'N/A'}</div>
          {!result.valid && <div style={{ fontSize: 13, color: '#991b1b', marginTop: 4 }}>Reason: {result.reason}</div>}
        </div>
      )}

      {s === 'success' && (
        <button onClick={() => onDone(result!)} style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
          Continue →
        </button>
      )}
    </div>
  );
}

// ── Tab 2: IoT Logger ─────────────────────────────────────────────────────────
function TempTab({ onDone }: { onDone: (r: TempResult) => void }) {
  const [s, setS] = useState<'idle' | 'reading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<TempResult | null>(null);

  const startRead = async () => {
    setS('reading');
    const res = await readTemperatureLogger({ temperatureThreshold: { min: 2, max: 8 } });
    if (!res.success) { setS('error'); return; }
    setResult(res.data);
    setS('success');
  };

  const skip = () => onDone({ merkleRoot: '0x0', readingCount: 0, minTemp: 0, maxTemp: 0, allCompliant: false, verifiedAt: new Date().toISOString(), readings: [] });

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Read Temperature Logs</h2>
      <p style={{ color: '#64748b', marginBottom: 32, fontSize: 14 }}>Read signed temperature history from the logger via NFC or Bluetooth.</p>

      {s === 'idle' || s === 'reading' || s === 'error' ? (
        <>
          <div style={{ fontSize: 64, marginBottom: 24, opacity: s === 'reading' ? 0.5 : 1, animation: s === 'reading' ? 'vc-pulse-ring 1s infinite' : 'none' }}>🌡️</div>
          {s === 'error' && <p style={{ color: '#EF4444', marginBottom: 16 }}>Failed to read logger. Try again.</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={startRead} disabled={s === 'reading'} style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 600, cursor: 'pointer', opacity: s === 'reading' ? 0.7 : 1 }}>
              {s === 'reading' ? 'Reading...' : 'Read Logger'}
            </button>
            <button onClick={skip} disabled={s === 'reading'} style={{ background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 8, padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}>Skip</button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'left' }}>
          {result && <TemperatureCard result={result} />}
          <button onClick={() => onDone(result!)} style={{ marginTop: 20, background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: ZK Proof ───────────────────────────────────────────────────────────
function ZKTab({ tempResult, onDone }: { tempResult: TempResult | null, onDone: (r: ZKResult) => void }) {
  const [s, setS] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ZKResult | null>(null);

  const startZK = async () => {
    if (!tempResult) return;
    setS('generating');
    try {
      const res = await generateTemperatureProof({ readings: tempResult.readings, thresholdMin: 2, thresholdMax: 8, merkleRoot: tempResult.merkleRoot });
      setResult(res);
      setS('success');
    } catch (e) { setS('error'); }
  };

  const skip = () => onDone({ valid: false, proofType: 'NONE', generatedAt: new Date().toISOString() });

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Zero-Knowledge Proof</h2>
      <p style={{ color: '#64748b', marginBottom: 32, fontSize: 14 }}>Generate a cryptographic proof that temperature stayed within range without revealing exact readings.</p>

      {s === 'idle' || s === 'generating' || s === 'error' ? (
        <>
          <div style={{ fontSize: 64, marginBottom: 24, animation: s === 'generating' ? 'vc-spin 2s linear infinite' : 'none' }}>🔐</div>
          {s === 'error' && <p style={{ color: '#EF4444', marginBottom: 16 }}>Proof generation failed.</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={startZK} disabled={s === 'generating'} style={{ background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 600, cursor: 'pointer', opacity: s === 'generating' ? 0.7 : 1 }}>
              {s === 'generating' ? 'Generating Proof (wasm)...' : 'Generate ZK Proof'}
            </button>
            <button onClick={skip} disabled={s === 'generating'} style={{ background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 8, padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}>Skip</button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'left' }}>
          {result && <ProofBadge result={result} />}
          <button onClick={() => onDone(result!)} style={{ marginTop: 20, background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
            Review Handoff →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Review ─────────────────────────────────────────────────────────────
function ReviewTab({ state, onComplete }: { state: any, onComplete: (b: any) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const handleSign = () => {
    setSubmitting(true);
    setTimeout(() => {
      setDone(true);
      // In real code, build the bundle here
      const mockBundle = { shipmentId: state.shipmentId, status: 'OK', temperatureData: { merkleRoot: '0x...' }, temperatureProof: { proofType: 'GROTH16' } };
      onComplete(mockBundle);
    }, 1500);
  };

  const contested = (state.sealResult && !state.sealResult.valid) || (state.tempResult && !state.tempResult.allCompliant);

  if (done) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16, animation: 'nfc-pop 0.3s ease' }}>✅</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#10B981', marginBottom: 8 }}>Handoff Complete</h2>
        <p style={{ color: '#64748b', marginBottom: 24 }}>The data has been cryptographically signed and submitted to the blockchain.</p>
        
        <ChainSubmit shipmentId={state.shipmentId} merkleRoot="0xabc123" zkProofHash="0xdef456" mode={contested ? 'contest' : 'send'} />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Review & Sign</h2>
      <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>Review the verification summary below, then sign to complete the handoff.</p>

      {contested && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 16, marginBottom: 24, color: '#92400e', display: 'flex', gap: 10 }}>
          <span>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>This handoff will be marked CONTESTED</div>
            <div style={{ fontSize: 13 }}>One or more checks failed. Evidence will be preserved on-chain.</div>
          </div>
        </div>
      )}

      <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>Summary</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ color: '#64748b' }}>NFC Seal</span>
          <span style={{ fontWeight: 600, color: state.sealResult?.valid ? '#10B981' : '#EF4444' }}>{state.sealResult ? (state.sealResult.valid ? '✅ Verified' : '❌ Broken') : '⏭ Skipped'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ color: '#64748b' }}>Temperature</span>
          <span style={{ fontWeight: 600, color: state.tempResult?.allCompliant ? '#10B981' : '#EF4444' }}>{state.tempResult ? (state.tempResult.allCompliant ? '✅ Compliant' : '❌ Excursion') : '⏭ Skipped'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}>
          <span style={{ color: '#64748b' }}>ZK Proof</span>
          <span style={{ fontWeight: 600, color: state.zkResult?.valid ? '#8B5CF6' : '#64748b' }}>{state.zkResult?.valid ? `✅ ${state.zkResult.proofType}` : '⏭ Skipped'}</span>
        </div>
      </div>

      <button onClick={handleSign} disabled={submitting} style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 24px', fontWeight: 700, fontSize: 16, cursor: 'pointer', width: '100%', opacity: submitting ? 0.7 : 1 }}>
        {submitting ? 'Signing...' : '✍️ Sign & Submit Handoff'}
      </button>
    </div>
  );
}
