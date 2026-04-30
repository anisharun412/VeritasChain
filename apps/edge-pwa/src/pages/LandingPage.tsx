import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: '📦', title: 'NFC Seal Scanner', desc: 'Verify tamper-evident NFC seals on packages. Detect broken seals instantly.', tab: 'seal', color: '#10B981' },
    { icon: '🌡️', title: 'IoT Logger Reader', desc: 'Read temperature history and ZK proofs from cold chain loggers.', tab: 'logger', color: '#3B82F6' },
    { icon: '🔬', title: 'PUF Scanner', desc: 'Physical Unclonable Function for ultimate counterfeit protection.', tab: 'puf', color: '#8B5CF6' },
  ];

  return (
    <div>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #f0fdf4 100%)',
        textAlign: 'center', padding: '100px 24px 80px',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #10B981, #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 8px 24px rgba(16,185,129,0.2)',
          }}>🛡️</div>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800,
            color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.15,
          }}>
            Verifiable <span style={{ color: '#2563eb' }}>Cold Chain</span> Provenance
          </h1>
          <p style={{ fontSize: 18, color: '#64748b', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6 }}>
            Cryptographically secure custody handoffs using ZK proofs, NFC hardware seals, and immutable audit trails.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/physical/verify')} style={{
              background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10,
              padding: '14px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)', minHeight: 48,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.3)'; }}
            >Start Verification →</button>
            <button onClick={() => navigate('/inspect')} style={{
              background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer', minHeight: 48,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
            >📱 Scan & Verify</button>
          </div>
        </div>
      </section>

      {/* 4-Step Process */}
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 48 }}>
            How Verification Works
          </h2>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <div style={{ position: 'absolute', top: 32, left: '10%', right: '10%', height: 2, background: '#e2e8f0' }} />
            {[
              { num: 1, icon: '🔒', title: 'Seal Check', desc: 'Scan NFC tamper-evident seal' },
              { num: 2, icon: '🌡️', title: 'Temperature', desc: 'Read signed IoT sensor logs' },
              { num: 3, icon: '🔐', title: 'ZK Proof', desc: 'Prove compliance via Groth16' },
              { num: 4, icon: '✍️', title: 'Handoff', desc: 'Co-sign and anchor on-chain' },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 1, width: 140 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: '#fff',
                  border: '2px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, marginBottom: 14, position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  {step.icon}
                  <div style={{
                    position: 'absolute', top: -6, right: -6, background: '#2563eb', color: '#fff',
                    width: 22, height: 22, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{step.num}</div>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#0f172a' }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: '#64748b' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section style={{ padding: '20px 24px 80px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 36 }}>
            Physical Layer Capabilities
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {features.map((f) => (
              <div key={f.tab} onClick={() => navigate('/physical/verify')}
                style={{
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
                  padding: 24, cursor: 'pointer', transition: 'all 0.25s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = f.color;
                  e.currentTarget.style.boxShadow = `0 8px 24px ${f.color}15`;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</p>
                {f.tab === 'puf' && (
                  <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 600, background: '#f5f3ff', color: '#7c3aed', borderRadius: 999, padding: '2px 8px' }}>Beta</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
