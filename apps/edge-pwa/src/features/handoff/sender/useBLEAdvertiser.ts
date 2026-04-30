/**
 * Sender BLE advertiser hook
 */

import { useState, useCallback } from 'react';
import { HandoffBundle } from '@veritaschain/types';
import { bleService } from '../ble-service';
import { BLE_HANDOFF_TIMEOUT_MS } from '../handoffTypes';

export function useBLEAdvertiser() {
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receivedSignature, setReceivedSignature] = useState<string | null>(null);

  const startAdvertise = useCallback(async (bundle: HandoffBundle) => {
    setIsAdvertising(true);
    setError(null);

    try {
      await bleService.startAdvertising(bundle.shipmentId);

      // Set up message listener for receiver signature
      bleService.onMessage((msg) => {
        if (msg.type === 'signature' && msg.shipmentId === bundle.shipmentId) {
          setReceivedSignature(msg.payload.signature);
        }
      });

      // Send handoff initialization
      await bleService.sendMessage({
        type: 'handoff-init',
        shipmentId: bundle.shipmentId,
        payload: {
          bundle,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });

      // Set timeout
      const timeout = setTimeout(() => {
        setIsAdvertising(false);
        setError('Handoff timeout - no receiver found');
        bleService.disconnect();
      }, BLE_HANDOFF_TIMEOUT_MS);

      return () => clearTimeout(timeout);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'BLE error';
      setError(message);
      setIsAdvertising(false);
    }
  }, []);

  const stopAdvertise = useCallback(() => {
    bleService.disconnect();
    setIsAdvertising(false);
  }, []);

  return {
    isAdvertising,
    error,
    receivedSignature,
    startAdvertise,
    stopAdvertise,
  };
}
