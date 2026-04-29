import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHandoff } from '../context/HandoffContext';
import Breadcrumb from '../components/Breadcrumb';
import NFCAnimation from '../components/NFCAnimation';
import TemperatureCard from '../components/TemperatureCard';
import ProofBadge from '../components/ProofBadge';
import HandoffSummaryCard from '../components/HandoffSummaryCard';
import ErrorBanner from '../components/ErrorBanner';

import { verifySeal } from '../nfc/sealVerifier';
import { readTemperatureLogger } from '../nfc/tempReader';
import { generateTemperatureProof } from '../zk/proofGenerator';
import { assembleHandoffBundle } from '../handoff/bundleAssembler';
import { ChainSubmit } from '../features/blockchain/ChainSubmit';
import type { SealResult, TempResult, ZKResult, HandoffBundle } from '../types/physicalLayer';

// ── Sidebar step list ─────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'active' | 'done' | 'failed' | 'skipped';

interface StepDef { label: string; icon: string; }
const STEPS: StepDef[] = [
  { label: 'Seal Verification',  icon: '📡' },
  { label: 'Temperature Data',   icon: '🌡️' },
  { label: 'Proof Generation',   icon: '🔐' },
  { label: 'Review & Confirm',   icon: '✍️' },
];

function SidebarStep({ step, status, current, n, onClick }: { step: StepDef; status: StepStatus; current: boolean; n: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="vc-step-item"
      style={{ width: '100%', border: 'none', background: current ? '#eff6ff' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
    >
      <div className={`vc-step-circle ${status === 'active' ? 'active' : status === 'done' || status === 'skipped' ? 'done' : status === 'failed' ? 'failed' : 'pending'}`}>
        {status === 'done' || status === 'skipped' ? '✓' : status === 'failed' ? '✗' : n}
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: current ? 600 : 500, color: current ? 'var(--vc-primary)' : status === 'pending' ? 'var(--vc-text-muted)' : 'var(--vc-text-primary)' }}>
          {step.label}
        </p>
        <p style={{ fontSize: 12, color: 'var(--vc-text-muted)', marginTop: 2 }}>
          {status === 'done'    ? 'Completed'
          : status === 'failed'  ? 'Failed'
          : status === 'skipped' ? 'Skipped'
          : status === 'active'  ? 'In progress…'
          : 'Waiting'}
        </p>
      </div>
    </button>
  );
}

