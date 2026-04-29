/**
 * ECDH key exchange for BLE encryption
 */

export async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );
}

export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(
  data: string,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return Array.from(new Uint8Array(encrypted))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function decryptData(
  encryptedHex: string,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const encrypted = new Uint8Array(
    encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  return new TextDecoder().decode(decrypted);
}

export function generateIV(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(12));
}

export async function exportPublicKeyForExchange(publicKey: CryptoKey): Promise<JsonWebKey> {
  return await window.crypto.subtle.exportKey('jwk', publicKey);
}

export async function importPublicKeyForExchange(jwk: JsonWebKey): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
}
