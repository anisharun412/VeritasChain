/**
 * BLE types and interfaces
 */

import { HandoffBundle } from '@veritaschain/types';

export interface BLEHandoffMessage {
  type: 'handoff-init' | 'signature' | 'ack' | 'error';
  shipmentId: string;
  payload: any;
  timestamp: number;
}

export interface BLESender {
  shipmentId: string;
  bundle: HandoffBundle;
  timeout: number;
}

export interface BLEReceiver {
  onMessage?: (msg: BLEHandoffMessage) => void;
  onError?: (error: string) => void;
}

export const BLE_SERVICE_UUID = '12345678-1234-1234-1234-123456789012';
export const BLE_CHARACTERISTIC_UUID = '87654321-4321-4321-4321-210987654321';
export const BLE_HANDOFF_TIMEOUT_MS = 30000;
