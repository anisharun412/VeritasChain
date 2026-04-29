/**
 * /apps/edge-pwa/src/types/physicalLayer.ts
 *
 * Local re-export + PWA-specific extensions of the shared types package.
 * Import from here within the edge-pwa app so that refactoring the
 * package path only requires updating this one file.
 */

export type {
  ErrorInfo,
  Result,
  Reading,
  LoggerNfcPayload,
  SealFailReason,
  SealResult,
  LoggerFailReason,
  TempResult,
  ProofType,
  ZKFailReason,
  ZKResult,
  BundleStatus,
  ContestReason,
  HandoffBundle,
  TemperatureThreshold,
  PhysicalLayerConfig,
} from "@veritaschain/types";

export { DEFAULT_CONFIG } from "@veritaschain/types";

// ─── PWA-only helpers not in the shared package ────────────────────────────────

/** Shape stored in IndexedDB for each completed handoff attempt */
export interface StoredBundle {
  id: string; // IDBValidKey — same as shipmentId
  bundle: import("@veritaschain/types").HandoffBundle;
  storedAt: string; // ISO 8601
  synced: boolean;
}

/** Emitted on `window` as CustomEvent<HandoffBundleEvent> */
export interface HandoffBundleEvent {
  bundle: import("@veritaschain/types").HandoffBundle;
}

/** Result helper constructors */
export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function err(
  code: string,
  message: string
): { success: false; error: import("@veritaschain/types").ErrorInfo } {
  return { success: false, error: { code, message } };
}
