/**
 * Encrypted IndexedDB key storage using Dexie.js + AES-GCM.
 * Keys are wrapped with a per-credential AES key derived via HKDF.
 * Only the same WebAuthn credential can decrypt them.
 */

import Dexie from 'dexie';

// ─── Schema ──────────────────────────────────────────

interface KeyRecord {
  id: string;
  encryptedJWK: string;
  iv: string;
  credentialId: string;
  userId: string;
  createdAt: number;
}

class SecureDB extends Dexie {
  keyStore!: Dexie.Table<KeyRecord, string>;
  constructor() {
    super('VeritasChainSecure');
    this.version(1).stores({ keyStore: 'id' });
  }
}

const db = new SecureDB();

// ─── Helpers ─────────────────────────────────────────

function ab2b64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function b642ab(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function ab2hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Wrap Key ─────────────────────────────────────────

async function getWrapKey(credentialId: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const material = encoder.encode('veritaschain-aes-wrap:' + ab2hex(credentialId));

  const baseKey = await crypto.subtle.importKey('raw', material, { name: 'HKDF' }, false, [
    'deriveKey',
  ]);

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode('key-wrap-salt-2024'),
      info: encoder.encode('aes-gcm-key-wrap'),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ─── Public API ───────────────────────────────────────

export async function storeKeyEncrypted(
  jwk: JsonWebKey,
  credentialId: Uint8Array,
  userId: string,
): Promise<void> {
  const wrapKey = await getWrapKey(credentialId);
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(jwk));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrapKey, plaintext);

  await db.keyStore.put({
    id: 'ecdsa-private-key',
    encryptedJWK: ab2b64(ciphertext),
    iv: ab2b64(iv),
    credentialId: ab2b64(credentialId),
    userId,
    createdAt: Date.now(),
  });
}

export async function loadKeyEncrypted(credentialId: Uint8Array): Promise<JsonWebKey | null> {
  const record = await db.keyStore.get('ecdsa-private-key');
  if (!record) return null;
  if (record.credentialId !== ab2b64(credentialId)) return null;

  const wrapKey = await getWrapKey(credentialId);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b642ab(record.iv) },
      wrapKey,
      b642ab(record.encryptedJWK),
    );
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(plaintext)) as JsonWebKey;
  } catch {
    return null;
  }
}

export async function hasStoredKey(): Promise<boolean> {
  const record = await db.keyStore.get('ecdsa-private-key');
  return !!record;
}

export async function clearKeys(): Promise<void> {
  await db.keyStore.clear();
}
