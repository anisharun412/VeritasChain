/**
 * snarkjsLoader.ts — Dynamic loader for snarkjs WASM bundle
 *
 * snarkjs is a large WASM library (~1.5 MB). We load it lazily on first use
 * so it does not block the initial PWA render.
 *
 * Strategy:
 *   1. Dynamic import("snarkjs") — bundled by Vite but loaded only when needed
 *   2. Expose a singleton accessor so the WASM is only initialised once
 *
 * Browser target: Chrome 100+ (Wasm 2.0, BigInt support required)
 */

import type { CryptoResult } from "@veritaschain/crypto";

// ─── snarkjs types (minimal, avoids importing the whole module at type level) ──

export interface SnarkjsLib {
  groth16: {
    fullProve(
      input: Record<string, unknown>,
      wasmFile: string | Uint8Array,
      zkeyFile: string | Uint8Array,
      logger?: { debug: (msg: string) => void } | null
    ): Promise<{ proof: object; publicSignals: string[] }>;
    verify(
      vKey: object,
      publicSignals: string[],
      proof: object
    ): Promise<boolean>;
  };
  zKey: {
    exportVerificationKey(zkeyFileName: string | Uint8Array): Promise<object>;
  };
}

// ─── Singleton state ──────────────────────────────────────────────────────────

let snarkjsPromise: Promise<CryptoResult<SnarkjsLib>> | null = null;

// ─── Circuit file fetching ────────────────────────────────────────────────────

/**
 * Fetch a circuit artifact (WASM / zkey) as a Uint8Array from the /circuits/build/
 * directory served as a Vite static asset.
 *
 * Files must be placed in `/apps/edge-pwa/public/circuits/build/` so Vite
 * serves them at `/circuits/build/<filename>`.
 */
export async function fetchCircuitFile(
  filename: string
): Promise<CryptoResult<Uint8Array>> {
  const url = `/circuits/build/${filename}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return {
        success: false,
        error: {
          code: "CIRCUIT_FILE_NOT_FOUND",
          message: `Failed to fetch ${url}: HTTP ${res.status} ${res.statusText}`,
        },
      };
    }
    const buf = await res.arrayBuffer();
    return { success: true, data: new Uint8Array(buf) };
  } catch (e) {
    return {
      success: false,
      error: {
        code: "CIRCUIT_FILE_FETCH_FAILED",
        message: `Error fetching ${url}: ${e instanceof Error ? e.message : String(e)}`,
      },
    };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Lazily load and return a reference to the snarkjs library.
 *
 * The import is wrapped in a singleton Promise so it is only imported once
 * per page lifecycle (WASM module instantiation is expensive).
 *
 * @returns CryptoResult<SnarkjsLib>
 */
export function loadSnarkjs(): Promise<CryptoResult<SnarkjsLib>> {
  if (snarkjsPromise) return snarkjsPromise;

  snarkjsPromise = (async () => {
    try {
      // Dynamic import — Vite will code-split snarkjs into a separate chunk
      const snarkjs = await import("snarkjs");
      return {
        success: true,
        data: snarkjs as unknown as SnarkjsLib,
      };
    } catch (e) {
      snarkjsPromise = null; // allow retry
      return {
        success: false,
        error: {
          code: "WASM_LOAD_FAILED",
          message: `Failed to load snarkjs: ${e instanceof Error ? e.message : String(e)}`,
        },
      };
    }
  })();

  return snarkjsPromise;
}

/**
 * Pre-warm the snarkjs WASM module.
 * Call this on app mount to hide the load latency behind user navigation.
 */
export function preWarmSnarkjs(): void {
  void loadSnarkjs();
}

/**
 * Reset the singleton (for tests only).
 */
export function _resetSnarkjsForTest(): void {
  snarkjsPromise = null;
}
