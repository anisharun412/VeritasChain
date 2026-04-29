import React from 'react';
import { NFCData } from '@veritaschain/types';

interface SealVerificationProps {
  nfcData: NFCData;
  isValid: boolean;
}

export const SealVerification: React.FC<SealVerificationProps> = ({ nfcData, isValid }) => {
  if (isValid) {
    return (
      <div className="seal-valid">
        <span className="seal-icon">✅</span>
        <div>
          <div className="font-semibold" style={{ color: '#065f46' }}>Seal Verified — Intact</div>
          <div className="text-xs text-gray" style={{ marginTop: '0.2rem' }}>
            Chip ID: <span className="text-mono">{nfcData.chipId}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="seal-invalid">
      <span className="seal-icon">🚨</span>
      <div>
        <div className="font-semibold" style={{ color: 'var(--red-dark)' }}>Seal Not Yet Verified</div>
        <div className="text-xs" style={{ marginTop: '0.2rem', color: 'var(--red-dark)' }}>
          Chip ID: <span className="text-mono">{nfcData.chipId}</span> · Tap "Verify Seal" to confirm
        </div>
      </div>
    </div>
  );
};
