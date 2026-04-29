import React from 'react';

interface NFCTapPromptProps {
  isScanning: boolean;
  onCancel: () => void;
}

export const NFCTapPrompt: React.FC<NFCTapPromptProps> = ({ isScanning, onCancel }) => {
  return (
    <div className="nfc-prompt-overlay">
      <div className="nfc-prompt-card">
        <div className="nfc-pulse">📱</div>
        <h2 className="font-bold" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
          {isScanning ? 'Scanning…' : 'Tap NFC Seal'}
        </h2>
        <p className="text-sm text-gray" style={{ marginBottom: '1.5rem' }}>
          Hold the device near the NFC seal tag on the shipment packaging.
        </p>
        {isScanning && (
          <div className="flex items-center justify-between" style={{ marginBottom: '1rem', justifyContent: 'center', gap: '0.5rem' }}>
            <div className="spinner" style={{ borderColor: 'var(--blue-light)', borderTopColor: 'var(--blue)' }} />
            <span className="text-sm" style={{ color: 'var(--blue)' }}>Waiting for NFC…</span>
          </div>
        )}
        <button className="btn btn-ghost btn-full" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};
