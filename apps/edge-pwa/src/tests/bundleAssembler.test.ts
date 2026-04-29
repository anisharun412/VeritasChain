/**
 * bundleAssembler.test.ts
 *
 * Integration tests for the full handoff flow.
 * Uses vi.hoisted() so mock fn references are available before vi.mock() hoisting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoisted mock functions (must be declared before vi.mock calls) ───────────

const {
  mockVerifySeal,
  mockReadLogger,
  mockGenerateProof,
  mockStoreBundle,
} = vi.hoisted(() => ({
  mockVerifySeal: vi.fn(),
  mockReadLogger: vi.fn(),
  mockGenerateProof: vi.fn(),
  mockStoreBundle: vi.fn(),
}));

vi.mock("../nfc/sealVerifier", () => ({ verifySeal: mockVerifySeal }));
vi.mock("../nfc/tempReader", () => ({ readTemperatureLogger: mockReadLogger }));
vi.mock("../zk/proofGenerator", () => ({ generateTemperatureProof: mockGenerateProof }));
vi.mock("../handoff/db", () => ({ storeBundle: mockStoreBundle }));

// ─── Test fixtures ────────────────────────────────────────────────────────────

const MOCK_SHIPMENT_ID = "ship-123-abc";
const MOCK_DEVICE_ID = "device-XYZ";

const HAPPY_SEAL: SealResult = {
  valid: true,
  sealId: "SEAL_UID_001",
  signature: "validSig==",
  verifiedAt: "2026-04-29T20:00:00.000Z",
};

const HAPPY_TEMP: TempResult = {
  merkleRoot: "0x" + "aa".repeat(32),
  readingCount: 3,
  minTemp: 3.5,
  maxTemp: 6.0,
  allCompliant: true,
  verifiedAt: "2026-04-29T20:00:01.000Z",
  readings: [
    { timestamp: 1700000000000, tempCelsius: 3.5, signature: "s1" },
    { timestamp: 1700000300000, tempCelsius: 5.0, signature: "s2" },
    { timestamp: 1700000600000, tempCelsius: 6.0, signature: "s3" },
  ],
};

const HAPPY_ZK: ZKResult = {
  proof: JSON.stringify({ protocol: "groth16" }),
  publicSignals: ["1", "2", "3", "4", "5"],
  proofType: "GROTH16",
};

const FAILED_SEAL: SealResult = {
  valid: false,
  sealId: "",
  signature: "",
  verifiedAt: "2026-04-29T20:00:00.000Z",
  reason: "SEAL_BROKEN",
};

const OUT_OF_RANGE_TEMP: TempResult = {
  ...HAPPY_TEMP,
  allCompliant: false,
  minTemp: 1.0,
  maxTemp: 11.0,
};

// Type imports (used only for fixture typing above)
import type { SealResult, TempResult, ZKResult } from "../types/physicalLayer";

// ─── localStorage helper ──────────────────────────────────────────────────────

function setLocalStore(store: Record<string, string>) {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(
    (key: string) => store[key] ?? null
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("assembleHandoffBundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLocalStore({
      "vc:shipment:id": MOCK_SHIPMENT_ID,
      "vc:device:id": MOCK_DEVICE_ID,
    });
    // Default happy-path responses
    mockVerifySeal.mockResolvedValue({ success: true, data: HAPPY_SEAL });
    mockReadLogger.mockResolvedValue({ success: true, data: HAPPY_TEMP });
    mockGenerateProof.mockResolvedValue({ success: true, data: HAPPY_ZK });
    mockStoreBundle.mockResolvedValue({ success: true, data: { id: MOCK_SHIPMENT_ID } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns MISSING_SHIPMENT_ID error when shipmentId not in localStorage", async () => {
    setLocalStore({ "vc:device:id": MOCK_DEVICE_ID });

    const { assembleHandoffBundle } = await import("../handoff/bundleAssembler");
    const result = await assembleHandoffBundle();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("MISSING_SHIPMENT_ID");
    }
  });

  it("assembles an OK bundle when all steps succeed", async () => {
    const { assembleHandoffBundle } = await import("../handoff/bundleAssembler");

    let emittedBundle: unknown = null;
    const handler = (e: Event) => {
      emittedBundle = (e as CustomEvent).detail.bundle;
    };
    window.addEventListener("handoff-bundle-ready", handler);

    const result = await assembleHandoffBundle();

    window.removeEventListener("handoff-bundle-ready", handler);

    expect(result.success).toBe(true);
    if (result.success) {
      const bundle = result.data;
      expect(bundle.status).toBe("OK");
      expect(bundle.shipmentId).toBe(MOCK_SHIPMENT_ID);
      expect(bundle.receiverDeviceId).toBe(MOCK_DEVICE_ID);
      expect(bundle.sealVerification.valid).toBe(true);
      expect(bundle.temperatureData.allCompliant).toBe(true);
      expect(bundle.temperatureProof.proofType).toBe("GROTH16");
      expect(bundle.contestReason).toBeUndefined();
    }

    expect(emittedBundle).not.toBeNull();
    expect(mockStoreBundle).toHaveBeenCalledOnce();
  });

  it("assembles CONTESTED bundle with SEAL_FAILED when seal is broken", async () => {
    mockVerifySeal.mockResolvedValueOnce({ success: true, data: FAILED_SEAL });

    const { assembleHandoffBundle } = await import("../handoff/bundleAssembler");
    const result = await assembleHandoffBundle();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("CONTESTED");
      expect(result.data.contestReason).toBe("SEAL_FAILED");
      expect(result.data.sealVerification.reason).toBe("SEAL_BROKEN");
    }
  });

  it("assembles CONTESTED bundle with TEMP_OUT_OF_RANGE when temp fails", async () => {
    mockReadLogger.mockResolvedValueOnce({ success: true, data: OUT_OF_RANGE_TEMP });

    const { assembleHandoffBundle } = await import("../handoff/bundleAssembler");
    const result = await assembleHandoffBundle();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("CONTESTED");
      expect(result.data.contestReason).toBe("TEMP_OUT_OF_RANGE");
    }
  });

  it("assembles CONTESTED bundle with SEAL_AND_TEMP_FAILED when both fail", async () => {
    mockVerifySeal.mockResolvedValueOnce({ success: true, data: FAILED_SEAL });
    mockReadLogger.mockResolvedValueOnce({ success: true, data: OUT_OF_RANGE_TEMP });

    const { assembleHandoffBundle } = await import("../handoff/bundleAssembler");
    const result = await assembleHandoffBundle();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("CONTESTED");
      expect(result.data.contestReason).toBe("SEAL_AND_TEMP_FAILED");
    }
  });

  it("still emits DOM event and returns bundle when IDB store fails", async () => {
    mockStoreBundle.mockResolvedValueOnce({
      success: false,
      error: { code: "IDB_STORE_FAILED", message: "IndexedDB unavailable" },
    });

    let eventFired = false;
    const handler = () => { eventFired = true; };
    window.addEventListener("handoff-bundle-ready", handler);

    const { assembleHandoffBundle } = await import("../handoff/bundleAssembler");
    const result = await assembleHandoffBundle();

    window.removeEventListener("handoff-bundle-ready", handler);

    expect(result.success).toBe(true);
    expect(eventFired).toBe(true);
  });

  it("handles NFC seal fatal error gracefully (returns SEAL_NOT_FOUND contested)", async () => {
    mockVerifySeal.mockResolvedValueOnce({
      success: false,
      error: { code: "NFC_NOT_SUPPORTED", message: "NFC not available" },
    });

    const { assembleHandoffBundle } = await import("../handoff/bundleAssembler");
    const result = await assembleHandoffBundle();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("CONTESTED");
      expect(result.data.sealVerification.valid).toBe(false);
    }
  });

  it("includes scannedAt as a valid ISO 8601 date", async () => {
    const { assembleHandoffBundle } = await import("../handoff/bundleAssembler");
    const result = await assembleHandoffBundle();

    if (result.success) {
      expect(new Date(result.data.scannedAt).toISOString()).toBe(result.data.scannedAt);
    }
  });
});
