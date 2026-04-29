/**
 * Web NFC reader hook for seal verification
 */

import { useState, useCallback } from 'react';
import { NFCData } from '@veritaschain/types';

export function useNFCReader() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nfcData, setNfcData] = useState<NFCData | null>(null);

  const scan = useCallback(async () => {
    if (!('NDEFReader' in window)) {
      setError('NFC not supported on this device');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.onreading = ({ message }: any) => {
        try {
          const decoder = new TextDecoder();
          const recordData = message.records[0]?.data;
          if (recordData) {
            const text = decoder.decode(recordData);
            const data = JSON.parse(text) as NFCData;
            setNfcData(data);
            setIsScanning(false);
          }
        } catch (err) {
          setError('Failed to parse NFC data');
        }
      };

      ndef.onerror = () => {
        setError('NFC scan failed');
        setIsScanning(false);
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'NFC scan error';
      setError(message);
      setIsScanning(false);
    }
  }, []);

  const stop = useCallback(() => {
    setIsScanning(false);
  }, []);

  return {
    isScanning,
    error,
    nfcData,
    scan,
    stop,
  };
}
