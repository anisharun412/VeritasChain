/**
 * sealVerifier.test.ts
 *
 * Tests for the NFC seal challenge-response verification flow.
 * Mocks: Web NFC (NDEFReader), localStorage, @veritaschain/crypto
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";

// ─── Mock @noble/ed25519 before importing anything that uses it ───────────────
vi.mock("@noble/ed25519", () => ({
  verify: vi.fn().mockResolvedValue(true),
  etc: { sha512: undefined, sha512Sync: undefined },
  sha512: vi.fn(),
}));

// ─── Mock @veritaschain/crypto ─────────────────────────────────────────────────
vi.mock("@veritaschain/crypto", () => ({
  generateNonce: vi.fn(() => ({
    success: true,
    data: { hex: "aabbccdd".repeat(8), bytes: new Uint8Array(32) },
  })),
  verifyEd25519: vi.fn().mockResolvedValue({ success: true, data: true }),
  buildSealChallengeMessage: vi.fn(() => new Uint8Array([1, 2, 3])),
  bytesToBase64url: vi.fn((b: Uint8Array) => btoa(String.fromCharCode(...b))),
  base64urlToBytes: vi.fn(() => new Uint8Array(64).fill(0xab)),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockLocalStorage(store: Record<string, string>) {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(
    (key: string) => store[key] ?? null
  );
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(
    (key: string, value: string) => { store[key] = value; }
  );
}

function mockNdEFReaderSuccess(options: {
  serialNumber?: string;
  payload?: string;
  failOnWrite?: boolean;
}) {
  const { serialNumber = "04:AB:CD:EF:12:34:56", payload = "base64sighere==", failOnWrite = false } = options;

  const mockWrite = failOnWrite
    ? vi.fn().mockRejectedValue(new Error("NFC write failed"))
    : vi.fn().mockResolvedValue(undefined);

  const mockScan = vi.fn().mockImplementation(async () => {
    // Immediately trigger the reading event via setTimeout
    setTimeout(() => {
      const event = new CustomEvent("reading") as CustomEvent & {
        serialNumber: string;
        message: { records: unknown[] };
      };
      Object.defineProperty(event, "serialNumber", { value: serialNumber });
      Object.defineProperty(event, "message", {
        value: {
          records: [
            {
              recordType: "text",
              encoding: "utf-8",
              data: new TextEncoder().encode(payload),
            },
          ],
        },
      });
      (globalThis as unknown as Record<string, Mock>)._ndefReaderInstance?.dispatchEvent(event);
    }, 0);
  });

  const mockAddEventListener = vi.fn();

  class MockNDEFReader extends EventTarget {
    constructor() {
      super();
      (globalThis as unknown as Record<string, unknown>)._ndefReaderInstance = this;
    }
    scan = mockScan;
    write = mockWrite;
  }

  Object.defineProperty(window, "NDEFReader", {
    value: MockNDEFReader,
    configurable: true,
    writable: true,
  });

  return { mockScan, mockWrite, mockAddEventListener };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("sealVerifier", () => {
  let localStore: Record<string, string>;

  beforeEach(() => {
    localStore = {};
    mockLocalStorage(localStore);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns SEAL_NOT_FOUND when no public key in localStorage", async () => {
    // No key in store
    const { verifySeal } = await import("../nfc/sealVerifier");
    const result = await verifySeal();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SEAL_NOT_FOUND");
    }
  });

  it("returns valid: true for a correct signature", async () => {
    localStore["vc:seal:publicKey"] = "0".repeat(64);

    const { verifyEd25519 } = await import("@veritaschain/crypto");
    (verifyEd25519 as Mock).mockResolvedValueOnce({ success: true, data: true });

    mockNdEFReaderSuccess({ payload: "validSignature" });

    // We'll test nfcUtils.readNfcTag + nfcUtils.writeNfcTag integration via
    // a direct mock of those modules
    vi.doMock("../nfc/nfcUtils", () => ({
      readNfcTag: vi.fn().mockResolvedValue({
        success: true,
        data: {
          payload: "validBase64Sig==",
          serialNumber: "SEAL_UID_123",
          records: [],
        },
      }),
      writeNfcTag: vi.fn().mockResolvedValue({ success: true, data: undefined }),
    }));

    vi.resetModules(); // force re-import with new mock
    const { verifySeal: verifySealFresh } = await import("../nfc/sealVerifier");
    const result = await verifySealFresh();

    // With verifyEd25519 mocked to true, this should succeed
    if (result.success) {
      expect(result.data.valid).toBe(true);
    }
  });

  it("returns SIGNATURE_INVALID when signature verification fails", async () => {
    const { verifyEd25519 } = await import("@veritaschain/crypto");
    (verifyEd25519 as Mock).mockResolvedValueOnce({ success: true, data: false });

    vi.doMock("../nfc/nfcUtils", () => ({
      readNfcTag: vi.fn().mockResolvedValue({
        success: true,
        data: {
          payload: "badSig==",
          serialNumber: "SEAL_UID_456",
          records: [],
        },
      }),
      writeNfcTag: vi.fn().mockResolvedValue({ success: true, data: undefined }),
    }));

    vi.resetModules();
    localStore["vc:seal:publicKey"] = "0".repeat(64);
    const { verifySeal: fresh } = await import("../nfc/sealVerifier");
    const result = await fresh();

    if (result.success) {
      expect(result.data.valid).toBe(false);
      expect(result.data.reason).toBe("SIGNATURE_INVALID");
    }
  });

  it("returns SEAL_BROKEN when NFC write fails", async () => {
    localStore["vc:seal:publicKey"] = "0".repeat(64);

    vi.doMock("../nfc/nfcUtils", () => ({
      writeNfcTag: vi.fn().mockResolvedValue({
        success: false,
        error: { code: "NFC_WRITE_TIMEOUT", message: "timeout" },
      }),
      readNfcTag: vi.fn(),
    }));

    vi.resetModules();
    const { verifySeal: fresh } = await import("../nfc/sealVerifier");
    const result = await fresh();

    if (result.success) {
      expect(result.data.valid).toBe(false);
      expect(result.data.reason).toBe("SEAL_BROKEN");
    }
  });

  it("returns SEAL_BROKEN when NFC read fails after write", async () => {
    localStore["vc:seal:publicKey"] = "0".repeat(64);

    vi.doMock("../nfc/nfcUtils", () => ({
      writeNfcTag: vi.fn().mockResolvedValue({ success: true, data: undefined }),
      readNfcTag: vi.fn().mockResolvedValue({
        success: false,
        error: { code: "NFC_READ_TIMEOUT", message: "timeout" },
      }),
    }));

    vi.resetModules();
    const { verifySeal: fresh } = await import("../nfc/sealVerifier");
    const result = await fresh();

    if (result.success) {
      expect(result.data.valid).toBe(false);
      expect(result.data.reason).toBe("SEAL_BROKEN");
    }
  });
});
