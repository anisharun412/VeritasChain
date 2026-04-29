import React from 'react';
import { SignedHandoff } from '@veritaschain/types';

interface HandoffCardProps {
  handoff: SignedHandoff;
  onSelect?: (handoff: SignedHandoff) => void;
}

export const HandoffCard: React.FC<HandoffCardProps> = ({ handoff, onSelect }) => {
  const date = new Date(handoff.bundle.utcTimestamp * 1000);
  const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

  return (
    <div
      onClick={() => onSelect?.(handoff)}
      className="card"
      style={{ cursor: onSelect ? 'pointer' : 'default', transition: 'box-shadow 0.2s' }}
      onMouseEnter={e => onSelect && ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)')}
      onMouseLeave={e => onSelect && ((e.currentTarget as HTMLElement).style.boxShadow = '')}
    >
      <div className="card-body">
        <div className="flex justify-between items-center mb-4" style={{ marginBottom: '0.75rem' }}>
          <div>
            <div className="font-semibold">{handoff.bundle.shipmentId}</div>
            <div className="text-xs text-gray" style={{ marginTop: '0.15rem' }}>{dateStr}</div>
          </div>
          {handoff.isContested && (
            <span className="status-indicator status-contested">
              <span className="status-dot" />CONTESTED
            </span>
          )}
        </div>

        <div className="space-y-3">
          {[
            { label: 'Sender Sig', value: handoff.senderSig.slice(0, 12) + '…' },
            { label: 'Receiver Sig', value: handoff.receiverSig ? handoff.receiverSig.slice(0, 12) + '…' : '—' },
            { label: 'Merkle Root', value: handoff.merkleRoot.slice(0, 12) + '…' },
          ].map(row => (
            <div key={row.label} className="flex gap-2">
              <span className="text-xs text-gray" style={{ minWidth: '6rem' }}>{row.label}:</span>
              <span className="text-xs text-mono">{row.value}</span>
            </div>
          ))}
        </div>

        {handoff.isContested && handoff.contestReason && (
          <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
            Reason: {handoff.contestReason}
          </div>
        )}
      </div>
    </div>
  );
};
