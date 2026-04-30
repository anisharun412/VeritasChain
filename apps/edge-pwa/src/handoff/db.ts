/**
 * db.ts — IndexedDB persistence for HandoffBundles
 *
 * Uses the `idb` library (typed wrapper over IndexedDB).
 * Works 100% offline — no network required.
 *
 * Schema:
 *   DB name: "veritaschain-edge"
 *   Version: 1
 *   Object store: "handoff-bundles"
 *     keyPath: "id"  (= shipmentId)
 *     indexes:
 *       - "storedAt"  (for chronological listing)
 *       - "synced"    (for filtering unsynced bundles)
 */

import { openDB, type IDBPDatabase } from "idb";
import {
  type HandoffBundle,
  type StoredBundle,
  type Result,
  ok,
  err,
} from "../types/physicalLayer";

// ─── DB schema types ──────────────────────────────────────────────────────────

interface EdgePwaDB {
  "handoff-bundles": {
    key: string;
    value: StoredBundle;
    indexes: {
      storedAt: string;
      synced: 0 | 1; // IDB doesn't index booleans; use 0/1
    };
  };
}

// ─── Singleton DB connection ──────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<EdgePwaDB>> | null = null;

function getDb(): Promise<IDBPDatabase<EdgePwaDB>> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB<EdgePwaDB>("veritaschain-edge", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("handoff-bundles")) {
        const store = db.createObjectStore("handoff-bundles", {
          keyPath: "id",
        });
        store.createIndex("storedAt", "storedAt", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
      }
    },
  });

  return dbPromise;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Persist a HandoffBundle to IndexedDB.
 *
 * @param bundle — the bundle to store
 * @returns Result<StoredBundle>
 */
export async function storeBundle(
  bundle: HandoffBundle
): Promise<Result<StoredBundle>> {
  try {
    const db = await getDb();
    const stored: StoredBundle = {
      id: bundle.shipmentId,
      bundle,
      storedAt: new Date().toISOString(),
      synced: false,
    };
    await db.put("handoff-bundles", stored);
    return ok(stored);
  } catch (e) {
    return err(
      "IDB_STORE_FAILED",
      `Failed to store bundle ${bundle.shipmentId}: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}

/**
 * Retrieve a StoredBundle by shipmentId.
 *
 * @returns Result<StoredBundle | null> — null if not found
 */
export async function getBundle(
  shipmentId: string
): Promise<Result<StoredBundle | null>> {
  try {
    const db = await getDb();
    const record = await db.get("handoff-bundles", shipmentId);
    return ok(record ?? null);
  } catch (e) {
    return err(
      "IDB_GET_FAILED",
      `Failed to retrieve bundle ${shipmentId}: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}

/**
 * List all stored bundles, ordered by storedAt descending.
 */
export async function listBundles(): Promise<Result<StoredBundle[]>> {
  try {
    const db = await getDb();
    const all = await db.getAllFromIndex(
      "handoff-bundles",
      "storedAt"
    );
    return ok(all.reverse()); // most recent first
  } catch (e) {
    return err(
      "IDB_LIST_FAILED",
      `Failed to list bundles: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/**
 * Return all bundles that have not yet been synced to the DWH.
 */
export async function listUnsyncedBundles(): Promise<Result<StoredBundle[]>> {
  try {
    const db = await getDb();
    const unsynced = await db.getAllFromIndex(
      "handoff-bundles",
      "synced",
      IDBKeyRange.only(0)
    );
    return ok(unsynced);
  } catch (e) {
    return err(
      "IDB_LIST_FAILED",
      `Failed to list unsynced bundles: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/**
 * Mark a bundle as synced.
 */
export async function markSynced(
  shipmentId: string
): Promise<Result<void>> {
  try {
    const db = await getDb();
    const tx = db.transaction("handoff-bundles", "readwrite");
    const record = await tx.store.get(shipmentId);
    if (!record) {
      return err("BUNDLE_NOT_FOUND", `Bundle ${shipmentId} not found in IDB.`);
    }
    record.synced = true;
    await tx.store.put(record);
    await tx.done;
    return ok(undefined);
  } catch (e) {
    return err(
      "IDB_UPDATE_FAILED",
      `Failed to mark bundle ${shipmentId} as synced: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}

/**
 * Delete a bundle from IndexedDB (e.g., after successful blockchain submission).
 */
export async function deleteBundle(
  shipmentId: string
): Promise<Result<void>> {
  try {
    const db = await getDb();
    await db.delete("handoff-bundles", shipmentId);
    return ok(undefined);
  } catch (e) {
    return err(
      "IDB_DELETE_FAILED",
      `Failed to delete bundle ${shipmentId}: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}

/**
 * Reset the DB singleton (for tests only).
 */
export function _resetDbForTest(): void {
  dbPromise = null;
}
