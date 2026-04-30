/**
 * @veritaschain/types — Physical Layer shared type definitions
 * Consumed by edge-pwa, inspect app, and DWH protocol handler.
 *
 * All Result types follow: { success: true, data: T } | { success: false, error: ErrorInfo }
 * No functions are allowed in this file — pure TypeScript types only.
 */

// ─── Generic Result ────────────────────────────────────────────────────────────

export interface ErrorInfo {
  code: string;
  message: string;
}

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorInfo };

// ─── Raw Hardware Formats ──────────────────────────────────────────────────────

/**
 * A single signed temperature reading as produced by the ESP32-S3 logger
 * and transmitted over NFC.
 */
export interface Reading {
  /** Unix epoch milliseconds */
  timestamp: number;
  /** Temperature in Celsius (±0.1°C accuracy from TMP117) */
  tempCelsius: number;
  /** Base64url-encoded Ed25519 signature over `timestamp || tempCelsius` */
  signature: string;
}

/**
 * Raw NDEF payload from the NFC temperature logger.
 */
export interface LoggerNfcPayload {
  /** Device DID — matches the logger's SE050 identity */
  deviceId: string;
  /** Firmware version (e.g. "1.2.0") */
  fwVersion: string;
  readings: Reading[];
}

// ─── Step 1 — Seal Verification ────────────────────────────────────────────────

export type SealFailReason =
  | "SEAL_BROKEN"
  | "SEAL_NOT_FOUND"
  | "SIGNATURE_INVALID";

export interface SealResult {
  valid: boolean;
  /** NTAG 424 DNA chip UID (hex string) */
  sealId: string;
  /** Base64url-encoded Ed25519 signature returned by seal */
  signature: string;
  verifiedAt: string; // ISO 8601
  reason?: SealFailReason;
}

// ─── Step 2 — Temperature Logger ──────────────────────────────────────────────

export type LoggerFailReason =
  | "LOGGER_NOT_FOUND"
  | "LOGGER_SIGNATURE_INVALID"
  | "LOGGER_PAYLOAD_MALFORMED"
  | "LOGGER_READ_TIMEOUT";

export interface TempResult {
  /** Hex-encoded Merkle root of all verified readings */
  merkleRoot: string;
  readingCount: number;
  minTemp: number;
  maxTemp: number;
  /** true iff every reading is within [thresholdMin, thresholdMax] */
  allCompliant: boolean;
  verifiedAt: string; // ISO 8601
  readings: Reading[];
  reason?: LoggerFailReason;
}

// ─── Step 3 — ZK Proof ────────────────────────────────────────────────────────

export type ProofType = "GROTH16" | "FALLBACK_ECDSA";

export type ZKFailReason =
  | "WASM_LOAD_FAILED"
  | "PROOF_GENERATION_FAILED"
  | "FALLBACK_SIGN_FAILED";

export interface ZKResult {
  /** JSON-serialised snarkjs proof object, or null if fallback used */
  proof: string | null;
  publicSignals: string[];
  /** Base64url-encoded ECDSA signature when GROTH16 is unavailable */
  fallbackSignature?: string;
  proofType: ProofType;
  reason?: ZKFailReason;
}

// ─── Step 4 — Handoff Bundle ──────────────────────────────────────────────────

export type BundleStatus = "OK" | "CONTESTED";

export type ContestReason =
  | "SEAL_FAILED"
  | "TEMP_OUT_OF_RANGE"
  | "SEAL_AND_TEMP_FAILED";

export interface HandoffBundle {
  /** UUID assigned at shipment creation */
  shipmentId: string;
  sealVerification: SealResult;
  temperatureData: TempResult;
  temperatureProof: ZKResult;
  /** ISO 8601 timestamp when the handoff scan completed */
  scannedAt: string;
  /** Identifier for the receiving device (from localStorage) */
  receiverDeviceId: string;
  status: BundleStatus;
  contestReason?: ContestReason;
}

// ─── Configuration ─────────────────────────────────────────────────────────────

export interface TemperatureThreshold {
  /** Inclusive lower bound in °C */
  min: number;
  /** Inclusive upper bound in °C */
  max: number;
}

export interface PhysicalLayerConfig {
  temperatureThreshold: TemperatureThreshold;
  /** NFC read timeout in milliseconds */
  nfcReadTimeoutMs: number;
  /** Maximum ms to wait for ZK proof before switching to fallback */
  zkProofTimeoutMs: number;
  /** localStorage key holding the seal's Ed25519 public key (hex) */
  sealPublicKeyStorageKey: string;
  /** localStorage key holding the logger's Ed25519 public key (hex) */
  loggerPublicKeyStorageKey: string;
  /** localStorage key for current shipment ID */
  shipmentIdStorageKey: string;
  /** localStorage key for receiver device ID */
  receiverDeviceIdStorageKey: string;
}

export const DEFAULT_CONFIG: PhysicalLayerConfig = {
  temperatureThreshold: { min: 2, max: 8 },
  nfcReadTimeoutMs: 3000,
  zkProofTimeoutMs: 8000,
  sealPublicKeyStorageKey: "vc:seal:publicKey",
  loggerPublicKeyStorageKey: "vc:logger:publicKey",
  shipmentIdStorageKey: "vc:shipment:id",
  receiverDeviceIdStorageKey: "vc:device:id",
};
