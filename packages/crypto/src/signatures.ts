/**
 * @veritaschain/crypto — Ed25519 utilities for the VeritasChain physical layer.
 *
 * Uses @noble/ed25519 (pure-JS, browser-safe).
 * Never throws — all public functions return Result<T>.
 *
 * Browser requirements:
 *   - Web Crypto API (subtle) — for nonce generation via getRandomValues
 *   - No Node.js builtins used; this module is 100% browser-compatible.
 */

import { verify as ed25519Verify, etc } from "@noble/ed25519";

// ─── SHA-512 hook (required by @noble/ed25519 v2 in browser environments) ──────
// @noble/ed25519 v2.x removed the bundled sha512 export.
// We hook into the Web Crypto API instead — available in all modern browsers.
if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
  etc.sha512Async = async (...msgs: Uint8Array[]): Promise<Uint8Array> => {
    // Concatenate all message chunks
    const total = msgs.reduce((s, m) => s + m.length, 0);
    const buf = new Uint8Array(total);
    let offset = 0;
    for (const m of msgs) { buf.set(m, offset); offset += m.length; }
    const hash = await globalThis.crypto.subtle.digest("SHA-512", buf);
    return new Uint8Array(hash);
  };
}

// ─── Result types (inlined to avoid circular package deps) ────────────────────

export interface CryptoError {
  code: string;
  message: string;
}

export type CryptoResult<T> =
  | { success: true; data: T }
  | { success: false; error: CryptoError };

function ok<T>(data: T): CryptoResult<T> {
  return { success: true, data };
}

function fail<T>(code: string, message: string): CryptoResult<T> {
  return { success: false, error: { code, message } };
}

// ─── Codec helpers ────────────────────────────────────────────────────────────

/**
 * Decode a hex string to Uint8Array.
 * Accepts both upper and lower case hex; strips leading "0x" if present.
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new RangeError(`hexToBytes: odd-length hex string (${hex})`);
  }
  const arr = new Uint8Array(clean.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

/**
 * Encode a Uint8Array to a lowercase hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Decode a base64url string to Uint8Array.
 * Accepts both standard base64 and base64url variants.
 */
export function base64urlToBytes(b64: string): Uint8Array {
  // Normalise base64url → base64
  const padded =
    b64.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

/**
 * Encode a Uint8Array to a base64url string (no padding).
 */
export function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ─── Nonce Generation ─────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random nonce using the Web Crypto API.
 *
 * @param byteLength — number of random bytes (default: 32)
 * @returns Result containing the nonce as a hex string
 */
export function generateNonce(
  byteLength = 32
): CryptoResult<{ hex: string; bytes: Uint8Array }> {
  try {
    if (typeof crypto === "undefined" || !crypto.getRandomValues) {
      return fail(
        "CRYPTO_UNAVAILABLE",
        "Web Crypto API (getRandomValues) is not available in this environment."
      );
    }
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return ok({ hex: bytesToHex(bytes), bytes });
  } catch (e) {
    return fail(
      "NONCE_GENERATION_FAILED",
      `Failed to generate nonce: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

// ─── Ed25519 Signature Verification ──────────────────────────────────────────

/**
 * Verify an Ed25519 signature using @noble/ed25519.
 *
 * All byte arrays may be provided as Uint8Array or hex/base64url strings.
 *
 * @param messageBytes   — raw bytes that were signed
 * @param signatureHexOrB64 — Ed25519 signature (64 bytes) as hex or base64url
 * @param publicKeyHex   — Ed25519 public key (32 bytes) as hex
 *
 * @returns Result<boolean> — true if signature is valid, false if not.
 *          Returns error Result only on decode/logic failures.
 */
export async function verifyEd25519(
  messageBytes: Uint8Array,
  signatureHexOrB64: string,
  publicKeyHex: string
): Promise<CryptoResult<boolean>> {
  try {
    // Decode signature (support both hex and base64url)
    let sigBytes: Uint8Array;
    if (/^[0-9a-fA-F]+$/.test(signatureHexOrB64)) {
      sigBytes = hexToBytes(signatureHexOrB64);
    } else {
      sigBytes = base64urlToBytes(signatureHexOrB64);
    }

    if (sigBytes.length !== 64) {
      return fail(
        "INVALID_SIGNATURE_LENGTH",
        `Ed25519 signature must be 64 bytes, got ${sigBytes.length}`
      );
    }

    const pubKeyBytes = hexToBytes(publicKeyHex);
    if (pubKeyBytes.length !== 32) {
      return fail(
        "INVALID_PUBLIC_KEY_LENGTH",
        `Ed25519 public key must be 32 bytes, got ${pubKeyBytes.length}`
      );
    }

    const valid = await ed25519Verify(sigBytes, messageBytes, pubKeyBytes);
    return ok(valid);
  } catch (e) {
    return fail(
      "VERIFY_FAILED",
      `Ed25519 verification threw: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/**
 * Convenience wrapper: verify a signature over a UTF-8 or JSON-serialisable
 * message string.
 *
 * @param message        — string to verify (encoded as UTF-8 bytes)
 * @param signatureHexOrB64
 * @param publicKeyHex
 */
export async function verifyStringMessage(
  message: string,
  signatureHexOrB64: string,
  publicKeyHex: string
): Promise<CryptoResult<boolean>> {
  const encoder = new TextEncoder();
  return verifyEd25519(encoder.encode(message), signatureHexOrB64, publicKeyHex);
}

/**
 * Build the canonical message bytes that the ESP32-S3 logger signs for each
 * temperature reading.
 *
 * Encoding: `<timestamp_ms_uint64_big_endian> || <temp_celsius_float32_big_endian>`
 * Must match the firmware signing logic in /firmware/logger/.
 */
export function buildReadingMessage(
  timestamp: number,
  tempCelsius: number
): Uint8Array {
  const buf = new ArrayBuffer(12); // 8 bytes timestamp + 4 bytes float32
  const view = new DataView(buf);
  // Timestamp as BigInt64 big-endian (ms since epoch)
  view.setBigInt64(0, BigInt(timestamp), false /* big-endian */);
  // Temp as Float32 big-endian
  view.setFloat32(8, tempCelsius, false /* big-endian */);
  return new Uint8Array(buf);
}

/**
 * Build the canonical challenge-response message for the NTAG 424 DNA seal.
 *
 * The seal signs: `"vcSeal:" || hex(nonce) || ":" || sealId`
 *
 * @param nonceHex  — hex-encoded 32-byte nonce generated by the receiver
 * @param sealId    — NTAG 424 DNA chip UID (hex string)
 */
export function buildSealChallengeMessage(
  nonceHex: string,
  sealId: string
): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`vcSeal:${nonceHex}:${sealId}`);
}
