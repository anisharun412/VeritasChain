import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, MOCK_USERS } from './AuthContext';
import { useBiometricAuth } from './useBiometricAuth';
import { UserRole, getRoleDefinition } from './roles';

// ─── Types ────────────────────────────────────────────

type TabRole = UserRole | 'all';

const ROLE_TABS: { role: TabRole; label: string; icon: string }[] = [
  { role: 'all', label: 'All', icon: '👤' },
  ...Object.values(UserRole).map((r) => ({
    role: r as TabRole,
    label: getRoleDefinition(r).label.split('/')[0].trim(),
    icon: getRoleDefinition(r).icon,
  })),
];

// ─── Component ────────────────────────────────────────

export default function LoginPage() {
  const { login, isLoading, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();
  const bio = useBiometricAuth();

  const [tab, setTab] = useState<TabRole>('all');
  const [bioOpen, setBioOpen] = useState(false);
  const [bioMode, setBioMode] = useState<'login' | 'register'>('login');

  // Register form state
  const [selectedRegisterUser, setSelectedRegisterUser] = useState(MOCK_USERS[0].userId);
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioPending, setBioPending] = useState(false);
  const [bioSuccess, setBioSuccess] = useState(false);

  // ─── Redirect on auth ──────────────────────────────

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // ─── Filtered identity cards ───────────────────────

  const filtered = useMemo(() =>
    tab === 'all' ? MOCK_USERS : MOCK_USERS.filter((u) => u.role === tab),
  [tab]);

  // ─── Handlers ─────────────────────────────────────

  const handleDemoLogin = async (userId: string) => {
    clearError();
    await login(userId);
  };

  const handleBiometricAuthenticate = async () => {
    setBioPending(true);
    setBioError(null);
    const userId = await bio.authenticate();
    if (userId) {
      // Check if this userId exists in MOCK_USERS
      const user = MOCK_USERS.find((u) => u.userId === userId);
      if (user) {
        await login(user.userId);
      } else {
        setBioError(
          `Credential found but DID "${userId}" is not registered in this network. Use a demo card instead.`,
        );
      }
    } else {
      setBioError(bio.error || 'Biometric authentication failed. Make sure you have registered first.');
    }
    setBioPending(false);
  };

  const handleBiometricRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBioError(null);
    const user = MOCK_USERS.find((u) => u.userId === selectedRegisterUser);
    if (!user) return;

    const credId = await bio.register(user.userId, user.displayName);
    if (credId) {
      setBioSuccess(true);
      setTimeout(() => login(user.userId), 800);
    } else {
      setBioError(bio.error || 'Biometric registration failed. The browser may have blocked it.');
    }
  };

  // ─── Biometric panel ──────────────────────────────

  const BiometricPanel = () => (
    <div style={{
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '0.75rem',
      marginBottom: '1.25rem',
      overflow: 'hidden',
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setBioOpen(!bioOpen)}
        style={{
          width: '100%', padding: '0.9rem 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600 }}>
          🔐 Biometric Login
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>
            (WebAuthn · fingerprint / Face ID)
          </span>
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
          {bioOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Collapsible body */}
      {bioOpen && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0 1rem' }}>
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setBioMode(m); setBioError(null); setBioSuccess(false); }}
                style={{
                  flex: 1, padding: '0.5rem',
                  background: bioMode === m ? 'var(--emerald)' : 'rgba(255,255,255,0.08)',
                  border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                  color: '#fff', fontWeight: 600, fontSize: '0.85rem',
                }}
              >
                {m === 'login' ? '☝ Authenticate' : '+ Register New'}
              </button>
            ))}
          </div>

          {/* ── Authenticate Mode ── */}
          {bioMode === 'login' && (
            <div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
                Use a passkey you previously registered on this device. The system will automatically load your role.
              </p>
              <button
                className="biometric-btn"
                onClick={handleBiometricAuthenticate}
                disabled={bioPending || isLoading}
              >
                {bioPending
                  ? <><span className="spinner" /> Scanning…</>
                  : '☝ Use Fingerprint / Face ID'}
              </button>
            </div>
          )}

          {/* ── Register Mode ── */}
          {bioMode === 'register' && (
            <form onSubmit={handleBiometricRegister}>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
                Bind your biometric to a role identity. Select your role first — the system will create a secure passkey.
              </p>

              {/* Role + DID selector */}
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Select Your Role Identity</label>
                <select
                  className="form-select"
                  value={selectedRegisterUser}
                  onChange={(e) => setSelectedRegisterUser(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  {MOCK_USERS.map((u) => {
                    const def = getRoleDefinition(u.role);
                    return (
                      <option key={u.userId} value={u.userId} style={{ background: '#1a2a3a', color: '#fff' }}>
                        {def.icon} {u.displayName} — {def.label} ({u.organization})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Preview of selected identity */}
              {(() => {
                const u = MOCK_USERS.find((u) => u.userId === selectedRegisterUser);
                const def = u ? getRoleDefinition(u.role) : null;
                return u && def ? (
                  <div style={{
                    background: 'rgba(255,255,255,0.06)', borderRadius: '0.5rem',
                    padding: '0.65rem 0.9rem', marginBottom: '0.75rem',
                    fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)',
                  }}>
                    <span style={{ color: def.color, fontWeight: 600 }}>{def.icon} {def.label}</span>
                    <div style={{ fontFamily: 'monospace', marginTop: '0.2rem', fontSize: '0.7rem' }}>
                      {u.userId}
                    </div>
                  </div>
                ) : null;
              })()}

              {bioSuccess && (
                <div className="alert alert-success" style={{ marginBottom: '0.75rem' }}>
                  ✅ Biometric registered! Logging you in…
                </div>
              )}

              <button
                type="submit"
                className="biometric-btn"
                disabled={bio.isLoading || bioPending || bioSuccess}
              >
                {bio.isLoading
                  ? <><span className="spinner" /> Scanning biometric…</>
                  : '🔐 Scan Biometric & Register'}
              </button>
            </form>
          )}

          {bioError && (
            <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
              ⚠ {bioError}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ─── Main Render ──────────────────────────────────

  return (
    <div className="login-page" style={{ alignItems: 'flex-start', paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 700, margin: '0 auto', padding: '0 1rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="login-logo-wrap" style={{ margin: '0 auto 1rem' }}>🔗</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>VeritasChain</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', marginTop: '0.25rem' }}>
            Select your identity to access the network
          </p>
        </div>

        {/* ── Identity Cards (PRIMARY login method) ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            marginBottom: '1rem', flexWrap: 'wrap',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>
              Quick Login:
            </span>
            {ROLE_TABS.map((t) => (
              <button
                key={String(t.role)}
                onClick={() => setTab(t.role)}
                className={tab === t.role ? 'role-tab role-tab-active' : 'role-tab'}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="identity-grid">
            {filtered.map((user) => {
              const def = getRoleDefinition(user.role);
              return (
                <button
                  key={user.userId}
                  className="identity-card"
                  onClick={() => handleDemoLogin(user.userId)}
                  disabled={isLoading}
                >
                  <div className="identity-card-bar" style={{ background: def.color }} />
                  <span className="identity-role-badge" style={{ background: def.color + '22', color: def.color }}>
                    {def.icon} {def.label}
                  </span>
                  <div className="identity-name">{user.displayName}</div>
                  <div className="identity-org">{user.organization}</div>
                  <div className="identity-did">{user.userId}</div>
                  <div className="identity-arrow">Sign in →</div>
                </button>
              );
            })}
          </div>

          {isLoading && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
                <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'var(--emerald)' }} />
                Authenticating…
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
            OR USE HARDWARE BIOMETRIC
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* ── Biometric Section (SECONDARY, collapsible) ── */}
        {bio.isSupported ? (
          <BiometricPanel />
        ) : (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginBottom: '1rem' }}>
            Biometric login requires a device with a fingerprint sensor / Face ID and a secure browser (Chrome/Edge/Safari).
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', marginTop: '1rem' }}>
          Secured by WebAuthn · ECDSA keys encrypted on-device · Works offline
        </p>
      </div>
    </div>
  );
}
