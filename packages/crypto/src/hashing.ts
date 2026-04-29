/**
 * Hash functions for document and data verification
 */

export async function sha256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256FromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Keccak256 implementation (for Ethereum compatibility)
 * Note: requires external library like js-sha3 or ethers.js
 */
export function keccak256(data: string): string {
  // This would use ethers.js or js-sha3 in actual implementation
  // Placeholder for now
  return '0x' + Array.from(new Uint8Array(32))
    .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
    .join('');
}

export async function hashBundle(bundle: any): Promise<string> {
  const json = JSON.stringify(bundle);
  return sha256(json);
}
