/**
 * BLE communication service
 */

import { BLEHandoffMessage, BLE_SERVICE_UUID, BLE_CHARACTERISTIC_UUID } from './handoffTypes';

export class BLEService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private listeners: ((msg: BLEHandoffMessage) => void)[] = [];

  async startAdvertising(shipmentId: string): Promise<void> {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUID] }],
      });

      this.device = device;
      device.addEventListener('gattserverdisconnected', () => {
        this.characteristic = null;
      });
    } catch (error) {
      console.error('BLE advertising error:', error);
      throw error;
    }
  }

  async sendMessage(message: BLEHandoffMessage): Promise<void> {
    if (!this.characteristic) {
      throw new Error('BLE characteristic not available');
    }

    const data = new TextEncoder().encode(JSON.stringify(message));
    await this.characteristic.writeValue(data);
  }

  async receiveMessage(): Promise<BLEHandoffMessage | null> {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUID] }],
      });

      const server = await device.gatt?.connect();
      if (!server) return null;

      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(BLE_CHARACTERISTIC_UUID);

      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
        if (value) {
          const message = JSON.parse(new TextDecoder().decode(value));
          this.listeners.forEach(listener => listener(message));
        }
      });

      await characteristic.startNotifications();
      this.characteristic = characteristic;

      return null;
    } catch (error) {
      console.error('BLE receive error:', error);
      throw error;
    }
  }

  onMessage(callback: (msg: BLEHandoffMessage) => void): void {
    this.listeners.push(callback);
  }

  disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.characteristic = null;
  }
}

export const bleService = new BLEService();
