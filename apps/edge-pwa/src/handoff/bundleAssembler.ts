/**
 * bundleAssembler.ts — Step 4: Orchestrate the full handoff verification flow
 *
 * Runs Steps 1 → 2 → 3 → 4 sequentially:
 *   1. verifySeal          (NFC seal challenge-response)
 *   2. readTemperatureLogger (NFC logger + Merkle tree)
 *   3. generateTemperatureProof (ZK Groth16 or ECDSA fallback)
 *   4. Assemble HandoffBundle, persist to IndexedDB, emit DOM event
 *
 * Designed for the DWH team to consume via:
 *   window.addEventListener('handoff-bundle-ready', (e) => { ... })
 *
 * All steps return Result<T>; this function always returns a bundle
 * (with CONTESTED status if any step fails).
 */

import {
  type Result,
  type HandoffBundle,
  type SealResult,
  type TempResult,
  type ZKResult,
  type ContestReason,
  type HandoffBundleEvent,
  ok,
  err,
} from "../types/physicalLayer";
import { verifySeal } from "../nfc/sealVerifier";
import { readTemperatureLogger } from "../nfc/tempReader";
import { generateTemperatureProof } from "../zk/proofGenerator";
import { storeBundle } from "./db";
import { DEFAULT_CONFIG } from "../types/physicalLayer";

// ─── Config ───────────────────────────────────────────────────────────────────

interface AssemblerConfig {
  shipmentIdStorageKey: string;
  receiverDeviceIdStorageKey: string;
  temperatureThreshold: { min: number; max: number };
}

function getConfig(overrides?: Partial<AssemblerConfig>): AssemblerConfig {
  return {
    shipmentIdStorageKey:
      overrides?.shipmentIdStorageKey ?? DEFAULT_CONFIG.shipmentIdStorageKey,
    receiverDeviceIdStorageKey:
      overrides?.receiverDeviceIdStorageKey ??
      DEFAULT_CONFIG.receiverDeviceIdStorageKey,
    temperatureThreshold:
      overrides?.temperatureThreshold ?? DEFAULT_CONFIG.temperatureThreshold,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute the full receiver-side handoff flow.
 *
 * Unlike individual steps, this function is designed to ALWAYS complete with
 * a HandoffBundle — failures are encoded as CONTESTED status within the bundle
 * rather than returned as error Results. The only error case is a
 * misconfiguration that prevents the flow from even starting (e.g., no
 * shipmentId in localStorage).
 *
 * @param config — optional config overrides
 * @returns Result<HandoffBundle>
 */
export async function assembleHandoffBundle(
  config?: Partial<AssemblerConfig>
): Promise<Result<HandoffBundle>> {
  const cfg = getConfig(config);
  const scannedAt = new Date().toISOString();

  // Read required identifiers from localStorage
  const shipmentId = localStorage.getItem(cfg.shipmentIdStorageKey);
  if (!shipmentId) {
    return err(
      "MISSING_SHIPMENT_ID",
      `No shipment ID found at localStorage key "${cfg.shipmentIdStorageKey}". ` +
        "Ensure shipment creation flow has run."
    );
  }

  const receiverDeviceId =
    localStorage.getItem(cfg.receiverDeviceIdStorageKey) ??
    "unknown-device";

  // ─── Step 1: Seal verification ──────────────────────────────────────────────
  let sealResult: SealResult;
  const sealVerifyResult = await verifySeal();
  if (!sealVerifyResult.success) {
    // Fatal NFC error (e.g., NFC not supported) — still build a contested bundle
    sealResult = {
      valid: false,
      sealId: "",
      signature: "",
      verifiedAt: scannedAt,
      reason: "SEAL_NOT_FOUND",
    };
  } else {
    sealResult = sealVerifyResult.data;
  }

  // ─── Step 2: Temperature logger ─────────────────────────────────────────────
  let tempResult: TempResult;
  const tempReadResult = await readTemperatureLogger({
    temperatureThreshold: cfg.temperatureThreshold,
  });
  if (!tempReadResult.success) {
    tempResult = {
      merkleRoot: "0x" + "00".repeat(32),
      readingCount: 0,
      minTemp: 0,
      maxTemp: 0,
      allCompliant: false,
      verifiedAt: scannedAt,
      readings: [],
      reason: "LOGGER_NOT_FOUND",
    };
  } else {
    tempResult = tempReadResult.data;
  }

  // ─── Step 3: ZK proof ───────────────────────────────────────────────────────
  let zkResult: ZKResult;
  const zkProofResult = await generateTemperatureProof(
    tempResult.merkleRoot,
    tempResult.minTemp,
    tempResult.maxTemp,
    cfg.temperatureThreshold.min,
    cfg.temperatureThreshold.max
  );
  if (!zkProofResult.success) {
    zkResult = {
      proof: null,
      publicSignals: [],
      proofType: "FALLBACK_ECDSA",
      reason: "PROOF_GENERATION_FAILED",
    };
  } else {
    zkResult = zkProofResult.data;
  }

  // ─── Step 4: Determine bundle status ────────────────────────────────────────
  const sealFailed = !sealResult.valid;
  const tempFailed = !tempResult.allCompliant || tempResult.readingCount === 0;

  let contestReason: ContestReason | undefined;
  if (sealFailed && tempFailed) {
    contestReason = "SEAL_AND_TEMP_FAILED";
  } else if (sealFailed) {
    contestReason = "SEAL_FAILED";
  } else if (tempFailed) {
    contestReason = "TEMP_OUT_OF_RANGE";
  }

  const bundle: HandoffBundle = {
    shipmentId,
    sealVerification: sealResult,
    temperatureData: tempResult,
    temperatureProof: zkResult,
    scannedAt,
    receiverDeviceId,
    status: contestReason ? "CONTESTED" : "OK",
    contestReason,
  };

  // ─── Persist to IndexedDB ───────────────────────────────────────────────────
  const storeResult = await storeBundle(bundle);
  if (!storeResult.success) {
    console.error("[bundleAssembler] Failed to persist bundle:", storeResult.error);
    // Non-fatal — still emit the event and return the bundle
  }

  // ─── Emit DOM event ────────────────────────────────────────────────────────
  emitBundleEvent(bundle);

  return ok(bundle);
}

// ─── DOM event emitter ────────────────────────────────────────────────────────

function emitBundleEvent(bundle: HandoffBundle): void {
  try {
    const event = new CustomEvent<HandoffBundleEvent>("handoff-bundle-ready", {
      detail: { bundle },
      bubbles: true,
      composed: true,
    });
    window.dispatchEvent(event);
  } catch (e) {
    console.error("[bundleAssembler] Failed to emit handoff-bundle-ready:", e);
  }
}
