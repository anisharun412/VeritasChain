import React, { useState } from 'react';
import { useContract } from './useContract';
import { useMetaMask } from './useMetaMask';

interface ChainSubmitProps {
  shipmentId: string;
  merkleRoot: string;        // hex string from Merkle tree
  zkProofHash: string;       // proof reference
  receiverAddress?: string;  // Ethereum address of receiver
  mode: 'send' | 'contest';
}

const GANACHE_EXPLORER = 'http://localhost:7545'; // Ganache GUI transactions tab

export function ChainSubmit({ shipmentId, merkleRoot, zkProofHash, receiverAddress, mode }: ChainSubmitProps) {
  const { isConnected, isGanache, connect } = useMetaMask();
  const { isDeployed, isSubmitting, error, lastTx, recordHandoff, contestHandoff, clearTx } = useContract();
  const [contestReason, setContestReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (mode === 'send') {
      const receiver = receiverAddress || '0x0000000000000000000000000000000000000001';
      const result = await recordHandoff(shipmentId, receiver, merkleRoot, zkProofHash);
      if (result) setSubmitted(true);
    } else {
      if (!contestReason.trim()) return;
      const result = await contestHandoff(shipmentId, contestReason);
      if (result) setSubmitted(true);
    }
  };

  // ─── Success state ─────────────────────────────────────────────────

  if (submitted && lastTx) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #065f46, #059669)',
        borderRadius: '0.75rem', padding: '1.25rem',
        border: '1px solid #6ee7b7',
      }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>
          ✅ {mode === 'send' ? 'Handoff Recorded On-Chain' : 'Contest Recorded On-Chain'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Tx Hash:</span>
            <code style={{
              fontSize: '0.7rem', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.5rem',
              borderRadius: '0.25rem', color: '#6ee7b7', wordBreak: 'break-all',
            }}>
              {lastTx.txHash}
            </code>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Block:</span>
            <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>#{lastTx.blockNumber}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Gas Used:</span>
            <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>{lastTx.gasUsed}</span>
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
          Check in Ganache UI → Transactions tab to see the full record.
        </div>
        <button
          onClick={() => { clearTx(); setSubmitted(false); }}
          style={{
            marginTop: '0.75rem', background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
            borderRadius: '0.4rem', padding: '0.35rem 0.75rem',
            fontSize: '0.75rem', cursor: 'pointer',
          }}
        >
          Submit Another
        </button>
      </div>
    );
  }

  // ─── Not connected ─────────────────────────────────────────────────

  if (!isConnected || !isGanache) {
    return (
      <div style={{
        background: 'rgba(246,133,27,0.1)', border: '1px solid rgba(246,133,27,0.4)',
        borderRadius: '0.75rem', padding: '1rem',
      }}>
        <div style={{ fontWeight: 600, color: '#F6851B', marginBottom: '0.4rem' }}>
          🦊 MetaMask required to submit to Ganache
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.75rem' }}>
          {!isConnected
            ? 'Connect your wallet to record this handoff on-chain.'
            : 'Switch MetaMask to the Ganache network (chainId 1337).'}
        </div>
        <button className="btn" style={{ background: '#F6851B', color: '#fff' }} onClick={connect}>
          🦊 Connect MetaMask
        </button>
      </div>
    );
  }

  // ─── Contract not deployed ─────────────────────────────────────────

  if (!isDeployed) {
    return (
      <div className="alert alert-warning">
        ⚠ Contract not deployed yet. Run:<br />
        <code style={{ fontSize: '0.8rem' }}>cd packages/contracts && pnpm deploy</code>
        <br />Then add <code>VITE_CONTRACT_ADDRESS=0x…</code> to <code>apps/edge-pwa/.env.local</code>
      </div>
    );
  }

  // ─── Submit form ───────────────────────────────────────────────────

  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--gray-200)',
      borderRadius: '0.75rem', padding: '1.25rem',
    }}>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem', color: 'var(--gray-900)' }}>
        ⛓ {mode === 'send' ? 'Record Handoff on Ganache' : 'Contest Handoff on Ganache'}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>
        {mode === 'send'
          ? 'This will send a MetaMask transaction to store the Merkle root and ZK proof hash permanently on the local blockchain.'
          : 'This will flag this handoff as contested. The reason will be stored permanently on-chain.'}
      </div>

      {/* Merkle root preview */}
      <div style={{ fontSize: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ color: 'var(--gray-500)' }}>Merkle Root: </span>
        <code style={{ fontFamily: 'monospace', color: 'var(--gray-700)' }}>
          {merkleRoot ? merkleRoot.slice(0, 18) + '…' : '(computing…)'}
        </code>
      </div>

      {/* Contest reason input */}
      {mode === 'contest' && (
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label className="form-label">Reason for Contesting</label>
          <textarea
            className="form-textarea"
            value={contestReason}
            onChange={(e) => setContestReason(e.target.value)}
            placeholder="e.g. Temperature breach detected at 14:32 — reading of 11.4°C exceeds 8°C limit"
            style={{ minHeight: '4rem' }}
          />
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>
          ⚠ {error}
        </div>
      )}

      <button
        className={mode === 'send' ? 'btn btn-primary btn-full' : 'btn btn-danger btn-full'}
        onClick={handleSubmit}
        disabled={isSubmitting || (mode === 'contest' && !contestReason.trim())}
      >
        {isSubmitting
          ? <><span className="spinner" /> Waiting for MetaMask…</>
          : mode === 'send'
            ? '⛓ Submit to Ganache'
            : '🚩 Contest on Ganache'}
      </button>
      <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '0.5rem' }}>
        MetaMask will pop up to confirm the transaction
      </div>
    </div>
  );
}