function ProgressSidebar({ step, sealDone, tempDone, zkDone, sealOk, tempOk }: { step: number; sealDone: boolean; tempDone: boolean; zkDone: boolean; sealOk: boolean; tempOk: boolean }) {
  const statuses: StepStatus[] = [
    sealDone ? (sealOk ? 'done' : 'failed') : step === 1 ? 'active' : 'pending',
    tempDone ? (tempOk ? 'done' : 'failed') : step === 2 ? 'active' : 'pending',
    zkDone   ? 'done' : step === 3 ? 'active' : 'pending',
    step === 4 ? (step >= 4 ? 'active' : 'pending') : 'pending',
  ];

  return (
    <div className="vc-sidebar-sticky" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="vc-card-flat" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--vc-border)' }}>
          <p style={{ fontWeight: 700, fontSize: 15 }}>Handoff Progress</p>
          <p className="vc-small" style={{ marginTop: 2 }}>Step {step} of 4</p>
        </div>
        <div style={{ padding: '8px 8px' }}>
          {STEPS.map((s, i) => (
            <SidebarStep
              key={i}
              n={i + 1}
              step={s}
              status={statuses[i]}
              current={step === i + 1}
              onClick={() => {}}
            />
          ))}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--vc-border)', background: 'var(--vc-bg-section)' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[sealDone, tempDone, zkDone, step === 4].map((done, i) => (
              <div key={i} style={{ width: `calc(25% - 5px)`, height: 4, borderRadius: 2, background: done ? 'var(--vc-primary)' : 'var(--vc-border)' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Seal ──────────────────────────────────────────────────────────────

function Step1({ onDone }: { onDone: (r: SealResult) => void }) {
  type S = 'idle' | 'scanning' | 'done' | 'error';
  const [s, setS] = useState<S>('idle');
  const [result, setResult] = useState<SealResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const startScan = useCallback(async () => {
    setS('scanning'); setErr(null); setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    const res = await verifySeal();
    clearInterval(timerRef.current);
    if (!res.success) { setErr(res.error.message); setS('error'); return; }
    setResult(res.data);
    setS('done');
  }, []);

  const skip = useCallback(() => {
    clearInterval(timerRef.current);
    const fakeResult: SealResult = { valid: false, sealId: '', signature: '', verifiedAt: new Date().toISOString(), reason: 'SEAL_NOT_FOUND' };
    setResult(fakeResult);
    onDone(fakeResult);
  }, [onDone]);

  return (
    <div>
      <h2 className="vc-h3" style={{ marginBottom: 8 }}>Seal Verification</h2>
      <p className="vc-body" style={{ marginBottom: 28 }}>Hold your phone near the NFC tamper-evident seal on the package to verify integrity.</p>
      {err && <ErrorBanner message={err} type="error" onDismiss={() => setErr(null)} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* Main action */}
        <div className="vc-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 48, textAlign: 'center' }}>
          <NFCAnimation state={s === 'scanning' ? 'scanning' : s === 'done' ? (result?.valid ? 'success' : 'error') : s === 'error' ? 'error' : 'idle'} size={80} />
          {s === 'idle' && (
            <>
              <p className="vc-body">Tap your phone to the NTAG 424 DNA seal to verify the tamper-evident seal.</p>
              <button className="vc-btn vc-btn-primary vc-btn-lg" onClick={startScan}>Start NFC Scan</button>
              <button className="vc-btn vc-btn-ghost" onClick={skip}>Skip (NFC unavailable)</button>
            </>
          )}
          {s === 'scanning' && (
            <>
              <p style={{ fontWeight: 600, color: 'var(--vc-primary)', fontSize: 16 }}>Scanning… {elapsed}s</p>
              <p className="vc-small">Hold steady near the seal</p>
            </>
          )}
          {s === 'done' && result && (
            <>
              {result.valid ? (
                <div className="vc-alert vc-alert-success" style={{ textAlign: 'left', width: '100%' }}>
                  <span>✓</span>
                  <div>
                    <p style={{ fontWeight: 600 }}>Seal verified successfully</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>ID: <code style={{ fontFamily: 'monospace' }}>{result.sealId}</code></p>
                    <p style={{ fontSize: 12, marginTop: 2, opacity: .8 }}>{new Date(result.verifiedAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ) : (
                <div className="vc-alert vc-alert-error" style={{ textAlign: 'left', width: '100%' }}>
                  <span>⚠</span>
                  <div>
                    <p style={{ fontWeight: 600 }}>SEAL BROKEN — Tamper detected</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>Reason: {result.reason}</p>
                  </div>
                </div>
              )}
              <button className="vc-btn vc-btn-success" style={{ alignSelf: 'stretch' }} onClick={() => onDone(result)}>
                Continue to Temperature →
              </button>
            </>
          )}
          {s === 'error' && (
            <>
              <p className="vc-small" style={{ color: 'var(--vc-error)' }}>Could not read seal.</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="vc-btn vc-btn-primary" onClick={startScan}>Retry</button>
                <button className="vc-btn vc-btn-outline" onClick={skip}>Skip</button>
              </div>
            </>
          )}
        </div>

        {/* Info panel */}
        <div className="vc-card-flat" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h4 className="vc-h4" style={{ fontSize: 15 }}>About NFC Seals</h4>
          <p className="vc-small">The NXP NTAG 424 DNA chip is embedded in a label that <strong>physically destructs</strong> when peeled. This provides hardware-enforced tamper evidence.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['🧬', 'Challenge-Response', 'Chip signs a random nonce — cannot be replayed'],
              ['💔', 'Physical Tamper', 'Label antenna breaks on peel — detectable on chip'],
              ['🔑', 'Ed25519', '64-byte signature verified against on-chain public key'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>{title}</p>
                  <p style={{ fontSize: 12, color: 'var(--vc-text-muted)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Temperature ───────────────────────────────────────────────────────

function Step2({ onDone }: { onDone: (r: TempResult) => void }) {
  type S = 'idle' | 'reading' | 'done' | 'error';
  const [s, setS] = useState<S>('idle');
  const [result, setResult] = useState<TempResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const readLogger = useCallback(async () => {
    setS('reading'); setErr(null);
    const thMin = Number(localStorage.getItem('vc:threshold:min') ?? '2');
    const thMax = Number(localStorage.getItem('vc:threshold:max') ?? '8');
    const res = await readTemperatureLogger({ temperatureThreshold: { min: thMin, max: thMax } });
    if (!res.success) { setErr(res.error.message); setS('error'); return; }
    setResult(res.data);
    setS('done');
  }, []);

  const skip = useCallback(() => {
    const r: TempResult = { merkleRoot: '0x' + '00'.repeat(32), readingCount: 0, minTemp: 0, maxTemp: 0, allCompliant: false, verifiedAt: new Date().toISOString(), readings: [] };
    onDone(r);
  }, [onDone]);

  const thMin = Number(localStorage.getItem('vc:threshold:min') ?? '2');
  const thMax = Number(localStorage.getItem('vc:threshold:max') ?? '8');

  return (
    <div>
      <h2 className="vc-h3" style={{ marginBottom: 8 }}>Temperature Logger</h2>
      <p className="vc-body" style={{ marginBottom: 28 }}>Read all temperature readings from the IoT logger attached to this package.</p>
      {err && <ErrorBanner message={err} type="error" onDismiss={() => setErr(null)} />}

      {s !== 'done' && (
        <div className="vc-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 48, textAlign: 'center' }}>
          <span style={{ fontSize: 64 }}>🌡️</span>
          {s === 'idle' && (
            <>
              <div>
                <p className="vc-body" style={{ marginBottom: 8 }}>Hold phone near the temperature logger to read all recorded data.</p>
                <p className="vc-small">Threshold: {thMin}°C – {thMax}°C</p>
              </div>
              <button className="vc-btn vc-btn-primary vc-btn-lg" onClick={readLogger}>Read Logger</button>
              <button className="vc-btn vc-btn-ghost" onClick={skip}>Skip</button>
            </>
          )}
          {s === 'reading' && (
            <>
              <p style={{ fontWeight: 600, color: 'var(--vc-primary)' }}>Reading temperature data…</p>
              <div style={{ width: '100%', maxWidth: 280, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                <div className="vc-progress-animate" style={{ height: '100%', background: 'linear-gradient(90deg, var(--vc-primary), #7c3aed)', borderRadius: 3 }} />
              </div>
            </>
          )}
          {s === 'error' && (
            <>
              <p className="vc-small" style={{ color: 'var(--vc-error)' }}>Could not read logger.</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="vc-btn vc-btn-primary" onClick={readLogger}>Retry</button>
                <button className="vc-btn vc-btn-outline" onClick={skip}>Skip</button>
              </div>
            </>
          )}
        </div>
      )}

      {s === 'done' && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={`vc-alert ${result.allCompliant ? 'vc-alert-success' : 'vc-alert-error'}`}>
            <span>{result.allCompliant ? '✓' : '⚠'}</span>
            <div>
              <p style={{ fontWeight: 600 }}>{result.allCompliant ? 'All readings within range' : 'Temperature excursion detected'}</p>
              <p style={{ fontSize: 13, marginTop: 2 }}>{result.readingCount} readings · {result.minTemp.toFixed(1)}°C – {result.maxTemp.toFixed(1)}°C</p>
            </div>
          </div>
          <div style={{ overflow: 'auto' }}>
            <TemperatureCard tempResult={result} thresholdMin={thMin} thresholdMax={thMax} />
          </div>
          <button className="vc-btn vc-btn-success" style={{ alignSelf: 'flex-end' }} onClick={() => onDone(result)}>
            Continue to Proof Generation →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 3: Proof ─────────────────────────────────────────────────────────────

function Step3({ tempResult, onDone }: { tempResult: TempResult | null; onDone: (r: ZKResult) => void }) {
  type S = 'idle' | 'proving' | 'done' | 'error';
  const [s, setS] = useState<S>('idle');
  const [result, setResult] = useState<ZKResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const generate = useCallback(async () => {
    setS('proving'); setErr(null); setProgress(0);
    const interval = setInterval(() => setProgress((p) => Math.min(p + 2.5, 94)), 180);
    const merkleRoot = tempResult?.merkleRoot ?? ('0x' + '00'.repeat(32));
    const minTemp    = tempResult?.minTemp ?? 2;
    const maxTemp    = tempResult?.maxTemp ?? 8;
    const thMin = Number(localStorage.getItem('vc:threshold:min') ?? '2');
    const thMax = Number(localStorage.getItem('vc:threshold:max') ?? '8');
    const timeout = Number(localStorage.getItem('vc:zk:timeout') ?? '8') * 1000;
    const res = await generateTemperatureProof(merkleRoot, minTemp, maxTemp, thMin, thMax, { zkProofTimeoutMs: timeout });
    clearInterval(interval); setProgress(100);
    if (!res.success) { setErr(res.error.message); setS('error'); return; }
    setResult(res.data);
    setS('done');
  }, [tempResult]);

  const skip = useCallback(() => {
    const r: ZKResult = { proof: null, publicSignals: [], proofType: 'FALLBACK_ECDSA', reason: 'PROOF_GENERATION_FAILED' };
    onDone(r);
  }, [onDone]);

  return (
    <div>
      <h2 className="vc-h3" style={{ marginBottom: 8 }}>Proof Generation</h2>
      <p className="vc-body" style={{ marginBottom: 28 }}>Generate a cryptographic proof of temperature compliance without revealing raw data.</p>
      {err && <ErrorBanner message={err} type="error" onDismiss={() => setErr(null)} />}

      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="vc-card" style={{ textAlign: 'center', padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: s === 'done' ? '#dbeafe' : '#f1f5f9', border: '3px solid', borderColor: s === 'done' ? 'var(--vc-primary)' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, transition: 'all .3s' }}>
            {s === 'done' && result ? (result.proofType === 'GROTH16' ? '🏅' : '🥈') : '🔐'}
          </div>

          {s === 'idle' && (
            <>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Generate Zero-Knowledge Proof</h3>
                <p className="vc-body">Prove temperature compliance without exposing raw readings. Powered by Groth16 + snarkjs.</p>
              </div>
              <button className="vc-btn vc-btn-primary vc-btn-lg" onClick={generate}>Generate Proof</button>
              <button className="vc-btn vc-btn-ghost" onClick={skip}>Skip Proof</button>
            </>
          )}

          {s === 'proving' && (
            <div style={{ width: '100%' }}>
              <p style={{ fontWeight: 600, color: 'var(--vc-primary)', marginBottom: 16 }}>Generating zero-knowledge proof…</p>
              <div style={{ background: '#e2e8f0', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--vc-primary), #7c3aed)', borderRadius: 4, transition: 'width .3s' }} />
              </div>
              <p className="vc-caption">{Math.round(progress)}% — This takes 5–8 seconds</p>
            </div>
          )}

          {s === 'done' && result && (
            <>
              <div style={{ width: '100%' }}>
                <div className="vc-alert vc-alert-success" style={{ marginBottom: 16 }}>
                  <span>✓</span>
                  <div>
                    <p style={{ fontWeight: 600 }}>Proof generated</p>
                    <p style={{ fontSize: 13, marginTop: 2 }}>
                      {result.proofType === 'GROTH16' ? 'Groth16 ZK proof (~200 bytes)' : 'ECDSA device attestation (fallback)'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ProofBadge proofType={result.proofType} showDetails />
                </div>
              </div>
              <button className="vc-btn vc-btn-success vc-btn-lg" style={{ width: '100%' }} onClick={() => onDone(result)}>Continue to Review →</button>
            </>
          )}

          {s === 'error' && (
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="vc-btn vc-btn-primary" onClick={generate}>Retry</button>
              <button className="vc-btn vc-btn-outline" onClick={skip}>Skip Proof</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Confirm ───────────────────────────────────────────────────────────

function Step4({ onComplete }: { onComplete: (b: HandoffBundle) => void }) {
  const { state } = useHandoff();
  const navigate = useNavigate();
  type S = 'review' | 'signing' | 'done';
  const [s, setS] = useState<S>('review');
  const [bundle, setBundle] = useState<HandoffBundle | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!state.shipmentId && !bundle) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <h3 className="vc-h3" style={{ marginBottom: 12 }}>No handoff data found</h3>
        <button className="vc-btn vc-btn-primary" onClick={() => navigate('/physical')}>Go Home</button>
      </div>
    );
  }

  const sign = useCallback(async () => {
    setS('signing');
    localStorage.setItem('vc:shipment:id', state.shipmentId);
    if (!localStorage.getItem('vc:device:id')) {
      localStorage.setItem('vc:device:id', 'DEV-' + crypto.randomUUID().slice(0, 12).toUpperCase());
    }
    await new Promise((r) => setTimeout(r, 2000));
    const res = await assembleHandoffBundle();
    if (!res.success) { setErr(res.error.message); setS('review'); return; }
    setBundle(res.data);
    onComplete(res.data);
    setS('done');
  }, [state.shipmentId, onComplete]);

  if (s === 'signing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 20, textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#eff6ff', border: '3px solid var(--vc-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
          ✍️
        </div>
        <h3 style={{ fontWeight: 700, fontSize: 20 }}>Signing handoff…</h3>
        <p className="vc-small">Please authenticate with your device</p>
      </div>
    );
  }

  if (s === 'done' && bundle) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }} className="vc-pop">✅</div>
          <h2 className="vc-h2" style={{ color: 'var(--vc-success)', marginBottom: 8 }}>Handoff Verified!</h2>
          <p className="vc-body">Bundle stored locally and will sync to the blockchain when online.</p>
        </div>
        <HandoffSummaryCard bundle={bundle} />
        <div style={{ marginTop: 8 }}>
          <ChainSubmit 
            shipmentId={bundle.shipmentId}
            merkleRoot={bundle.temperatureData.merkleRoot}
            zkProofHash={bundle.temperatureProof.proofType === 'GROTH16' ? '0x01' : '0x00'}
            mode={bundle.status === 'OK' ? 'send' : 'contest'}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          <button className="vc-btn vc-btn-primary vc-btn-lg" onClick={() => navigate('/physical')}>+ New Verification</button>
          <button className="vc-btn vc-btn-outline vc-btn-lg" onClick={() => navigate('/physical/history')}>View History</button>
        </div>
      </div>
    );
  }

  const contested = (state.sealResult && !state.sealResult.valid) || (state.tempResult && !state.tempResult.allCompliant);

  return (
    <div>
      <h2 className="vc-h3" style={{ marginBottom: 8 }}>Review &amp; Confirm</h2>
      <p className="vc-body" style={{ marginBottom: 28 }}>Review the verification summary below, then sign to complete the handoff.</p>
      {err && <ErrorBanner message={err} type="error" onDismiss={() => setErr(null)} />}
      {contested && (
        <div className="vc-alert vc-alert-warning" style={{ marginBottom: 20 }}>
          <span>⚠</span>
          <div><strong>This handoff will be marked CONTESTED</strong> — one or more checks failed. Full evidence will be preserved in the bundle.</div>
        </div>
      )}

      <div className="vc-card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--vc-border)', background: 'var(--vc-bg-section)' }}>
          <p style={{ fontWeight: 700 }}>Shipment <code style={{ fontFamily: 'monospace', background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>{state.shipmentId || '—'}</code></p>
        </div>
        <table style={{ width: '100%' }}>
          <tbody>
            {[
              ['NFC Seal', state.sealResult ? (state.sealResult.valid ? '✅ Verified' : '❌ Broken') : '⏭ Skipped'],
              ['Temperature', state.tempResult ? (state.tempResult.allCompliant ? `✅ Compliant (${state.tempResult.minTemp.toFixed(1)}–${state.tempResult.maxTemp.toFixed(1)}°C)` : '❌ Excursion') : '⏭ Skipped'],
              ['Proof', state.zkResult ? state.zkResult.proofType : '⏭ Skipped'],
            ].map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: '14px 20px', width: 140, fontSize: 14, color: 'var(--vc-text-muted)', borderBottom: '1px solid var(--vc-border)' }}>{k}</td>
                <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, borderBottom: '1px solid var(--vc-border)', color: 'var(--vc-text-primary)' }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="vc-btn vc-btn-success vc-btn-lg" onClick={sign}>✍️ Sign &amp; Complete Handoff</button>
        <button className="vc-btn vc-btn-ghost vc-btn-lg" onClick={() => navigate('/physical')}>Cancel</button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VerifyPage() {
  const { state, setShipmentId, startFlow, setSealResult, setTempResult, setZkResult, nextStep, completeHandoff, resetFlow } = useHandoff();
  const [idInput, setIdInput] = useState(state.shipmentId);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const id = idInput.trim().toUpperCase();
    if (!id) return;
    setShipmentId(id);
    startFlow();
  };

  const step = state.currentStep;

  if (!state.shipmentId) {
    return (
      <div className="vc-section">
        <div className="vc-container" style={{ maxWidth: 600, margin: '0 auto' }}>
          <Breadcrumb items={[{ label: 'Home', to: '/physical' }, { label: 'Verify' }]} />
          <h1 className="vc-h2" style={{ marginBottom: 8 }}>Start Verification</h1>
          <p className="vc-body" style={{ marginBottom: 32 }}>Enter the shipment ID from the package label to begin the handoff verification process.</p>

          <div className="vc-card" style={{ padding: 32 }}>
            <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Shipment ID</label>
                <input
                  className="vc-input"
                  style={{ fontFamily: 'monospace', fontSize: 16, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                  placeholder="e.g. SHIP-2024-001"
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value.toUpperCase())}
                  autoFocus
                />
                <p className="vc-caption" style={{ marginTop: 6 }}>Scan the QR code on the package or type ID manually</p>
              </div>
              <button className="vc-btn vc-btn-primary vc-btn-lg" type="submit" disabled={!idInput.trim()}>
                Begin Verification →
              </button>
            </form>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
            {[['📡', 'NFC Seal', '~5s'], ['🌡️', 'Temperature', '~10s'], ['🔐', 'ZK Proof', '~8s']].map(([icon, label, time]) => (
              <div key={label} className="vc-card-flat" style={{ textAlign: 'center', padding: 20 }}>
                <span style={{ fontSize: 24 }}>{icon}</span>
                <p style={{ fontWeight: 600, fontSize: 14, marginTop: 8 }}>{label}</p>
                <p className="vc-caption">{time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vc-section">
      <div className="vc-container">
        <Breadcrumb items={[{ label: 'Home', to: '/physical' }, { label: 'Verify', to: '/physical/verify' }, { label: state.shipmentId }]} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <h1 className="vc-h2">Verifying Shipment</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ background: 'var(--vc-bg-section)', border: '1px solid var(--vc-border)', borderRadius: 'var(--vc-radius-sm)', padding: '6px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{state.shipmentId}</span>
            <button className="vc-btn vc-btn-ghost vc-btn-sm" onClick={resetFlow}>Change ID</button>
          </div>
        </div>

        <div className="vc-sidebar-layout">
          {/* Sidebar */}
          <ProgressSidebar
            step={step}
            sealDone={!!state.sealResult}
            tempDone={!!state.tempResult}
            zkDone={!!state.zkResult}
            sealOk={state.sealResult?.valid ?? false}
            tempOk={state.tempResult?.allCompliant ?? false}
          />

          {/* Main content */}
          <div className="vc-card" style={{ padding: 32 }}>
            {step === 1 && (
              <Step1 onDone={(r) => { setSealResult(r); nextStep(); }} />
            )}
            {step === 2 && (
              <Step2 onDone={(r) => { setTempResult(r); nextStep(); }} />
            )}
            {step === 3 && (
              <Step3 tempResult={state.tempResult} onDone={(r) => { setZkResult(r); nextStep(); }} />
            )}
            {step === 4 && (
              <Step4 onComplete={(b) => { completeHandoff(b); }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
