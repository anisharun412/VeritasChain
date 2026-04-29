import Breadcrumb from '../components/Breadcrumb';

export default function AboutPage() {
  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="vc-container">
        <Breadcrumb items={[{ label: 'Home', to: '/verify' }, { label: 'About Process' }]} />

        {/* Mission / Context */}
        <div style={{ maxWidth: 720, marginBottom: 80 }}>
          <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--vc-primary)', marginBottom: 12 }}>About the Process</p>
          <h1 className="vc-h2" style={{ marginBottom: 20 }}>Verifiable Cold Chain Provenance</h1>
          <p className="vc-body" style={{ marginBottom: 16, fontSize: 17 }}>
            Temperature excursions, broken seals, and forged records are systemic problems in cold chain logistics.
          </p>
          <p className="vc-body" style={{ fontSize: 17 }}>
            VeritasChain makes every handoff mathematically verifiable. No trust in any single party is required — just verifiable evidence that items stayed cold and packages were never opened.
          </p>
        </div>

        {/* How it works */}
        <div style={{ marginBottom: 80 }}>
          <h2 className="vc-h3" style={{ marginBottom: 6 }}>How the Verification Works</h2>
          <p className="vc-body" style={{ marginBottom: 32 }}>The verification consists of four key steps.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            <div className="vc-card">
              <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>📡</span>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>1. NFC Seal Verification</h3>
              <p className="vc-small">A tamper-evident hardware seal is scanned. The NFC chip physically breaks upon tampering, invalidating cryptographic responses.</p>
            </div>
            <div className="vc-card">
              <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>🌡️</span>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>2. Temperature Data</h3>
              <p className="vc-small">All reading logs are pulled directly from the IoT logger via NFC, providing a full history of the package's exposure.</p>
            </div>
            <div className="vc-card">
              <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>🔐</span>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>3. Zero-Knowledge Proof</h3>
              <p className="vc-small">The device generates a local mathematical proof confirming temperature compliance without exposing the raw underlying readings.</p>
            </div>
            <div className="vc-card">
              <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>✍️</span>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>4. Dual-Witness Handoff</h3>
              <p className="vc-small">Once verified, the driver and recipient sign off, generating a final bundle synced for immutable audit trails.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
