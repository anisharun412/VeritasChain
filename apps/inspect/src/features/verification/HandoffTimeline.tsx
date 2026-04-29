import React from 'react';
import { SignedHandoff } from '@veritaschain/types';

interface HandoffTimelineProps {
  handoffs: SignedHandoff[];
}

export const HandoffTimeline: React.FC<HandoffTimelineProps> = ({ handoffs }) => {
  if (handoffs.length === 0) {
    return (
      <div className="card">
        <div className="card-header"><span className="card-title">⛓ Chain of Custody</span></div>
        <div className="card-body" style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          No handoff history yet — this is the first leg.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">⛓ Chain of Custody</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{handoffs.length} handoff{handoffs.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="card-body">
        <div className="timeline">
          {handoffs.map((handoff, i) => {
            const date = new Date(handoff.bundle.utcTimestamp * 1000).toLocaleString();
            const isLast = i === handoffs.length - 1;
            return (
              <div key={i} className="timeline-item">
                <div className="timeline-spine">
                  <div
                    className="timeline-dot"
                    style={{ background: handoff.isContested ? 'var(--red)' : 'var(--emerald)' }}
                  />
                  {!isLast && <div className="timeline-line" />}
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-title">
                      {handoff.isContested ? '🚨 Contested' : '✅ Completed'} Handoff #{i + 1}
                    </span>
                    <span className="timeline-time">{date}</span>
                  </div>
                  <div className="hash-row">
                    Merkle: {handoff.merkleRoot.slice(0, 24)}…
                  </div>
                  {handoff.isContested && handoff.contestReason && (
                    <div className="alert alert-error" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                      {handoff.contestReason}
                    </div>
                  )}
                  <div className="timeline-body">
                    {handoff.bundle.documentHashes.length} doc{handoff.bundle.documentHashes.length !== 1 ? 's' : ''}
                    {handoff.bundle.fieldNotes && ` · ${handoff.bundle.fieldNotes}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
