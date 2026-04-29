/**
 * QR Scanner hook for Inspect app
 */

import { useState, useCallback } from 'react';

export function useQRScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setIsScanning(true);
    setError(null);

    try {
      // Mock QR scanner - in production, use react-qr-reader or jsQR
      // For MVP, prompt user to paste QR value
      const shipmentId = prompt('Enter Shipment ID (or scan QR code):');
      if (shipmentId) {
        setResult(shipmentId);
      } else {
        throw new Error('No QR code scanned');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'QR scan failed';
      setError(message);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isScanning,
    error,
    result,
    scan,
    reset,
  };
}
