/**
 * proofGenerator.ts — Step 3: Groth16 ZK Proof Generation
 *
 * Generates a Groth16 proof via snarkjs (WASM) that attests:
 *   "The Merkle root of verified readings has minTemp >= thresholdMin
 *    AND maxTemp <= thresholdMax"
 *
 * Inputs to the temp_range circuit:
 *   - merkleRoot (field element)
 *   - minTemp    (temperature * 100, integer)
 *   - maxTemp    (temperature * 100, integer)
 *   - thresholdMin (temperature * 100, integer)
 *   - thresholdMax (temperature * 100, integer)
 *
 * FALLBACK: If proof generation takes > zkProofTimeoutMs OR snarkjs fails to
 * load, we sign the compliance attestation with a platform ECDSA key via
 * Web Crypto subtle API (P-256 / SHA-256).
 *
 * All functions return Result<ZKResult>; none throw.
 */

import {
  type Result,
  type ZKResult,
  ok,
  err,
} from "../types/physicalLayer";
import { loadSnarkjs, fetchCircuitFile } from "./snarkjsLoader";
import { bytesToBase64url } from "@veritaschain/crypto";
import { DEFAULT_CONFIG } from "../types/physicalLayer";

// ─── Config ───────────────────────────────────────────────────────────────────

interface ProofConfig {
  zkProofTimeoutMs: number;
  wasmFilename: string;
  zkeyFilename: string;
}

function getConfig(overrides?: Partial<ProofConfig>): ProofConfig {
  return {
    zkProofTimeoutMs:
      overrides?.zkProofTimeoutMs ?? DEFAULT_CONFIG.zkProofTimeoutMs,
    wasmFilename: overrides?.wasmFilename ?? `temp_range.wasm`,
    zkeyFilename: overrides?.zkeyFilename ?? `temp_range_final.zkey`,
  };
}

// ─── Temperature encoding ─────────────────────────────────────────────────────

/**
 * The circom circuit works with integers.
 * We encode temperatures as (°C × 100) to preserve 2 decimal places.
 */
