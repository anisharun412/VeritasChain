/**
 * proofGenerator.test.ts
 *
 * Tests for ZK proof generation:
 *   - Groth16 happy path
 *   - Groth16 timeout → ECDSA fallback
 *   - snarkjs load failure → ECDSA fallback
 *   - WASM/zkey file not found → ECDSA fallback
 *   - Fallback ECDSA attestation structure validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

const FAKE_MERKLE_ROOT =
  "0x" + "ab".repeat(32);
const MIN_TEMP = 3.5;
const MAX_TEMP = 7.2;

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@veritaschain/crypto", () => ({
  bytesToBase64url: vi.fn(
    (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/=/g, "")
  ),
}));

// ─── snarkjs happy-path mock ──────────────────────────────────────────────────

function mockSnarkjsSuccess() {
  vi.doMock("snarkjs", () => ({
    groth16: {
      fullProve: vi.fn().mockResolvedValue({
        proof: {
          pi_a: ["1", "2", "1"],
          pi_b: [["3", "4"], ["5", "6"], ["1", "0"]],
          pi_c: ["7", "8", "1"],
          protocol: "groth16",
        },
        publicSignals: ["12345", "350", "720", "200", "800"],
      }),
    },
  }));
}

function mockFetchCircuitFiles(succeed: boolean) {
  vi.doMock("../zk/snarkjsLoader", async () => {
    const actual = await vi.importActual<typeof import("../zk/snarkjsLoader")>(
      "../zk/snarkjsLoader"
    );
    return {
      ...actual,
      fetchCircuitFile: vi.fn().mockResolvedValue(
        succeed
          ? { success: true, data: new Uint8Array(100) }
          : {
              success: false,
              error: { code: "CIRCUIT_FILE_NOT_FOUND", message: "404" },
            }
      ),
      loadSnarkjs: vi.fn().mockResolvedValue(
        succeed
          ? {
              success: true,
              data: {
                groth16: {
                  fullProve: vi.fn().mockResolvedValue({
                    proof: { protocol: "groth16" },
                    publicSignals: ["1", "2", "3", "4", "5"],
                  }),
                },
              },
            }
          : {
              success: false,
              error: { code: "WASM_LOAD_FAILED", message: "import failed" },
            }
      ),
    };
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("generateTemperatureProof", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns GROTH16 proof on happy path", async () => {
    mockFetchCircuitFiles(true);
    vi.resetModules();

    const { generateTemperatureProof } = await import(
      "../zk/proofGenerator"
    );
    const result = await generateTemperatureProof(
      FAKE_MERKLE_ROOT,
      MIN_TEMP,
      MAX_TEMP
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.proofType).toBe("GROTH16");
      expect(result.data.proof).not.toBeNull();
      expect(result.data.publicSignals).toHaveLength(5);
    }
  });

  it("falls back to ECDSA when circuit files cannot be fetched", async () => {
    vi.doMock("../zk/snarkjsLoader", () => ({
      loadSnarkjs: vi.fn().mockResolvedValue({
        success: false,
        error: { code: "WASM_LOAD_FAILED", message: "failed" },
      }),
      fetchCircuitFile: vi.fn().mockResolvedValue({
        success: false,
        error: { code: "CIRCUIT_FILE_NOT_FOUND", message: "404" },
      }),
    }));
    vi.resetModules();

    const { generateTemperatureProof } = await import(
      "../zk/proofGenerator"
    );
    const result = await generateTemperatureProof(
      FAKE_MERKLE_ROOT,
      MIN_TEMP,
      MAX_TEMP
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.proofType).toBe("FALLBACK_ECDSA");
      expect(result.data.proof).toBeNull();
      expect(result.data.fallbackSignature).toBeDefined();
      expect(typeof result.data.fallbackSignature).toBe("string");
    }
  });

  it("falls back to ECDSA on proof timeout", async () => {
    // Make loadSnarkjs resolve successfully but fullProve never resolves
    // within the timeout window
    vi.doMock("../zk/snarkjsLoader", () => ({
      loadSnarkjs: vi.fn().mockResolvedValue({
        success: true,
        data: {
          groth16: {
            fullProve: vi.fn().mockImplementation(
              () => new Promise(() => {}) // never resolves
            ),
          },
        },
      }),
      fetchCircuitFile: vi.fn().mockResolvedValue({
        success: true,
        data: new Uint8Array(100),
      }),
    }));
    vi.resetModules();
    vi.useFakeTimers();

    const { generateTemperatureProof } = await import(
      "../zk/proofGenerator"
    );

    const proofPromise = generateTemperatureProof(
      FAKE_MERKLE_ROOT,
      MIN_TEMP,
      MAX_TEMP,
      2,
      8,
      { zkProofTimeoutMs: 100 }
    );

    // Advance timers past the timeout
    await vi.runAllTimersAsync();
    const result = await proofPromise;

    vi.useRealTimers();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.proofType).toBe("FALLBACK_ECDSA");
      expect(result.data.proof).toBeNull();
    }
  });

  it("ECDSA fallback includes correct publicSignals", async () => {
    vi.doMock("../zk/snarkjsLoader", () => ({
      loadSnarkjs: vi.fn().mockResolvedValue({
        success: false,
        error: { code: "WASM_LOAD_FAILED", message: "" },
      }),
      fetchCircuitFile: vi.fn(),
    }));
    vi.resetModules();

    const { generateTemperatureProof } = await import(
      "../zk/proofGenerator"
    );
    const result = await generateTemperatureProof(
      FAKE_MERKLE_ROOT,
      3.5,
      7.2,
      2,
      8
    );

    if (result.success && result.data.proofType === "FALLBACK_ECDSA") {
      // publicSignals: [merkleRoot, minTemp*100, maxTemp*100, threshMin*100, threshMax*100]
      expect(result.data.publicSignals[0]).toBe(FAKE_MERKLE_ROOT);
      expect(result.data.publicSignals[1]).toBe("350");  // 3.5 * 100
      expect(result.data.publicSignals[2]).toBe("720");  // 7.2 * 100
      expect(result.data.publicSignals[3]).toBe("200");  // 2 * 100
      expect(result.data.publicSignals[4]).toBe("800");  // 8 * 100
    }
  });
});
