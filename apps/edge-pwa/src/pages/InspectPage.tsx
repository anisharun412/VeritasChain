import React, { useState } from 'react';

interface ScanResult {
  shipmentId: string;
  product: string;
  freshness: number;
  handoffs: number;
  status: 'verified' | 'failed';
  lastLocation: string;
  lastTime: string;
  docIntegrity: boolean;
  chain: { step: number; from: string; to: string; time: string; freshness: number }[];
}

const MOCK_RESULT: ScanResult = {
  shipmentId: 'SHIP-001',
  product: 'mRNA Vaccine Batch 47B',
  freshness: 94,
  handoffs: 7,
  status: 'verified',
  lastLocation: 'Mombasa Port, Kenya',
  lastTime: '2024-12-01 14:30 UTC',
  docIntegrity: true,
  chain: [
    { step: 1, from: 'Pfizer Belgium', to: 'DHL Hub Brussels', time: 'Nov 28, 08:00', freshness: 100 },
    { step: 2, from: 'DHL Hub Brussels', to: 'DHL Flight AMS-NBO', time: 'Nov 28, 14:00', freshness: 99 },
    { step: 3, from: 'JKIA Nairobi', to: 'DHL Truck KE-204', time: 'Nov 29, 06:00', freshness: 97 },
    { step: 4, from: 'DHL Truck KE-204', to: 'Mombasa Port', time: 'Nov 30, 10:00', freshness: 95 },
    { step: 5, from: 'Mombasa Port', to: 'Cold Storage Hub', time: 'Nov 30, 14:00', freshness: 94 },
    { step: 6, from: 'Cold Storage Hub', to: 'Hospital Van', time: 'Dec 1, 08:00', freshness: 94 },
    { step: 7, from: 'Hospital Van', to: 'Mombasa General', time: 'Dec 1, 14:30', freshness: 94 },
  ],
};

export default function InspectPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualId, setManualId] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); setResult(MOCK_RESULT); }, 2000);
  };

  const handleManualSearch = () => {
    if (manualId.trim()) { setResult(MOCK_RESULT); }
  };

  const freshnessColor = (f: number) => f >= 80 ? '#10B981' : f >= 50 ? '#F59E0B' : '#EF4444';

  if (result) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '1.5rem' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          {/* Result Card */}
          <div style={{
            background: result.status === 'verified'
              ? 'linear-gradient(135deg, #059669, #10B981)'
              : 'linear-gradient(135deg, #DC2626, #EF4444)',
            borderRadius: 16, padding: 28, textAlign: 'center', color: '#fff',
            marginBottom: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: 48 }}>{result.status === 'verified' ? '✅' : '❌'}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>
              {result.status === 'verified' ? 'Cold Chain Verified' : 'Verification Failed'}
            </div>
            <div style={{ fontSize: 15, opacity: 0.85, marginTop: 4 }}>{result.product}</div>
          </div>

          {/* Freshness Score */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, textAlign: 'center', marginBottom: 16, border: '1px solid #e2e8f0' }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%', margin: '0 auto 12px',
              border: `4px solid ${freshnessColor(result.freshness)}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: freshnessColor(result.freshness) }}>{result.freshness}</span>
              <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>FRESHNESS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 13, color: '#64748b' }}>
              <span>🔗 {result.handoffs} verified handoffs</span>
              <span>📄 {result.docIntegrity ? 'All hashes match' : 'Mismatch detected'}</span>
            </div>
          </div>

          {/* Details */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Last handoff</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{result.lastLocation}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{result.lastTime}</div>
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#94a3b8', marginTop: 6 }}>ID: {result.shipmentId}</div>
          </div>

          {/* Timeline toggle */}
          <button onClick={() => setShowTimeline(!showTimeline)} style={{
            width: '100%', padding: '12px 18px', background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 14, cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 16,
            minHeight: 48,
          }}>
            <span>📋 Full Chain of Custody</span>
            <span style={{ color: '#94a3b8' }}>{showTimeline ? '▲' : '▼'}</span>
          </button>

          {showTimeline && (
            <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              {result.chain.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < result.chain.length - 1 ? 0 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                      background: freshnessColor(c.freshness),
                    }} />
                    {i < result.chain.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: '#e2e8f0', margin: '4px 0' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                      {c.from} → {c.to}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {c.time} · Freshness: {c.freshness}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => { setResult(null); setManualId(''); }} style={{
            width: '100%', padding: 14, background: '#3B82F6', color: '#fff',
            border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14,
            cursor: 'pointer', minHeight: 48,
          }}>Scan Another Package</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
          Verify Package
        </h1>
        <p style={{ color: '#64748b', marginBottom: 32, fontSize: 15 }}>
          Scan a QR code on any package to verify its cold chain integrity. No login required.
        </p>

        {/* QR Scanner Area */}
        <div
          onClick={handleScan}
          style={{
            border: scanning ? '2px solid #3B82F6' : '2px dashed #cbd5e1',
            borderRadius: 16, padding: scanning ? 40 : 60,
            cursor: 'pointer', transition: 'all 0.3s',
            background: scanning ? '#eff6ff' : '#fff',
            marginBottom: 24,
          }}
        >
          {scanning ? (
            <div>
              <div style={{ fontSize: 56, marginBottom: 12, animation: 'vc-spin 2s linear infinite' }}>📷</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#3B82F6' }}>Scanning...</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Point camera at QR code</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 56, marginBottom: 12 }}>📱</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Tap to Scan QR Code</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                Or enter shipment ID manually below
              </div>
            </div>
          )}
        </div>

        {/* Manual entry */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Enter Shipment ID (e.g. SHIP-001)"
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10,
              border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', minHeight: 48,
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
          />
          <button onClick={handleManualSearch} style={{
            background: '#10B981', color: '#fff', border: 'none', borderRadius: 10,
            padding: '12px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', minHeight: 48,
          }}>Verify</button>
        </div>

        <p style={{ marginTop: 20, fontSize: 12, color: '#94a3b8' }}>
          🔒 No wallet or account needed. Anyone can verify.
        </p>
      </div>
    </div>
  );
}
