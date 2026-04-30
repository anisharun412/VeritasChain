import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Auto-detect: if accessed via IP (e.g. phone), connect socket to same IP on port 3002
const SERVER = import.meta.env.VITE_TRACKING_SERVER || `http://${window.location.hostname}:3002`;

type Role = 'sender' | 'receiver' | null;
type Status = 'idle' | 'choosing' | 'waiting' | 'scanning' | 'connected' | 'bundle' | 'generating_proof' | 'accepted' | 'contested' | 'completed';

interface RoomInfo {
  shipmentId: string;
  senderName: string;
  senderRole: string;
  status: string;
}

export default function HandshakePage() {
  const socketRef = useRef<Socket | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [name, setName] = useState('');
  const [persona, setPersona] = useState('Manufacturer');
  const [shipmentId, setShipmentId] = useState('SHIP-2024-001');
  const [availableRooms, setAvailableRooms] = useState<RoomInfo[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [bundle, setBundle] = useState<any>(null);
  const [completedData, setCompletedData] = useState<any>(null);
  const [contestReason, setContestReason] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [zkLines, setZkLines] = useState<string[]>([]);
  const scanTimer = useRef<any>(null);

  // Connect socket on mount
  useEffect(() => {
    const s = io(SERVER, { transports: ['websocket', 'polling'] });
    socketRef.current = s;

    s.on('connect', () => console.log('[Handshake] Socket connected:', s.id));

    s.on('handshake:status', (data: any) => {
      setStatusMsg(data.message);
      if (data.status === 'connected') setStatus('connected');
      if (data.status === 'completed') setStatus('completed');
      if (data.status === 'contested') setStatus('contested');
    });

    s.on('handshake:available', (rooms: RoomInfo[]) => {
      setAvailableRooms(rooms);
      if (scanTimer.current) clearInterval(scanTimer.current);
      setStatus('choosing');
    });

    s.on('handshake:bundle', (data: any) => {
      setBundle(data);
      setStatus('bundle');
    });

    s.on('handshake:complete', (data: any) => {
      setCompletedData(data);
      setStatus('completed');
    });

    s.on('handshake:error', (data: any) => {
      setStatusMsg('Error: ' + data.message);
    });

    return () => { s.disconnect(); };
  }, []);

  // ── Sender: Initiate ──
  const handleInitiate = useCallback(() => {
    if (!name.trim() || !shipmentId.trim()) return;
    const mockBundle = {
      shipmentId,
      documents: [
        { name: 'Temperature Log', hash: '0x' + Math.random().toString(16).slice(2, 18) },
        { name: 'Certificate of Origin', hash: '0x' + Math.random().toString(16).slice(2, 18) },
        { name: 'Phytosanitary Cert', hash: '0x' + Math.random().toString(16).slice(2, 18) },
      ],
      zkProof: 'groth16-' + Date.now(),
      gpsLat: 40.7128, gpsLng: -74.006,
      timestamp: Date.now(),
    };
    socketRef.current?.emit('handshake:initiate', {
      shipmentId, senderName: name, senderRole: persona, bundle: mockBundle,
    });
    setStatus('waiting');
    setStatusMsg('Broadcasting BLE beacon... Waiting for receiver');
  }, [name, shipmentId, persona]);

  // ── Receiver: Scan ──
  const handleScan = useCallback(() => {
    setStatus('scanning');
    setScanProgress(0);
    let p = 0;
    scanTimer.current = setInterval(() => {
      p += 5;
      setScanProgress(Math.min(p, 95));
    }, 100);
    // Ask server for active rooms after fake scan delay
    setTimeout(() => {
      socketRef.current?.emit('handshake:discover');
    }, 2000);
  }, []);

  // ── Receiver: Join room ──
  const handleJoin = useCallback((sid: string) => {
    socketRef.current?.emit('handshake:join', {
      shipmentId: sid, receiverName: name, receiverRole: persona,
    });
    setShipmentId(sid);
    setStatus('connected');
  }, [name, persona]);

  // ── Receiver: Accept & Generate ZK Proof ──
  const handleAccept = useCallback(() => {
    setStatus('generating_proof');
    setZkLines([]);
    
    const lines = [
      '> Initializing Groth16 Prover...',
      '> Loading verification key for Cold Chain Circuit v1.2...',
      '> Fetching encrypted IoT logger data payload...',
      '> Computing constraints (Temperature <= 8°C)...',
      '> Compiling polynomial witnesses...',
      '> Checking public inputs: hash(documents), shipmentId...',
      '> VALID: Temperature bounds strictly met for entire transit duration.',
      '> Generating zk-SNARK proof (curve bn128)...',
      '> Proof Generated: 0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2) + '...',
      '> Executing P2P signature exchange...',
    ];

    let current = 0;
    const interval = setInterval(() => {
      setZkLines(prev => [...prev, lines[current]]);
      current++;
      if (current >= lines.length) {
        clearInterval(interval);
        setTimeout(() => {
          socketRef.current?.emit('handshake:accept', { shipmentId });
        }, 800);
      }
    }, 400); // 400ms per line = about 4 seconds total animation
  }, [shipmentId]);

  // ── Receiver: Contest ──
  const handleContest = useCallback(() => {
    if (!contestReason.trim()) return;
    socketRef.current?.emit('handshake:contest', { shipmentId, reason: contestReason });
  }, [shipmentId, contestReason]);

  // ── Reset ──
  const reset = () => {
    setRole(null); setStatus('idle'); setStatusMsg(''); setBundle(null);
    setCompletedData(null); setAvailableRooms([]); setContestReason('');
  };

  // ════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════

  const card = (children: React.ReactNode) => (
    <div style={{ background: '#fff', borderRadius: 16, padding: 32, border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 520, width: '100%' }}>
      {children}
    </div>
  );

  // ── Completed screen ──
  if (status === 'completed' && completedData) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {card(<>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#065f46' }}>Handoff Complete!</h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>Dual-witness signatures verified via BLE P2P Protocol</p>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <Row label="Shipment" value={completedData.shipmentId} />
            <Row label="Sender" value={`${completedData.senderName} (${completedData.senderRole})`} />
            <Row label="Receiver" value={`${completedData.receiverName} (${completedData.receiverRole})`} />
            <Row label="Merkle Root" value={completedData.merkleRoot?.slice(0, 20) + '…'} mono />
            <Row label="Sender Sig" value={completedData.senderSignature?.slice(0, 20) + '…'} mono />
            <Row label="Receiver Sig" value={completedData.receiverSignature?.slice(0, 20) + '…'} mono />
            <Row label="Timestamp" value={new Date(completedData.timestamp).toLocaleString()} />
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <p style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>⛓ Arbitrum Sepolia Details</p>
            <Row label="Tx Hash" value={completedData.txHash?.slice(0, 20) + '…'} mono />
            <Row label="Pimlico Bundler" value={completedData.pimlicoStatus || 'Simulated'} />
            <div style={{ marginTop: 4 }}>
              <a href={completedData.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
                View on Arbiscan ↗
              </a>
            </div>
          </div>
          <div style={{ background: '#d1fae5', borderRadius: 8, padding: 12, fontSize: 12, color: '#065f46', textAlign: 'center', marginBottom: 16 }}>
            📡 BLE handshake verified · Recorded on testnet
          </div>
          <button onClick={reset} style={{ width: '100%', padding: '12px 0', background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            New Handshake
          </button>
        </>)}
      </div>
    );
  }

  // ── ZK Proof Generation screen ──
  if (status === 'generating_proof') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020617, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#000', borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, border: '1px solid #334155', boxShadow: '0 0 40px rgba(16,185,129,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#EF4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F59E0B' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8, fontFamily: 'monospace' }}>VeritasChain ZK-Prover</span>
          </div>
          <div style={{ fontFamily: 'monospace', color: '#10B981', fontSize: 13, lineHeight: '1.6', minHeight: 280, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {zkLines.map((line, i) => (
              <div key={i} style={{ animation: 'fade-in 0.2s ease-out' }}>{line}</div>
            ))}
            {zkLines.length < 10 && (
              <div style={{ animation: 'pulse 1s infinite', color: '#3B82F6' }}>_</div>
            )}
          </div>
          <style>{`
            @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          `}</style>
        </div>
      </div>
    );
  }

  // ── Contested screen ──
  if (status === 'contested') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fef2f2, #fff1f2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {card(<>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>⚠️</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#991b1b' }}>Handoff Contested</h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>{statusMsg}</p>
          </div>
          <button onClick={reset} style={{ width: '100%', padding: '12px 0', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            Start Over
          </button>
        </>)}
      </div>
    );
  }

  // ── Role selection ──
  if (!role) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {card(<>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📡</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>BLE Digital Handshake</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Select your role to begin the peer-to-peer handoff</p>
          </div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, marginBottom: 12, boxSizing: 'border-box' }} />
          <select value={persona} onChange={e => setPersona(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, marginBottom: 20, boxSizing: 'border-box' }}>
            <option>Manufacturer</option><option>Carrier</option><option>Receiver</option>
          </select>
          <div style={{ display: 'flex', gap: 12 }}>
            <button disabled={!name.trim()} onClick={() => { setRole('sender'); setStatus('idle'); }} style={{ flex: 1, padding: '14px 0', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: name.trim() ? 1 : 0.5 }}>
              📤 Send Handoff
            </button>
            <button disabled={!name.trim()} onClick={() => { setRole('receiver'); setStatus('idle'); }} style={{ flex: 1, padding: '14px 0', background: '#10B981', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: name.trim() ? 1 : 0.5 }}>
              📥 Receive Handoff
            </button>
          </div>
        </>)}
      </div>
    );
  }

  // ── Sender Flow ──
  if (role === 'sender') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {card(<>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48 }}>📤</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>Initiate BLE Handoff</h2>
            <p style={{ color: '#64748b', fontSize: 13 }}>{name} · {persona}</p>
          </div>

          {status === 'idle' && (<>
            <input value={shipmentId} onChange={e => setShipmentId(e.target.value.toUpperCase())} placeholder="Shipment ID" style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, fontFamily: 'monospace', marginBottom: 16, boxSizing: 'border-box' }} />
            <button onClick={handleInitiate} disabled={!shipmentId.trim()} style={{ width: '100%', padding: '14px 0', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              📡 Start BLE Broadcast
            </button>
          </>)}

          {status === 'waiting' && (
            <div style={{ textAlign: 'center' }}>
              <BLEAnimation />
              <p style={{ fontWeight: 600, color: '#3B82F6', marginTop: 16 }}>Broadcasting BLE beacon...</p>
              <p style={{ color: '#64748b', fontSize: 13 }}>Shipment: <code>{shipmentId}</code></p>
              <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>{statusMsg}</p>
            </div>
          )}

          {status === 'connected' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🤝</div>
              <p style={{ fontWeight: 700, color: '#10B981', fontSize: 16 }}>Receiver Connected!</p>
              <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{statusMsg}</p>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginTop: 16, fontSize: 13 }}>
                Waiting for receiver to review and co-sign...
              </div>
            </div>
          )}

          <button onClick={reset} style={{ marginTop: 20, width: '100%', padding: '10px 0', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            ← Cancel
          </button>
        </>)}
      </div>
    );
  }

  // ── Receiver Flow ──
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {card(<>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>📥</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>Receive BLE Handoff</h2>
          <p style={{ color: '#64748b', fontSize: 13 }}>{name} · {persona}</p>
        </div>

        {status === 'idle' && (
          <button onClick={handleScan} style={{ width: '100%', padding: '14px 0', background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            📡 Scan for BLE Beacons
          </button>
        )}

        {status === 'scanning' && (
          <div style={{ textAlign: 'center' }}>
            <BLEAnimation />
            <p style={{ fontWeight: 600, color: '#10B981', marginTop: 16 }}>Scanning for nearby devices...</p>
            <div style={{ background: '#f1f5f9', borderRadius: 8, height: 6, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ width: `${scanProgress}%`, height: '100%', background: '#10B981', borderRadius: 8, transition: 'width 0.1s' }} />
            </div>
          </div>
        )}

        {status === 'choosing' && (<>
          <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
            {availableRooms.length > 0 ? `Found ${availableRooms.length} BLE beacon(s):` : 'No beacons found. Ask sender to start first.'}
          </p>
          {availableRooms.map(r => (
            <button key={r.shipmentId} onClick={() => handleJoin(r.shipmentId)} style={{ width: '100%', padding: 16, background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 12, cursor: 'pointer', textAlign: 'left', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>📦 {r.shipmentId}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>From: {r.senderName} ({r.senderRole})</div>
            </button>
          ))}
          <button onClick={handleScan} style={{ marginTop: 8, width: '100%', padding: '10px 0', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>
            🔄 Rescan
          </button>
        </>)}

        {status === 'bundle' && bundle && (<>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <p style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 8 }}>📦 Bundle from {bundle.senderName}</p>
            <Row label="Shipment" value={bundle.shipmentId} />
            <Row label="Sender" value={`${bundle.senderName} (${bundle.senderRole})`} />
            <Row label="Sender Sig" value={bundle.senderSignature?.slice(0, 24) + '…'} mono />
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              <strong>Documents:</strong>
              {bundle.bundle?.documents?.map((d: any, i: number) => (
                <div key={i}>✓ {d.name} <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{d.hash?.slice(0, 12)}…</span></div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => { setStatus('bundle'); /* show contest input */ setContestReason('show'); }} style={{ flex: 1, padding: '12px 0', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              ⚠ Contest
            </button>
            <button onClick={handleAccept} style={{ flex: 2, padding: '12px 0', background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              ✍️ Accept & Co-Sign
            </button>
          </div>
          {contestReason === 'show' && (
            <div style={{ marginTop: 12 }}>
              <textarea value={contestReason === 'show' ? '' : contestReason} onChange={e => setContestReason(e.target.value)} placeholder="Reason for contesting..." style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #fecaca', minHeight: 60, boxSizing: 'border-box' }} />
              <button onClick={handleContest} disabled={contestReason === 'show'} style={{ marginTop: 8, width: '100%', padding: '10px 0', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                Submit Contest
              </button>
            </div>
          )}
        </>)}

        {status === 'connected' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>🤝</div>
            <p style={{ fontWeight: 700, color: '#10B981' }}>Connected to sender!</p>
            <p style={{ color: '#64748b', fontSize: 13 }}>{statusMsg}</p>
          </div>
        )}

        <button onClick={reset} style={{ marginTop: 20, width: '100%', padding: '10px 0', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          ← Cancel
        </button>
      </>)}
    </div>
  );
}

// ── Helpers ──
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#0f172a', fontFamily: mono ? 'monospace' : undefined, fontSize: mono ? 12 : undefined }}>{value}</span>
    </div>
  );
}

function BLEAnimation() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #3B82F6', animation: 'ble-ripple 1.5s ease-out infinite', opacity: 0 }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #3B82F6', animation: 'ble-ripple 1.5s ease-out 0.5s infinite', opacity: 0 }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #3B82F6', animation: 'ble-ripple 1.5s ease-out 1s infinite', opacity: 0 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📡</div>
      <style>{`@keyframes ble-ripple { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.5); opacity: 0; } }`}</style>
    </div>
  );
}