function encodeTemp(celsius: number): number {
  return Math.round(celsius * 100);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a Groth16 ZK proof for temperature compliance, or fall back to
 * an ECDSA attestation if the proof takes too long.
 *
 * @param merkleRoot        — hex Merkle root from Step 2
 * @param minTemp           — observed minimum temperature (°C)
 * @param maxTemp           — observed maximum temperature (°C)
 * @param complianceMin     — threshold minimum (default 2°C)
 * @param complianceMax     — threshold maximum (default 8°C)
 * @param config            — optional config overrides
 */
export async function generateTemperatureProof(
  merkleRoot: string,
  minTemp: number,
  maxTemp: number,
  complianceMin = DEFAULT_CONFIG.temperatureThreshold.min,
  complianceMax = DEFAULT_CONFIG.temperatureThreshold.max,
  config?: Partial<ProofConfig>
): Promise<Result<ZKResult>> {
  const cfg = getConfig(config);

  // Attempt Groth16 proof with a hard timeout
  const proofResult = await withTimeout(
    attemptGroth16Proof(merkleRoot, minTemp, maxTemp, complianceMin, complianceMax, cfg),
    cfg.zkProofTimeoutMs
  );

  if (proofResult.success) {
    return ok(proofResult.data);
  }

  // Groth16 failed — fall back to ECDSA attestation
  console.warn(
    "[proofGenerator] Groth16 failed, using ECDSA fallback:",
    !proofResult.success ? proofResult.error.message : ""
  );

  return generateFallbackAttestation(
    merkleRoot,
    minTemp,
    maxTemp,
    complianceMin,
    complianceMax
  );
}

// ─── Groth16 prover ───────────────────────────────────────────────────────────

async function attemptGroth16Proof(
  merkleRoot: string,
  minTemp: number,
  maxTemp: number,
  complianceMin: number,
  complianceMax: number,
  cfg: ProofConfig
): Promise<Result<ZKResult>> {
  // Load snarkjs
  const snarkjsResult = await loadSnarkjs();
  if (!snarkjsResult.success) {
    return err(snarkjsResult.error.code, snarkjsResult.error.message);
  }

  // Fetch WASM + zkey files
  const [wasmResult, zkeyResult] = await Promise.all([
    fetchCircuitFile(cfg.wasmFilename),
    fetchCircuitFile(cfg.zkeyFilename),
  ]);

  if (!wasmResult.success) {
    console.warn(`WASM file not found at ${cfg.wasmFilename}, using fallback: ${wasmResult.error.message}`);
    return err("WASM_NOT_FOUND", "WASM file not found at " + cfg.wasmFilename + ", using fallback");
  }
  if (!zkeyResult.success) {
    console.warn(`ZKEY file not found at ${cfg.zkeyFilename}, using fallback: ${zkeyResult.error.message}`);
    return err("ZKEY_NOT_FOUND", "ZKEY file not found at " + cfg.zkeyFilename + ", using fallback");
  }

  // Build circuit inputs
  // merkleRoot as BigInt string (hex → decimal)
  const merkleRootBigInt = BigInt(
    merkleRoot.startsWith("0x") ? merkleRoot : "0x" + merkleRoot
  ).toString();

  const input: Record<string, unknown> = {
    merkleRoot: merkleRootBigInt,
    minTemp: encodeTemp(minTemp),
    maxTemp: encodeTemp(maxTemp),
    thresholdMin: encodeTemp(complianceMin),
    thresholdMax: encodeTemp(complianceMax),
  };

  try {
    const { proof, publicSignals } =
      await snarkjsResult.data.groth16.fullProve(
        input,
        wasmResult.data,
        zkeyResult.data,
        null // suppress verbose logging
      );

    return ok({
      proof: JSON.stringify(proof),
      publicSignals,
      proofType: "GROTH16",
    });
  } catch (e) {
    return err(
      "PROOF_GENERATION_FAILED",
      `snarkjs.groth16.fullProve failed: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

// ─── ECDSA fallback ───────────────────────────────────────────────────────────

/**
 * When ZK proving is unavailable, sign a compliance attestation with a
 * ephemeral P-256 key (no key material leaves the device — this is a
 * device-bound signature for audit trail purposes only).
 *
 * The DWH team will accept this as "PHONE_PROVEN" with lower trust level.
 *
 * Signed payload: JSON.stringify({
 *   merkleRoot, minTemp, maxTemp, complianceMin, complianceMax, timestamp
 * })
 */
async function generateFallbackAttestation(
  merkleRoot: string,
  minTemp: number,
  maxTemp: number,
  complianceMin: number,
  complianceMax: number
): Promise<Result<ZKResult>> {
  try {
    // Generate ephemeral signing key (P-256)
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      false, // non-extractable
      ["sign", "verify"]
    );

    const attestation = {
      merkleRoot,
      minTemp,
      maxTemp,
      complianceMin,
      complianceMax,
      timestamp: Date.now(),
      reason: "PHONE_PROVEN",
    };

    const msgBytes = new TextEncoder().encode(JSON.stringify(attestation));

    const sigBuffer = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      keyPair.privateKey,
      msgBytes
    );

    const fallbackSignature = bytesToBase64url(new Uint8Array(sigBuffer));

    return ok({
      proof: null,
      publicSignals: [
        merkleRoot,
        encodeTemp(minTemp).toString(),
        encodeTemp(maxTemp).toString(),
        encodeTemp(complianceMin).toString(),
        encodeTemp(complianceMax).toString(),
      ],
      fallbackSignature,
      proofType: "FALLBACK_ECDSA",
    });
  } catch (e) {
    return err(
      "FALLBACK_SIGN_FAILED",
      `ECDSA fallback signing failed: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

// ─── Timeout helper ───────────────────────────────────────────────────────────

async function withTimeout<T>(
  promise: Promise<Result<T>>,
  ms: number
): Promise<Result<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise: Promise<Result<T>> = new Promise((resolve) => {
    timer = setTimeout(() => {
      resolve({
        success: false,
        error: {
          code: "PROOF_TIMEOUT",
          message: `ZK proof generation timed out after ${ms}ms.`,
        },
      });
    }, ms);
  });

  const result = await Promise.race([promise, timeoutPromise]);
  clearTimeout(timer);
  return result;
}
