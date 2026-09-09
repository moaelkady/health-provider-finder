/**
 * IndexedDB cache for prepared providers (repeat visits paint instantly).
 */

import type { Provider } from "@/types/provider";

const DB_NAME = "hpd-providers-v1";
const STORE = "cache";
const RECORD_KEY = "providers";

export type ProvidersCacheRecord = {
  hash: string;
  providers: Provider[];
  savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error ?? new Error("IDB open failed"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function readProvidersCache(): Promise<ProvidersCacheRecord | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(RECORD_KEY);
      req.onerror = () => reject(req.error ?? new Error("IDB read failed"));
      req.onsuccess = () => {
        resolve((req.result as ProvidersCacheRecord | undefined) ?? null);
      };
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function writeProvidersCache(
  hash: string,
  providers: Provider[],
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    const record: ProvidersCacheRecord = {
      hash,
      providers,
      savedAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).put(record, RECORD_KEY);
      req.onerror = () => {
        const err = req.error;
        if (err && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
          console.warn("[providers-idb] quota exceeded — skipping persist");
          resolve();
          return;
        }
        reject(err ?? new Error("IDB write failed"));
      };
      req.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn("[providers-idb] persist failed", error);
  }
}

export async function clearProvidersCache(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).delete(RECORD_KEY);
      req.onerror = () => reject(req.error ?? new Error("IDB delete failed"));
      req.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch {
    /* ignore */
  }
}

/** Resolve current data hash from meta.json (falls back to "unknown"). */
export async function fetchDataHash(): Promise<string> {
  try {
    const response = await fetch("/data/generated/meta.json", { cache: "no-cache" });
    if (!response.ok) return "unknown";
    const meta = (await response.json()) as { sourceContentHash?: string };
    return meta.sourceContentHash ?? "unknown";
  } catch {
    return "unknown";
  }
}
