import React from 'react';
import { HandoffBundle } from '@veritaschain/types';

interface HandoffSummaryProps {
  bundle: HandoffBundle;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const HandoffSummary: React.FC<HandoffSummaryProps> = ({
  bundle, onConfirm, onCancel, isLoading = false,
}) => {
  const location = `${bundle.gpsLat.toFixed(4)}, ${bundle.gpsLng.toFixed(4)}`;
  const timestamp = new Date(bundle.utcTimestamp * 1000).toLocaleString();

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">📋 Handoff Summary</span>
      </div>
      <div className="card-body space-y-3">
        {[
          { label: 'Shipment ID', value: bundle.shipmentId },
          { label: 'Location', value: location },
          { label: 'Timestamp', value: timestamp },
          { label: 'Previous Anchor', value: bundle.previousAnchor ? bundle.previousAnchor.slice(0, 16) + '…' : 'Genesis' },
        ].map(row => (
          <div key={row.label}>
            <div className="form-label">{row.label}</div>
            <div className="text-sm text-mono">{row.value}</div>
          </div>
        ))}

        <div>
          <div className="form-label">Document Hashes</div>
          {bundle.documentHashes.map((hash, i) => (
            <div key={i} className="text-xs text-mono text-gray" style={{ padding: '0.2rem 0' }}>
              [{i + 1}] {hash.slice(0, 20)}…
            </div>
          ))}
        </div>

        {bundle.fieldNotes && (
          <div className="alert alert-info">
            📝 Notes: {bundle.fieldNotes}
          </div>
        )}

        <div className="flex gap-3 border-top">
          <button className="btn btn-ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button className="btn btn-success btn-full" onClick={onConfirm} disabled={isLoading}>
            {isLoading
              ? <><span className="spinner" /> Signing…</>
              : '✍ Confirm & Co-Sign'}
          </button>
        </div>
      </div>
    </div>
  );
};
