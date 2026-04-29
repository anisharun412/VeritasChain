import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { useWebAuthn } from './features/auth/useWebAuthn';
import { ShipmentList } from './features/shipments/ShipmentList';
import { InitiateHandoff } from './features/handoff/sender/InitiateHandoff';
import { AcceptHandoff } from './features/handoff/receiver/AcceptHandoff';
import { OfflineQueue } from './features/offline/OfflineQueue';
import { useOfflineQueue } from './features/offline/useOfflineQueue';
import './index.css';

/* ─────────────────── Login ─────────────────── */
function LoginPage() {
  const { authenticateWithBiometric, isSupported } = useWebAuthn();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBiometric = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const identity = await authenticateWithBiometric();
      if (identity) login(identity);
      else setError('Authentication returned no identity.');
    } catch (e: any) {
      setError(e?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  /** Demo login — skip WebAuthn for testing in non-platform browsers */
  const handleDemo = () => {
    login({
      did: 'did:veritaschain:demo123',
      publicKey: '0x' + '0'.repeat(64),
      biometricEnrolled: false,
      organization: 'Demo Logistics Co.',
    });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-wrap">🔗</div>
        <h1>VeritasChain</h1>
        <p>Secure Custody Handoff Protocol</p>

        <hr className="login-divider" />

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem', textAlign: 'left' }}>
            ⚠ {error}
          </div>
        )}

        <button className="biometric-btn" onClick={handleBiometric} disabled={isLoading}>
          {isLoading ? <span className="spinner" /> : '🔐'}
          {isLoading ? 'Authenticating…' : 'Login with Biometric (WebAuthn)'}
        </button>

        {!isSupported && (
          <p className="login-hint" style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
            WebAuthn not detected on this device
          </p>
        )}

        <button className="demo-btn" onClick={handleDemo}>
          ▶ Enter Demo Mode (skip biometric)
        </button>

        <p className="login-hint">
          Uses WebAuthn (fingerprint / Face ID) for secure, passwordless authentication
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── App Shell ─────────────────── */
function AppShell() {
  const { authState, logout } = useAuth();
  const { queue, stats, sync, isSyncing } = useOfflineQueue();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Header */}
      <header className="app-header">
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div className="logo-icon">V</div>
          <div>
            <div className="logo-text">VeritasChain</div>
            <div className="logo-sub">{authState.user?.organization}</div>
          </div>
        </div>

        <div className="header-actions">
          <span className="user-chip" title={authState.user?.did}>
            {authState.user?.did?.slice(0, 22)}…
          </span>
          <button className="logout-btn" onClick={logout}>Sign out</button>
        </div>
      </header>

      {/* Page content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ShipmentList />} />
          <Route path="/handoff/send/:id" element={<InitiateHandoffRoute />} />
          <Route path="/handoff/receive/:id" element={<AcceptHandoffRoute />} />
        </Routes>
      </main>

      {/* Offline widget */}
      <OfflineQueue queue={queue} stats={stats} onSync={sync} isSyncing={isSyncing} />
    </div>
  );
}

/* Helper wrappers that pass mock shipment until real routing is wired */
function InitiateHandoffRoute() {
  const navigate = useNavigate();
  const mockShipment = {
    id: 'SHIP-001',
    origin: 'Warehouse A',
    destination: 'Distribution Center B',
    status: 'pending' as const,
    freshnessScore: 85,
    assignedTo: 'demo',
    documents: [
      { name: 'Temp Log', hash: 'abc123def456', mimeType: 'application/json' },
      { name: 'Certificate', hash: 'ghi789jkl012', mimeType: 'application/pdf' },
    ],
    handoffChain: [],
    createdAt: Date.now() / 1000,
    updatedAt: Date.now() / 1000,
  };
  return <InitiateHandoff shipment={mockShipment} onComplete={() => navigate('/')} />;
}

function AcceptHandoffRoute() {
  const navigate = useNavigate();
  const mockShipment = {
    id: 'SHIP-001',
    origin: 'Warehouse A',
    destination: 'Distribution Center B',
    status: 'in-transit' as const,
    freshnessScore: 79,
    assignedTo: 'demo',
    documents: [
      { name: 'Temp Log', hash: 'abc123def456', mimeType: 'application/json' },
    ],
    handoffChain: [],
    createdAt: Date.now() / 1000,
    updatedAt: Date.now() / 1000,
  };
  return <AcceptHandoff shipment={mockShipment} onComplete={() => navigate('/')} />;
}

/* ─────────────────── Root ─────────────────── */
function AppContent() {
  const { authState } = useAuth();
  return authState.isAuthenticated ? <AppShell /> : <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
