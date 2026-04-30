import React from 'react';
import { useMetaMask } from './useMetaMask';
import { contracts, allDeployed } from './contractABI';

export function WalletConnect() {
  const { isInstalled, isConnected, isConnecting, shortAddress, isGanache, error, connect, disconnect } = useMetaMask();

  // ─── Not installed ────────────────────────────────────────────────

  if (!isInstalled) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: '0.75rem', padding: '0.35rem 0.75rem',
          background: '#F6851B', color: '#fff', border: 'none',
          borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600,
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        }}
      >
        🦊 Install MetaMask
      </a>
    );
  }

  // ─── Not connected ────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={connect}
          disabled={isConnecting}
          style={{
            fontSize: '0.75rem', padding: '0.35rem 0.85rem',
            background: isConnecting ? '#aaa' : '#F6851B', color: '#fff',
            border: 'none', borderRadius: '0.4rem', cursor: isConnecting ? 'not-allowed' : 'pointer',
            fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            transition: 'background 0.15s',
          }}
        >
          {isConnecting
            ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', width: '0.75rem', height: '0.75rem' }} /> Connecting…</>
            : '🦊 Connect MetaMask'}
        </button>
        {error && (
          <span style={{ fontSize: '0.7rem', color: '#ef4444', maxWidth: 180, lineHeight: 1.3 }}>
            ⚠ {error}
          </span>
        )}
      </div>
    );
  }

  // ─── Connected ────────────────────────────────────────────────────

  const deployedCount = Object.values(contracts).filter(c => c.deployed).length;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>

      {/* Network badge */}
      {isGanache ? (
        <span style={{
          fontSize: '0.68rem', padding: '0.2rem 0.55rem',
          background: '#D1FAE5', color: '#065f46',
          borderRadius: '9999px', fontWeight: 600,
        }}>
          ⛓ Ganache
        </span>
      ) : (
        <span style={{
          fontSize: '0.68rem', padding: '0.2rem 0.55rem',
          background: '#FEF9C3', color: '#78350f',
          borderRadius: '9999px', fontWeight: 600,
        }}>
          ⚠ Wrong Network
        </span>
      )}

      {/* Contracts badge */}
      {allDeployed ? (
        <span style={{
          fontSize: '0.68rem', padding: '0.2rem 0.55rem',
          background: '#EFF6FF', color: '#1D4ED8',
          borderRadius: '9999px', fontWeight: 600,
        }}>
          📄 {deployedCount}/3 contracts
        </span>
      ) : (
        <span style={{
          fontSize: '0.68rem', padding: '0.2rem 0.55rem',
          background: '#FEF2F2', color: '#991b1b',
          borderRadius: '9999px', fontWeight: 600,
        }}>
          ⚠ {deployedCount}/3 deployed
        </span>
      )}

      {/* Account pill */}
      <span style={{
        fontSize: '0.75rem', padding: '0.25rem 0.65rem',
        background: 'rgba(255,255,255,0.15)', color: '#fff',
        borderRadius: '9999px', fontWeight: 500,
        fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.2)',
      }}>
        🦊 {shortAddress}
      </span>

      <button
        onClick={disconnect}
        style={{
          fontSize: '0.68rem', padding: '0.2rem 0.5rem',
          background: 'transparent', color: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '0.3rem', cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
}
