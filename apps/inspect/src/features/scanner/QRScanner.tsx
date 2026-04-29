import React, { useState } from 'react';
import { useQRScanner } from './useQRScanner';

interface QRScannerProps {
  onScanned: (shipmentId: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanned }) => {
  const { isScanning, error, scan } = useQRScanner();
  const [manualId, setManualId] = useState('');

  const handleManual = () => {
    const id = manualId.trim();
    if (id) { onScanned(id); setManualId(''); }
  };

  const handleScan = async () => {
    await scan();
    // In production the hook calls onScanned directly
    // Demo: prompt is handled inside useQRScanner and returns result via result state
  };

  const handleDemo = () => onScanned('SHIP-001');

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div className="qr-scan-area" onClick={handleScan}>
        <div className="qr-icon">📷</div>
        <div className="qr-title">Scan Shipment QR Code</div>
        <div className="qr-sub">Click to open camera and scan a VeritasChain QR code</div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>⚠ {error}</div>
      )}

      {/* Manual entry */}
      <div className="qr-input-row">
        <input
          className="form-input"
          value={manualId}
          onChange={e => setManualId(e.target.value)}
          placeholder="Or type Shipment ID manually…"
          onKeyDown={e => e.key === 'Enter' && handleManual()}
        />
        <button className="btn btn-primary" onClick={handleManual} disabled={!manualId.trim()}>
          Verify
        </button>
      </div>

      {/* Demo */}
      <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
        <button className="btn btn-ghost" onClick={handleDemo}>
          🔬 Load Demo Shipment (SHIP-001)
        </button>
      </div>
    </div>
  );
};
