import Breadcrumb from '../components/Breadcrumb';
import { useState } from 'react';

const SECTIONS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'nfc-seal',    label: 'NFC Seal' },
  { id: 'temp-logger', label: 'Temperature Logger' },
  { id: 'zk-proofs',   label: 'ZK Proofs' },
  { id: 'dwh',         label: 'DWH Protocol' },
  { id: 'api',         label: 'API Reference' },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="vc-code-block" style={{ marginTop: 12, marginBottom: 16 }}>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{children}</pre>
    </div>
  );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 56, paddingBottom: 56, borderBottom: '1px solid var(--vc-border)' }}>
      <h2 className="vc-h3" style={{ marginBottom: 16 }}>{title}</h2>
      {children}
    </section>
  );
}

export default function DocumentationPage() {
  const [active, setActive] = useState('overview');

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="vc-container">
        <Breadcrumb items={[{ label: 'Home', to: '/physical' }, { label: 'Documentation' }]} />

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 48, alignItems: 'start' }}>
          {/* Sidebar */}
          <aside className="vc-sidebar-sticky">
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--vc-text-muted)', marginBottom: 12 }}>Documentation</p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={(e) => { e.preventDefault(); setActive(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  style={{
                    display: 'block', padding: '7px 12px', borderRadius: 'var(--vc-radius-sm)',
                    fontSize: 14, fontWeight: active === s.id ? 600 : 400,
                    color: active === s.id ? 'var(--vc-primary)' : 'var(--vc-text-secondary)',
                    background: active === s.id ? 'var(--vc-primary-light)' : 'transparent',
                    transition: 'all .15s',
                  }}
                >
                  {s.label}
                </a>
              ))}
            </nav>
            <div style={{ marginTop: 24, padding: 16, background: 'var(--vc-bg-section)', borderRadius: 'var(--vc-radius)', border: '1px solid var(--vc-border)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Found an issue?</p>
              <a href="https://github.com" style={{ fontSize: 13, color: 'var(--vc-primary)' }} target="_blank" rel="noopener noreferrer">Edit on GitHub →</a>
            </div>
          </aside>

          {/* Content */}
          <div style={{ minWidth: 0 }}>
            <h1 className="vc-h2" style={{ marginBottom: 8 }}>Documentation</h1>
            <p className="vc-body" style={{ marginBottom: 40 }}>Complete technical reference for the VeritasChain physical layer.</p>

            <DocSection title="Overview">
              <div id="overview" />
              <p className="vc-body" style={{ marginBottom: 16 }}>
                VeritasChain is a cold-chain provenance system that combines NFC tamper-evident hardware, IoT temperature loggers, zero-knowledge proofs, and on-chain anchoring to produce fully verifiable handoff records.
              </p>
              <p className="vc-body" style={{ marginBottom: 16 }}>
                This Edge PWA runs entirely in the browser and operates fully offline. All verifications are stored in IndexedDB and synced to the data warehouse (DWH) when connectivity is available.
              </p>
              <div className="vc-alert vc-alert-info">
                <span>ℹ</span>
                <div><strong>Hackathon note:</strong> This is built during the 2024 hackathon. APIs, circuit parameters, and DWH protocol may change.</div>
              </div>
            </DocSection>

            <DocSection title="Quick Start">
              <div id="quick-start" />
              <ol className="vc-body" style={{ margin: '0 0 16px 20px', padding: 0 }}>
                <li>Open Chrome on Android</li>
                <li>Enter Shipment ID</li>
                <li>Follow the 4-step verification flow</li>
                <li>Works fully offline — syncs when online</li>
              </ol>
            </DocSection>

            <DocSection title="NFC Seal Verification">
              <div id="nfc-seal" />
              <p className="vc-body" style={{ marginBottom: 12 }}>
                The NXP NTAG 424 DNA chip stores an Ed25519 public key and signs a cryptographic challenge nonce. The chip physically breaks when peeled, providing tamper evidence.
              </p>
              <CodeBlock>{`import { verifySeal } from './nfc/sealVerifier';

const result = await verifySeal();
if (result.success) {
  console.log(result.data.sealId);   // Chip UID
  console.log(result.data.valid);    // true = seal intact
}`}</CodeBlock>
            </DocSection>

            <DocSection title="Temperature Logger">
              <div id="temp-logger" />
              <p className="vc-body" style={{ marginBottom: 12 }}>
                The ESP32-S3 IoT logger signs each reading with Ed25519. The PWA reads all readings via NFC, verifies each signature, and builds a Merkle tree for compact proof.
              </p>
              <CodeBlock>{`import { readTemperatureLogger } from './nfc/tempReader';

const result = await readTemperatureLogger({
  temperatureThreshold: { min: 2, max: 8 }
});
if (result.success) {
  console.log(result.data.merkleRoot);
  console.log(result.data.allCompliant);
}`}</CodeBlock>
            </DocSection>

            <DocSection title="Security Model">
              <div id="security-model" />
              <ul className="vc-body" style={{ margin: '0 0 16px 20px', padding: 0 }}>
                <li>Seal private key destroyed on peel → physical tamper evidence</li>
                <li>Logger signs each reading with hardware-bound Ed25519 key</li>
                <li>ZK proof (Groth16) hides raw temperature data from all parties</li>
                <li>Merkle tree enables selective disclosure — prove compliance without revealing readings</li>
                <li>Dual-witness handoff: both parties co-sign, creating mutual non-repudiation</li>
              </ul>
            </DocSection>

            <DocSection title="Zero-Knowledge Proofs">
              <div id="zk-proofs" />
              <p className="vc-body" style={{ marginBottom: 12 }}>
                A Groth16 proof (via snarkjs WASM) proves the Merkle root corresponds to readings within threshold — without revealing the raw data. Falls back to ECDSA if proving exceeds 8 seconds.
              </p>
              <CodeBlock>{`import { generateTemperatureProof } from './zk/proofGenerator';

const result = await generateTemperatureProof(
  merkleRoot,
  minTemp, maxTemp,
  complianceMin, complianceMax
);
// result.data.proofType: 'GROTH16' | 'FALLBACK_ECDSA'`}</CodeBlock>
            </DocSection>

            <DocSection title="DWH Protocol">
              <div id="dwh" />
              <p className="vc-body" style={{ marginBottom: 12 }}>
                Completed bundles are emitted as a DOM <code>CustomEvent</code> on <code>window</code>. The DWH integration layer subscribes to these events for blockchain submission.
              </p>
              <CodeBlock>{`window.addEventListener('handoff-bundle-ready', (e) => {
  const { bundle } = e.detail;
  // bundle.status: 'OK' | 'CONTESTED'
  // Submit to DWH API...
});`}</CodeBlock>
            </DocSection>

            <DocSection title="Demo Mode (No Hardware)">
              <div id="demo-mode" />
              <p className="vc-body" style={{ marginBottom: 12 }}>
                Open Settings → Toggle "Demo Mode" to simulate NFC seal and logger data. All proofs and bundles work identically without physical hardware.
              </p>
            </DocSection>

            <DocSection title="API Reference">
              <div id="api" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  ['verifySeal()', 'Result<SealResult>', 'Verifies NFC tamper seal'],
                  ['readTemperatureLogger()', 'Result<TempResult>', 'Reads all logger readings + builds Merkle tree'],
                  ['generateTemperatureProof()', 'Result<ZKResult>', 'Generates Groth16 proof or ECDSA fallback'],
                  ['assembleHandoffBundle()', 'Result<HandoffBundle>', 'Runs all 4 steps and stores to IndexedDB'],
                  ['storeBundle()', 'Result<StoredBundle>', 'Persists bundle to IndexedDB'],
                  ['listBundles()', 'Result<StoredBundle[]>', 'Lists all bundles, newest first'],
                ].map(([fn, returns, desc]) => (
                  <div key={fn} className="vc-card-flat" style={{ padding: 16 }}>
                    <p className="vc-mono" style={{ color: 'var(--vc-primary)', fontWeight: 700, marginBottom: 4 }}>{fn}</p>
                    <p style={{ fontSize: 12, color: 'var(--vc-text-muted)', marginBottom: 6 }}>→ {returns}</p>
                    <p style={{ fontSize: 13, color: 'var(--vc-text-secondary)' }}>{desc}</p>
                  </div>
                ))}
              </div>
            </DocSection>
          </div>
        </div>
      </div>
    </div>
  );
}
