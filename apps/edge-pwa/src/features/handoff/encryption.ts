/**
 * Encryption utilities for BLE channel
 */

import {
  generateECDHKeyPair,
  deriveSharedSecret,
  encryptData,
  decryptData,
  generateIV,
  exportPublicKeyForExchange,
  importPublicKeyForExchange,
} from '@veritaschain/crypto';

export class BLEEncryption {
  private keyPair: CryptoKeyPair | null = null;
  private sharedSecret: CryptoKey | null = null;

  async initiate(): Promise<JsonWebKey> {
    this.keyPair = await generateECDHKeyPair();
    return exportPublicKeyForExchange(this.keyPair.publicKey);
  }

  async accept(peerPublicKeyJwk: JsonWebKey): Promise<JsonWebKey> {
    this.keyPair = await generateECDHKeyPair();
    const peerPublicKey = await importPublicKeyForExchange(peerPublicKeyJwk);
    this.sharedSecret = await deriveSharedSecret(this.keyPair.privateKey, peerPublicKey);
    return exportPublicKeyForExchange(this.keyPair.publicKey);
  }

  async finalize(peerPublicKeyJwk: JsonWebKey): Promise<void> {
    if (!this.keyPair) throw new Error('Keypair not initialized');
    const peerPublicKey = await importPublicKeyForExchange(peerPublicKeyJwk);
    this.sharedSecret = await deriveSharedSecret(this.keyPair.privateKey, peerPublicKey);
  }

  async encrypt(data: string): Promise<{ encrypted: string; iv: string }> {
    if (!this.sharedSecret) throw new Error('Shared secret not established');
    const iv = generateIV();
    const encrypted = await encryptData(data, this.sharedSecret, iv);
    return {
      encrypted,
      iv: Array.from(iv).join(','),
    };
  }

  async decrypt(encryptedHex: string, ivStr: string): Promise<string> {
    if (!this.sharedSecret) throw new Error('Shared secret not established');
    const iv = new Uint8Array(ivStr.split(',').map(Number));
    return decryptData(encryptedHex, this.sharedSecret, iv);
  }
}
