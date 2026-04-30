/**
 * ECDSA signing and verification using SubtleCrypto
 */

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['sign', 'verify']
  );
}

export async function signData(data: string, privateKey: CryptoKey): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const signature = await window.crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, encoded);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifySignature(
  data: string,
  signature: string,
  publicKey: CryptoKey
): Promise<boolean> {
  const encoded = new TextEncoder().encode(data);
  const signatureBuffer = new Uint8Array(
    signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );
  
  return await window.crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, signatureBuffer, encoded);
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<JsonWebKey> {
  return await window.crypto.subtle.exportKey('jwk', publicKey);
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
}

export async function exportPrivateKey(privateKey: CryptoKey): Promise<JsonWebKey> {
  return await window.crypto.subtle.exportKey('jwk', privateKey);
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
}
