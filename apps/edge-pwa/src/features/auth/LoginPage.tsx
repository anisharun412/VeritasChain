import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, MOCK_USERS } from './AuthContext';
import { useBiometricAuth } from './useBiometricAuth';
import { UserRole, getRoleDefinition } from './roles';

type TabRole = UserRole | 'all';

const ROLE_TABS: { role: TabRole; label: string; icon: string }[] = [
  { role: 'all', label: 'All', icon: '👤' },
  ...Object.values(UserRole).map((r) => ({
    role: r as TabRole,
    label: getRoleDefinition(r).label.split('/')[0].trim(),
    icon: getRoleDefinition(r).icon,
  })),
];

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.MANUFACTURER]: 'Create shipments and initiate the cold chain verification process',
  [UserRole.CARRIER]: 'Transport goods, monitor temperature, and manage handoffs between parties',
  [UserRole.RECEIVER]: 'Accept deliveries, verify integrity with NFC seals and ZK proofs',
  [UserRole.REGULATOR]: 'Audit all shipments, flag anomalies, and perform compliance checks',
};

export default function LoginPage() {
  const { login, isLoading, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();
  const bio = useBiometricAuth();

  const [tab, setTab] = useState<TabRole>('all');
  const [bioOpen, setBioOpen] = useState(false);
  const [bioMode, setBioMode] = useState<'login' | 'register'>('login');
  const [selectedRegisterUser, setSelectedRegisterUser] = useState(MOCK_USERS[0].userId);
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioPending, setBioPending] = useState(false);
  const [bioSuccess, setBioSuccess] = useState(false);
  const [loadingUser, setLoadingUser] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const filtered = useMemo(() =>
    tab === 'all' ? MOCK_USERS : MOCK_USERS.filter((u) => u.role === tab),
  [tab]);

  const handleDemoLogin = async (userId: string) => {
    clearError();
    setLoadingUser(userId);
    await login(userId);
    setLoadingUser(null);
  };

  const handleBiometricAuthenticate = async () => {
    setBioPending(true); setBioError(null);
    const userId = await bio.authenticate();
    if (userId) {
      const user = MOCK_USERS.find((u) => u.userId === userId);
      if (user) await login(user.userId);
      else setBioError(`Credential found but DID "${userId}" is not registered.`);
    } else {
      setBioError(bio.error || 'Biometric authentication failed.');
    }
    setBioPending(false);
  };

  const handleBiometricRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setBioError(null);
    const user = MOCK_USERS.find((u) => u.userId === selectedRegisterUser);
    if (!user) return;
    const credId = await bio.register(user.userId, user.displayName);
    if (credId) { setBioSuccess(true); setTimeout(() => login(user.userId), 800); }
    else setBioError(bio.error || 'Registration failed.');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '2rem 1rem', overflowY: 'auto',
    }}>
      {/* Decorative gradient orbs */}
      <div style={{
        position: 'fixed', top: '-20%', right: '-10%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-15%', left: '-10%', width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 720, position: 'relative', zIndex: 1 }}>

        {/* ── Logo & Tagline ── */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 72, height: 72, margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, #10B981, #34d399)',
            borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, boxShadow: '0 12px 40px rgba(16,185,129,0.35)',
          }}>🛡️</div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            VeritasChain
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 6, fontSize: '1.05rem', fontWeight: 400 }}>
            Secure Cold Chain Handoffs
          </p>
        </div>

        {/* ── Role Filter Tabs ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {ROLE_TABS.map((t) => (
            <button
              key={String(t.role)}
              onClick={() => setTab(t.role)}
              style={{
                padding: '7px 16px', borderRadius: 999,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: tab === t.role ? '#10B981' : 'rgba(255,255,255,0.08)',
                border: tab === t.role ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.12)',
                color: tab === t.role ? '#fff' : 'rgba(255,255,255,0.65)',
                transition: 'all 0.2s',
                minHeight: 36,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Identity Cards Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 14,
          marginBottom: '1.5rem',
        }}>
          {filtered.map((user) => {
            const def = getRoleDefinition(user.role);
            const isThisLoading = loadingUser === user.userId;
            return (
              <button
                key={user.userId}
                onClick={() => handleDemoLogin(user.userId)}
                disabled={isLoading}
                style={{
                  position: 'relative', overflow: 'hidden', textAlign: 'left',
                  background: isThisLoading ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${isThisLoading ? def.color + '66' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 14, padding: '1.25rem 1.25rem 1rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.25s ease',
                  opacity: isLoading && !isThisLoading ? 0.5 : 1,
                  minHeight: 44,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.11)';
                    e.currentTarget.style.borderColor = def.color + '55';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Top color bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: def.color }} />

                {/* Role emoji + badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>{def.icon}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 999,
                    padding: '3px 10px',
                    background: def.color + '22', color: def.color,
                  }}>{def.label}</span>
                </div>

                {/* Name + org */}
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
                  {user.displayName}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                  {user.organization}
                </div>

                {/* Role description */}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, marginBottom: 10 }}>
                  {ROLE_DESCRIPTIONS[user.role]}
                </div>

                {/* DID + action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%',
                  }}>{user.userId}</span>
                  {isThisLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: def.color, fontSize: 13, fontWeight: 600 }}>
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: def.color + '33', borderTopColor: def.color }} />
                      Signing in…
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#10B981', opacity: 0.7 }}>
                      Sign in →
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '12px 16px', marginBottom: '1rem',
            display: 'flex', alignItems: 'center', gap: 10, color: '#fca5a5', fontSize: 14,
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
            OR USE HARDWARE BIOMETRIC
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* ── Biometric Panel ── */}
        <div style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, overflow: 'hidden', marginBottom: '1.5rem',
        }}>
          <button onClick={() => setBioOpen(!bioOpen)} style={{
            width: '100%', padding: '14px 20px', background: 'transparent', border: 'none',
            cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', minHeight: 48,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
              🔐 Biometric Login
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
                WebAuthn · Fingerprint / Face ID
              </span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{bioOpen ? '▲' : '▼'}</span>
          </button>

          {bioOpen && (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Mode tabs */}
              <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
                {(['login', 'register'] as const).map((m) => (
                  <button key={m} onClick={() => { setBioMode(m); setBioError(null); setBioSuccess(false); }}
                    style={{
                      flex: 1, padding: 10, border: 'none', borderRadius: 8, cursor: 'pointer',
                      background: bioMode === m ? '#10B981' : 'rgba(255,255,255,0.08)',
                      color: '#fff', fontWeight: 600, fontSize: 13, minHeight: 44,
                    }}>
                    {m === 'login' ? '☝ Authenticate' : '+ Register New'}
                  </button>
                ))}
              </div>

              {bioMode === 'login' && (
                <div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>
                    Use a previously registered passkey. Your role loads automatically.
                  </p>
                  <button className="biometric-btn" onClick={handleBiometricAuthenticate}
                    disabled={bioPending || isLoading} style={{ minHeight: 48 }}>
                    {bioPending ? <><span className="spinner" /> Scanning…</> : '☝ Use Fingerprint / Face ID'}
                  </button>
                </div>
              )}

              {bioMode === 'register' && (
                <form onSubmit={handleBiometricRegister}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>
                    Bind your biometric to a role identity.
                  </p>
                  <select value={selectedRegisterUser} onChange={(e) => setSelectedRegisterUser(e.target.value)}
                    style={{
                      width: '100%', padding: 10, background: 'rgba(255,255,255,0.08)', color: '#fff',
                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, marginBottom: 12,
                      fontSize: 13, minHeight: 44,
                    }}>
                    {MOCK_USERS.map((u) => {
                      const d = getRoleDefinition(u.role);
                      return <option key={u.userId} value={u.userId} style={{ background: '#1e293b', color: '#fff' }}>
                        {d.icon} {u.displayName} — {d.label}
                      </option>;
                    })}
                  </select>
                  {bioSuccess && (
                    <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: 12, marginBottom: 12, color: '#6ee7b7', fontSize: 13 }}>
                      ✅ Biometric registered! Logging you in…
                    </div>
                  )}
                  <button type="submit" className="biometric-btn"
                    disabled={bio.isLoading || bioPending || bioSuccess} style={{ minHeight: 48 }}>
                    {bio.isLoading ? <><span className="spinner" /> Scanning…</> : '🔐 Scan & Register'}
                  </button>
                </form>
              )}

              {bioError && (
                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: 12, marginTop: 12, color: '#fca5a5', fontSize: 13 }}>
                  ⚠ {bioError}
                </div>
              )}

              {!bio.isSupported && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 12, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  💡 Biometric unavailable — use a PIN or select an identity card above
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
          Secured by WebAuthn · ECDSA keys encrypted on-device · Offline-first
        </p>
      </div>
    </div>
  );
}
