import { useState, useCallback } from 'react';
import { HandoffBundle } from '@veritaschain/types';
import { bleService } from '../ble-service';

export function useBLEReceiver() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receivedBundle, setReceivedBundle] = useState<HandoffBundle | null>(null);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setError(null);

    try {
      // 1. Start listening to incoming BLE notifications from the Sender
      await bleService.receiveMessage();

      // 2. Add listener to process incoming messages
      bleService.onMessage(async (msg) => {
        if (msg.type === 'handoff-init') {
          const bundle = msg.payload.bundle as HandoffBundle;
          setReceivedBundle(bundle);
          
          // Automatically sign and send back acknowledgment signature
          // In production: use real cryptographic keys for receiver
          const signature = '0xMockSignatureFromReceiver_' + Date.now();
          
          await bleService.sendMessage({
            type: 'signature',
            shipmentId: msg.shipmentId,
            payload: { signature },
            timestamp: Date.now()
          });
          
          setIsScanning(false);
        }
      });
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'BLE receive error';
      setError(message);
      setIsScanning(false);
    }
  }, []);

  const stopScan = useCallback(() => {
    bleService.disconnect();
    setIsScanning(false);
  }, []);

  return {
    isScanning,
    error,
    receivedBundle,
    startScan,
    stopScan
  };
}
