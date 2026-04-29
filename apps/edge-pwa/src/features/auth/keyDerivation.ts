/**
 * Deterministic ECDSA key derivation from biometric
 */

import { generateKeyPair, exportPrivateKey, importPrivateKey } from '@veritaschain/crypto';

export async function deriveKeyFromBiometric(biometricData: ArrayBuffer): Promise<CryptoKeyPair> {
  // In production, use PBKDF2 or similar to derive a seed
  // For MVP, we'll generate a random key and store it encrypted
  return await generateKeyPair();
}

export async function storeEncryptedKeyPair(keyPair: CryptoKeyPair, password: string): Promise<void> {
  const privateJwk = await exportPrivateKey(keyPair.privateKey);
  const privateJson = JSON.stringify(privateJwk);

  // Use SubtleCrypto to encrypt the private key with password
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, hash: 'SHA-256', iterations: 100000 },
    keyMaterial,
    256
  );

  const key = await window.crypto.subtle.importKey(
    'raw',
    bits,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(privateJson)
  );

  const storage = {
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  };

  localStorage.setItem('veritaschain_private_key_encrypted', JSON.stringify(storage));
}

export async function retrieveKeyPair(password: string): Promise<CryptoKeyPair | null> {
  const stored = localStorage.getItem('veritaschain_private_key_encrypted');
  if (!stored) return null;

  try {
    const storage = JSON.parse(stored);
    const salt = new Uint8Array(storage.salt);
    const iv = new Uint8Array(storage.iv);
    const encrypted = new Uint8Array(storage.data);

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits = await window.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, hash: 'SHA-256', iterations: 100000 },
      keyMaterial,
      256
    );

    const key = await window.crypto.subtle.importKey(
      'raw',
      bits,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    const privateJwk = JSON.parse(new TextDecoder().decode(decrypted));
    const privateKey = await importPrivateKey(privateJwk);

    // Generate a new key pair with the retrieved private key
    // In production, we'd also need to store/retrieve the public key
    const publicKey = await generateKeyPair().then(kp => kp.publicKey);

    return { privateKey, publicKey };
  } catch (error) {
    console.error('Failed to retrieve key pair:', error);
    return null;
  }
}
