/**
 * sealVerifier.ts — Step 1: NFC Seal Challenge-Response Verification
 *
 * Hardware: NXP NTAG 424 DNA tamper-evident seal
 * Protocol:
 *   1. PWA generates a 32-byte random nonce
 *   2. PWA writes nonce to the seal via NFC
 *   3. Seal signs  `vcSeal:<nonceHex>:<sealId>`  with its ECDSA/Ed25519 private key
 *   4. PWA reads the signed response and the seal UID
 *   5. PWA verifies the signature against the seal's registered Ed25519 public key
 *
 * All errors are returned as Result — nothing is thrown.
 */

import {
  type Result,
  type SealResult,
  ok,
  err,
} from "../types/physicalLayer";
import {
  generateNonce,
  verifyEd25519,
  buildSealChallengeMessage,
} from "@veritaschain/crypto";
import { readNfcTag, writeNfcTag } from "./nfcUtils";
import { DEFAULT_CONFIG } from "../types/physicalLayer";

// ─── Config ───────────────────────────────────────────────────────────────────

interface SealVerifierConfig {
  /** localStorage key holding the seal's hex Ed25519 public key */
  sealPublicKeyStorageKey: string;
  /** NFC read timeout in ms */
  nfcReadTimeoutMs: number;
}

function getConfig(overrides?: Partial<SealVerifierConfig>): SealVerifierConfig {
  return {
    sealPublicKeyStorageKey:
      overrides?.sealPublicKeyStorageKey ??
      DEFAULT_CONFIG.sealPublicKeyStorageKey,
    nfcReadTimeoutMs:
      overrides?.nfcReadTimeoutMs ?? DEFAULT_CONFIG.nfcReadTimeoutMs,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the full seal challenge-response verification flow.
 *
 * Steps:
 *   1. Load seal public key from localStorage
 *   2. Generate a 32-byte nonce
 *   3. Write nonce to seal via NFC
 *   4. Read seal's signed response via NFC
 *   5. Verify Ed25519 signature
 *
 * @param config — optional config overrides
 * @returns Result<SealResult>
 */
export async function verifySeal(
  config?: Partial<SealVerifierConfig>
): Promise<Result<SealResult>> {
  const cfg = getConfig(config);
  const verifiedAt = new Date().toISOString();

  // 1. Load seal public key
  const sealPublicKeyHex = localStorage.getItem(cfg.sealPublicKeyStorageKey);
  if (!sealPublicKeyHex) {
    return err(
      "SEAL_NOT_FOUND",
      `Seal public key not found in localStorage at key "${cfg.sealPublicKeyStorageKey}". ` +
        "Ensure the shipment creation flow has registered the seal."
    );
  }

  // 2. Generate nonce
  const nonceResult = generateNonce(32);
  if (!nonceResult.success) {
    return err(nonceResult.error.code, nonceResult.error.message);
  }
  const { hex: nonceHex } = nonceResult.data;

  // 3. Write nonce challenge to seal
  const writeResult = await writeNfcTag(nonceHex, cfg.nfcReadTimeoutMs);
  if (!writeResult.success) {
    // The seal is physically broken / not present
    if (
      writeResult.error.code === "NFC_WRITE_TIMEOUT" ||
      writeResult.error.code === "NFC_WRITE_FAILED"
    ) {
      return ok(buildFailedSeal("SEAL_BROKEN", sealPublicKeyHex, verifiedAt));
    }
    return err(writeResult.error.code, writeResult.error.message);
  }

  // 4. Read seal response (signature + UID)
  const readResult = await readNfcTag(cfg.nfcReadTimeoutMs);
  if (!readResult.success) {
    if (
      readResult.error.code === "NFC_READ_TIMEOUT" ||
      readResult.error.code === "NFC_READ_ERROR"
    ) {
      return ok(buildFailedSeal("SEAL_BROKEN", sealPublicKeyHex, verifiedAt));
    }
    return err(readResult.error.code, readResult.error.message);
  }

  const { payload: responsePayload, serialNumber: sealId } = readResult.data;

  // Response format: "<base64url_signature>"
  // The seal writes its Ed25519 signature as the NDEF text payload
  const signatureB64 = responsePayload.trim();

  if (!signatureB64) {
    return ok({
      valid: false,
      sealId,
      signature: "",
      verifiedAt,
      reason: "SEAL_BROKEN",
    });
  }

  // 5. Verify signature
  const messageBytes = buildSealChallengeMessage(nonceHex, sealId);
  const verifyResult = await verifyEd25519(
    messageBytes,
    signatureB64,
    sealPublicKeyHex
  );

  if (!verifyResult.success) {
    return err(verifyResult.error.code, verifyResult.error.message);
  }

  if (!verifyResult.data) {
    return ok({
      valid: false,
      sealId,
      signature: signatureB64,
      verifiedAt,
      reason: "SIGNATURE_INVALID",
    });
  }

  return ok({
    valid: true,
    sealId,
    signature: signatureB64,
    verifiedAt,
  });
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildFailedSeal(
  reason: "SEAL_BROKEN" | "SEAL_NOT_FOUND" | "SIGNATURE_INVALID",
  _publicKeyHex: string,
  verifiedAt: string
): SealResult {
  return {
    valid: false,
    sealId: "",
    signature: "",
    verifiedAt,
    reason,
  };
}
