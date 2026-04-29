/**
 * nfcUtils.ts — Shared Web NFC helpers
 *
 * Wraps the NDEFReader API with:
 *   - Type-safe wrappers
 *   - Permission checking
 *   - Configurable read timeout
 *   - Browser support detection
 *
 * All functions return Result<T>; none throw.
 */

import { type Result } from "../types/physicalLayer";
import { ok, err } from "../types/physicalLayer";

// ─── Browser capability detection ─────────────────────────────────────────────

/**
 * Returns true if the Web NFC API (NDEFReader) is available.
 * Only Chrome 89+ on Android supports this.
 */
export function isNfcSupported(): boolean {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

// ─── Permission ───────────────────────────────────────────────────────────────

/**
 * Request NFC permission from the user.
 * Must be called in response to a user gesture (button click etc.).
 *
 * @returns Result<"granted" | "denied" | "prompt">
 */
export async function requestNfcPermission(): Promise<
  Result<PermissionState>
> {
  if (!isNfcSupported()) {
    return err(
      "NFC_NOT_SUPPORTED",
      "Web NFC is not supported in this browser. Use Chrome 89+ on Android."
    );
  }

  try {
    // NDEFReader permission is requested implicitly on first scan(),
    // but we can query the state first.
    const status = await navigator.permissions.query({
      name: "nfc" as PermissionName,
    });
    return ok(status.state);
  } catch (e) {
    // Firefox / non-Chrome browsers throw on unknown permission name
    return err(
      "NFC_PERMISSION_QUERY_FAILED",
      `Could not query NFC permission: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

// ─── NDEF read ─────────────────────────────────────────────────────────────────

export interface NfcReadResult {
  /** Serialised NDEF records as a raw string payload (first UTF-8 text record) */
  payload: string;
  /** The chip's NFC serial number / UID */
  serialNumber: string;
  /** All NDEF records (raw) */
  records: NDEFRecord[];
}

/**
 * Read a single NDEF tag within a given timeout.
 *
 * Starts an NDEFReader scan, waits for the first `reading` event, then
 * immediately aborts the scan.
 *
 * @param timeoutMs — abort after this many ms (default 3 000)
 * @returns Result<NfcReadResult>
 */
export async function readNfcTag(
  timeoutMs = 3000
): Promise<Result<NfcReadResult>> {
  if (!isNfcSupported()) {
    return err(
      "NFC_NOT_SUPPORTED",
      "Web NFC is not supported in this browser."
    );
  }

  let abortController: AbortController | undefined;

  return new Promise<Result<NfcReadResult>>((resolve) => {
    let settled = false;

    const settle = (result: Result<NfcReadResult>) => {
      if (settled) return;
      settled = true;
      abortController?.abort();
      clearTimeout(timer);
      resolve(result);
    };

    // Timeout guard
    const timer = setTimeout(() => {
      settle(
        err(
          "NFC_READ_TIMEOUT",
          `No NFC tag detected within ${timeoutMs}ms.`
        )
      );
    }, timeoutMs);

    (async () => {
      try {
        // @ts-expect-error — NDEFReader not yet in lib.dom.d.ts for all TS versions
        const reader = new window.NDEFReader() as NDEFReader;
        abortController = new AbortController();

        await reader.scan({ signal: abortController.signal });

        reader.addEventListener("reading", (event: NDEFReadingEvent) => {
          const { message, serialNumber } = event;
          const records = Array.from(message.records);

          // Extract first UTF-8 text record as the payload
          let payload = "";
          for (const record of records) {
            if (record.recordType === "text" && record.data) {
              const decoder = new TextDecoder(record.encoding ?? "utf-8");
              payload = decoder.decode(record.data);
              break;
            }
            if (record.recordType === "mime" && record.data) {
              const decoder = new TextDecoder("utf-8");
              payload = decoder.decode(record.data);
              break;
            }
          }

          settle(ok({ payload, serialNumber, records }));
        });

        reader.addEventListener("readingerror", () => {
          settle(
            err("NFC_READ_ERROR", "An error occurred while reading the NFC tag.")
          );
        });
      } catch (e) {
        settle(
          err(
            "NFC_SCAN_FAILED",
            `NDEFReader.scan() failed: ${e instanceof Error ? e.message : String(e)}`
          )
        );
      }
    })();
  });
}

// ─── NDEF write ────────────────────────────────────────────────────────────────

/**
 * Write a text payload to an NFC tag.
 * Used during the challenge phase of seal verification.
 *
 * @param text      — UTF-8 string to write
 * @param timeoutMs — abort after this many ms
 */
export async function writeNfcTag(
  text: string,
  timeoutMs = 3000
): Promise<Result<void>> {
  if (!isNfcSupported()) {
    return err("NFC_NOT_SUPPORTED", "Web NFC is not supported in this browser.");
  }

  return new Promise<Result<void>>((resolve) => {
    let settled = false;
    let abortController: AbortController | undefined;

    const settle = (result: Result<void>) => {
      if (settled) return;
      settled = true;
      abortController?.abort();
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      settle(err("NFC_WRITE_TIMEOUT", `Write timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    (async () => {
      try {
        // @ts-expect-error
        const writer = new window.NDEFReader() as NDEFReader;
        abortController = new AbortController();

        await writer.write({ records: [{ recordType: "text", data: text }] });
        settle(ok(undefined));
      } catch (e) {
        settle(
          err(
            "NFC_WRITE_FAILED",
            `NDEFReader.write() failed: ${e instanceof Error ? e.message : String(e)}`
          )
        );
      }
    })();
  });
}

// ─── NDEFReader type augments (partial, Chrome-specific) ─────────────────────
// The full Web NFC types are not yet in @types/web; define what we need.

interface NDEFRecord {
  recordType: string;
  mediaType?: string;
  encoding?: string;
  lang?: string;
  data?: DataView;
}

interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: { records: NDEFRecord[] };
}

interface NDEFReader extends EventTarget {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  write(message: unknown, options?: { signal?: AbortSignal }): Promise<void>;
  addEventListener(
    type: "reading",
    listener: (event: NDEFReadingEvent) => void
  ): void;
  addEventListener(type: "readingerror", listener: () => void): void;
}
