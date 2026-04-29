import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero */}
      <section className="vc-section" style={{ background: 'linear-gradient(to bottom, var(--vc-bg-section), var(--vc-bg))', textAlign: 'center', padding: '120px 24px 80px' }}>
        <div className="vc-container">
          <h1 className="vc-h1" style={{ marginBottom: 24, padding: '0 20px' }}>
            Verifiable <span style={{ color: 'var(--vc-primary)' }}>Cold Chain</span> Provenance
          </h1>
          <p className="vc-body" style={{ fontSize: 20, maxWidth: 640, margin: '0 auto 40px' }}>
            Cryptographically secure custody handoffs using ZK proofs, NFC hardware seals, and immutable audit trails.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button className="vc-btn vc-btn-primary vc-btn-lg" onClick={() => navigate('/physical/verify')}>
              Start Verification →
            </button>
            <button className="vc-btn vc-btn-outline vc-btn-lg" onClick={() => navigate('/physical/docs')}>
              View Documentation
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="vc-section">
        <div className="vc-container" style={{ maxWidth: 960 }}>
          <h2 className="vc-h2" style={{ textAlign: 'center', marginBottom: 64 }}>How Verification Works</h2>
          
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            {/* Horizontal connector line */}
            <div style={{ position: 'absolute', top: 32, left: '10%', right: '10%', height: 2, background: 'var(--vc-border)' }} />
            
            {[
              { num: 1, icon: '🔒', title: 'Seal Check', desc: 'Scan NFC tamper-evident seal' },
              { num: 2, icon: '🌡️', title: 'Temperature', desc: 'Read signed IoT sensor logs' },
              { num: 3, icon: '🔐', title: 'ZK Proof', desc: 'Prove compliance via Groth16' },
              { num: 4, icon: '✍️', title: 'Handoff', desc: 'Co-sign and store bundle locally' }
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 1, width: 140 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--vc-bg)', border: '2px solid var(--vc-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 16, position: 'relative' }}>
                  {step.icon}
                  <div style={{ position: 'absolute', top: -8, right: -8, background: 'var(--vc-primary)', color: '#fff', width: 24, height: 24, borderRadius: '50%', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {step.num}
                  </div>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{step.title}</h3>
                <p className="vc-small">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
