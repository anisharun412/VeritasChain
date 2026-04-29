/**
 * tempReader.test.ts
 *
 * Tests for the temperature logger NFC read, signature verification,
 * Merkle tree construction, and compliance checking.
 *
 * Mocks: Web NFC (via nfcUtils), @veritaschain/crypto, localStorage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import type { Reading } from "../types/physicalLayer";
import { buildMerkleRoot, buildMerkleTree, verifyMerkleProof } from "../nfc/tempReader";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_READINGS: Reading[] = [
  { timestamp: 1700000000000, tempCelsius: 3.5, signature: "sigA" },
  { timestamp: 1700000300000, tempCelsius: 4.1, signature: "sigB" },
  { timestamp: 1700000600000, tempCelsius: 5.0, signature: "sigC" },
];

const OUT_OF_RANGE_READINGS: Reading[] = [
  { timestamp: 1700000000000, tempCelsius: 1.0, signature: "sigX" }, // below 2°C
  { timestamp: 1700000300000, tempCelsius: 9.5, signature: "sigY" }, // above 8°C
];

function makeLoggerPayload(readings: Reading[], deviceId = "did:esp32:ABC123") {
  return JSON.stringify({ deviceId, fwVersion: "1.0.0", readings });
}

function mockLocalStorage(store: Record<string, string>) {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(
    (key: string) => store[key] ?? null
  );
}

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@veritaschain/crypto", () => ({
  verifyEd25519: vi.fn().mockResolvedValue({ success: true, data: true }),
  buildReadingMessage: vi.fn(
    (timestamp: number, tempCelsius: number) =>
      new TextEncoder().encode(`${timestamp}:${tempCelsius}`)
  ),
  base64urlToBytes: vi.fn((s: string) => new TextEncoder().encode(s)),
  bytesToHex: vi.fn((b: Uint8Array) =>
    Array.from(b)
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  ),
}));

// ─── Tests: Merkle tree (pure, no mocks needed) ───────────────────────────────

describe("buildMerkleRoot", () => {
  it("returns a 0x-prefixed hex string for non-empty readings", () => {
    const root = buildMerkleRoot(VALID_READINGS);
    expect(root).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });

  it("returns deterministic empty root for empty array", () => {
    const root = buildMerkleRoot([]);
    expect(root).toBe("0x" + "00".repeat(32));
  });

  it("produces different roots for different readings", () => {
    const root1 = buildMerkleRoot(VALID_READINGS);
    const root2 = buildMerkleRoot(OUT_OF_RANGE_READINGS);
    expect(root1).not.toBe(root2);
  });

  it("produces the same root for same readings in same order", () => {
    const root1 = buildMerkleRoot(VALID_READINGS);
    const root2 = buildMerkleRoot([...VALID_READINGS]);
    expect(root1).toBe(root2);
  });
});

describe("buildMerkleTree + verifyMerkleProof", () => {
  it("generates valid proofs for each leaf", () => {
    const tree = buildMerkleTree(VALID_READINGS);
    const root = tree.root;

    for (const [i, leaf] of tree.entries()) {
      const proof = tree.getProof(i);
      const TEMP_SCALE = 10_000n;
      const reading = VALID_READINGS.find(
        (r) =>
          BigInt(r.timestamp) === leaf[0] &&
          BigInt(Math.round(r.tempCelsius * Number(TEMP_SCALE))) === leaf[1]
      )!;
      expect(verifyMerkleProof(root, reading, proof)).toBe(true);
    }
  });

  it("rejects tampered reading proof", () => {
    const tree = buildMerkleTree(VALID_READINGS);
    const root = tree.root;
    const proof = tree.getProof(0);

    const tampered: Reading = {
      ...VALID_READINGS[0],
      tempCelsius: 99.0, // tampered temperature
    };
    expect(verifyMerkleProof(root, tampered, proof)).toBe(false);
  });
});

// ─── Tests: readTemperatureLogger (NFC integration) ──────────────────────────

describe("readTemperatureLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage({ "vc:logger:publicKey": "0".repeat(64) });
  });

  it("returns LOGGER_NOT_FOUND when no public key in localStorage", async () => {
    mockLocalStorage({});
    vi.doMock("../nfc/nfcUtils", () => ({ readNfcTag: vi.fn() }));
    vi.resetModules();

    const { readTemperatureLogger } = await import("../nfc/tempReader");
    const result = await readTemperatureLogger();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("LOGGER_NOT_FOUND");
    }
  });

  it("returns LOGGER_READ_TIMEOUT when NFC read times out", async () => {
    vi.doMock("../nfc/nfcUtils", () => ({
      readNfcTag: vi.fn().mockResolvedValue({
        success: false,
        error: { code: "NFC_READ_TIMEOUT", message: "timeout" },
      }),
    }));
    vi.resetModules();

    const { readTemperatureLogger } = await import("../nfc/tempReader");
    const result = await readTemperatureLogger();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("LOGGER_READ_TIMEOUT");
    }
  });

  it("returns LOGGER_PAYLOAD_MALFORMED for non-JSON payload", async () => {
    vi.doMock("../nfc/nfcUtils", () => ({
      readNfcTag: vi.fn().mockResolvedValue({
        success: true,
        data: { payload: "not valid json", serialNumber: "SN123", records: [] },
      }),
    }));
    vi.resetModules();

    const { readTemperatureLogger } = await import("../nfc/tempReader");
    const result = await readTemperatureLogger();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("LOGGER_PAYLOAD_MALFORMED");
    }
  });

  it("returns TempResult with allCompliant=true for in-range readings", async () => {
    vi.doMock("../nfc/nfcUtils", () => ({
      readNfcTag: vi.fn().mockResolvedValue({
        success: true,
        data: {
          payload: makeLoggerPayload(VALID_READINGS),
          serialNumber: "SN789",
          records: [],
        },
      }),
    }));
    vi.resetModules();

    const { readTemperatureLogger } = await import("../nfc/tempReader");
    const result = await readTemperatureLogger({
      temperatureThreshold: { min: 2, max: 8 },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allCompliant).toBe(true);
      expect(result.data.readingCount).toBe(3);
      expect(result.data.minTemp).toBe(3.5);
      expect(result.data.maxTemp).toBe(5.0);
      expect(result.data.merkleRoot).toMatch(/^0x[0-9a-fA-F]{64}$/);
    }
  });

  it("returns allCompliant=false when temperatures are out of range", async () => {
    vi.doMock("../nfc/nfcUtils", () => ({
      readNfcTag: vi.fn().mockResolvedValue({
        success: true,
        data: {
          payload: makeLoggerPayload(OUT_OF_RANGE_READINGS),
          serialNumber: "SN999",
          records: [],
        },
      }),
    }));
    vi.resetModules();

    const { readTemperatureLogger } = await import("../nfc/tempReader");
    const result = await readTemperatureLogger({
      temperatureThreshold: { min: 2, max: 8 },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allCompliant).toBe(false);
      expect(result.data.minTemp).toBe(1.0);
      expect(result.data.maxTemp).toBe(9.5);
    }
  });

  it("returns LOGGER_SIGNATURE_INVALID when any signature fails", async () => {
    const { verifyEd25519 } = await import("@veritaschain/crypto");
    (verifyEd25519 as Mock)
      .mockResolvedValueOnce({ success: true, data: true })  // first reading ok
      .mockResolvedValueOnce({ success: true, data: false }); // second fails

    vi.doMock("../nfc/nfcUtils", () => ({
      readNfcTag: vi.fn().mockResolvedValue({
        success: true,
        data: {
          payload: makeLoggerPayload(VALID_READINGS.slice(0, 2)),
          serialNumber: "SN111",
          records: [],
        },
      }),
    }));
    vi.resetModules();

    const { readTemperatureLogger } = await import("../nfc/tempReader");
    const result = await readTemperatureLogger();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("LOGGER_SIGNATURE_INVALID");
    }
  });
});
