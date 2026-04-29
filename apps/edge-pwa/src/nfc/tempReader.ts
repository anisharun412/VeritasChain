/**
 * tempReader.ts — Step 2: Temperature Logger Data + Merkle Tree
 *
 * Hardware: ESP32-S3 + SE050 + TMP117 — exposes signed readings via NFC
 *
 * Protocol:
 *   1. Read NDEF payload from NFC logger (JSON array of Reading[])
 *   2. Verify EVERY reading's Ed25519 signature against logger's public key
 *   3. Build a Merkle tree from verified readings
 *   4. Check compliance against temperature threshold
 *
 * Returns TempResult (never throws).
 */

import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

import {
  type Result,
  type TempResult,
  type Reading,
  type LoggerNfcPayload,
  ok,
  err,
} from "../types/physicalLayer";
import {
  verifyEd25519,
  buildReadingMessage,
  base64urlToBytes,
  bytesToHex,
} from "@veritaschain/crypto";
import { readNfcTag } from "./nfcUtils";
import { DEFAULT_CONFIG } from "../types/physicalLayer";

// ─── Config ───────────────────────────────────────────────────────────────────

interface TempReaderConfig {
  loggerPublicKeyStorageKey: string;
  nfcReadTimeoutMs: number;
  temperatureThreshold: { min: number; max: number };
}

function getConfig(overrides?: Partial<TempReaderConfig>): TempReaderConfig {
  return {
    loggerPublicKeyStorageKey:
      overrides?.loggerPublicKeyStorageKey ??
      DEFAULT_CONFIG.loggerPublicKeyStorageKey,
    nfcReadTimeoutMs:
      overrides?.nfcReadTimeoutMs ?? DEFAULT_CONFIG.nfcReadTimeoutMs,
    temperatureThreshold:
      overrides?.temperatureThreshold ?? DEFAULT_CONFIG.temperatureThreshold,
  };
}

// ─── Internal reading type ────────────────────────────────────────────────────

type VerifiedReading = Reading & { verified: true };

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Read and verify temperature logger data over NFC.
 *
 * @param config — optional config overrides
 * @returns Result<TempResult>
 */
export async function readTemperatureLogger(
  config?: Partial<TempReaderConfig>
): Promise<Result<TempResult>> {
  const cfg = getConfig(config);
  const verifiedAt = new Date().toISOString();

  // 1. Load logger public key
  const loggerPublicKeyHex = localStorage.getItem(cfg.loggerPublicKeyStorageKey);
  if (!loggerPublicKeyHex) {
    return err(
      "LOGGER_NOT_FOUND",
      `Logger public key not found at localStorage key "${cfg.loggerPublicKeyStorageKey}".`
    );
  }

  // 2. Read NFC tag
  const readResult = await readNfcTag(cfg.nfcReadTimeoutMs);
  if (!readResult.success) {
    if (readResult.error.code === "NFC_READ_TIMEOUT") {
      return err("LOGGER_READ_TIMEOUT", readResult.error.message);
    }
    return err("LOGGER_NOT_FOUND", readResult.error.message);
  }

  // 3. Parse JSON payload
  let payload: LoggerNfcPayload;
  try {
    payload = JSON.parse(readResult.data.payload) as LoggerNfcPayload;
  } catch {
    return err(
      "LOGGER_PAYLOAD_MALFORMED",
      "Logger NFC payload is not valid JSON."
    );
  }

  if (!Array.isArray(payload.readings) || payload.readings.length === 0) {
    return err(
      "LOGGER_PAYLOAD_MALFORMED",
      "Logger payload.readings is empty or not an array."
    );
  }

  // 4. Verify every signature
  const verifiedReadings: VerifiedReading[] = [];

  for (const reading of payload.readings) {
    if (
      typeof reading.timestamp !== "number" ||
      typeof reading.tempCelsius !== "number" ||
      typeof reading.signature !== "string"
    ) {
      return err(
        "LOGGER_PAYLOAD_MALFORMED",
        `Malformed reading: ${JSON.stringify(reading)}`
      );
    }

    const messageBytes = buildReadingMessage(reading.timestamp, reading.tempCelsius);
    const verifyResult = await verifyEd25519(
      messageBytes,
      reading.signature,
      loggerPublicKeyHex
    );

    if (!verifyResult.success) {
      return err(verifyResult.error.code, verifyResult.error.message);
    }

    if (!verifyResult.data) {
      return err(
        "LOGGER_SIGNATURE_INVALID",
        `Signature verification failed for reading at timestamp ${reading.timestamp}.`
      );
    }

    verifiedReadings.push({ ...reading, verified: true });
  }

  // 5. Build Merkle tree
  const merkleRoot = buildMerkleRoot(verifiedReadings);

  // 6. Compute stats
  const temps = verifiedReadings.map((r) => r.tempCelsius);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const { min: threshMin, max: threshMax } = cfg.temperatureThreshold;
  const allCompliant = minTemp >= threshMin && maxTemp <= threshMax;

  return ok({
    merkleRoot,
    readingCount: verifiedReadings.length,
    minTemp,
    maxTemp,
    allCompliant,
    verifiedAt,
    readings: verifiedReadings,
  });
}

// ─── Merkle tree building ─────────────────────────────────────────────────────

// Temperature is encoded as an integer to avoid floating-point issues:
// tempInteger = Math.round(celsius * 10_000)  →  preserves 4 decimal places
const TEMP_SCALE = 10_000n;

function encodeLeaf(r: Reading): [bigint, bigint] {
  return [
    BigInt(r.timestamp),
    BigInt(Math.round(r.tempCelsius * Number(TEMP_SCALE))),
  ];
}

/**
 * Build a Merkle tree from verified readings using @openzeppelin/merkle-tree.
 *
 * Each leaf is a 2-tuple [uint256 timestamp, uint256 tempCelsius×10000].
 * Pure uint256 leaves avoid @metamask/abi-utils string coercion issues.
 * Signatures are verified before this step and not stored in the leaf.
 */
export function buildMerkleRoot(readings: Reading[]): string {
  if (readings.length === 0) {
    return "0x" + "00".repeat(32);
  }
  const tree = StandardMerkleTree.of(
    readings.map(encodeLeaf),
    ["uint256", "uint256"]
  );
  return tree.root;
}

/**
 * Build and return the full Merkle tree (for proof generation / inspection).
 */
export function buildMerkleTree(
  readings: Reading[]
): StandardMerkleTree<[bigint, bigint]> {
  return StandardMerkleTree.of(
    readings.map(encodeLeaf),
    ["uint256", "uint256"]
  );
}

/**
 * Verify a single Merkle proof for a reading.
 * Used by the inspect app / auditors.
 */
export function verifyMerkleProof(
  root: string,
  reading: Reading,
  proof: string[]
): boolean {
  try {
    return StandardMerkleTree.verify(
      root,
      ["uint256", "uint256"],
      encodeLeaf(reading),
      proof
    );
  } catch {
    return false;
  }
}

// ─── Exported utils ───────────────────────────────────────────────────────────

export { base64urlToBytes, bytesToHex };
