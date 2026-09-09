/**
 * Single data-access point for the directory.
 *
 * Load order:
 * 1. In-memory module cache
 * 2. IndexedDB (same content hash) → paint immediately
 * 3. Web Worker fetch + parse + index (main-thread fallback if no Worker)
 *
 * Prefers slim `/data/generated/providers.min.json` when present.
 */

import {
  prepareProvidersFromJson,
  type PrepareSource,
} from "@/data/prepare-providers";
import {
  fetchDataHash,
  readProvidersCache,
  writeProvidersCache,
} from "@/data/providers-idb";
import type { Provider } from "@/types/provider";
import type {
  PrepareWorkerRequest,
  PrepareWorkerResponse,
} from "@/workers/providers-prepare.worker";

const SLIM_URL = "/data/generated/providers.min.json";
const LOCATIONS_URL = "/data/generated/locations.json";

let cache: Provider[] | null = null;
let inflight: Promise<Provider[]> | null = null;
let dataHash: string | null = null;

export type ProvidersLoadPhase = "idle" | "loading" | "preparing" | "ready";

type PhaseListener = (phase: ProvidersLoadPhase) => void;
const phaseListeners = new Set<PhaseListener>();
let phase: ProvidersLoadPhase = "idle";

function setPhase(next: ProvidersLoadPhase) {
  if (phase === next) return;
  phase = next;
  phaseListeners.forEach((listener) => listener(next));
}

export function getProvidersLoadPhase(): ProvidersLoadPhase {
  return phase;
}

export function subscribeProvidersLoadPhase(listener: PhaseListener): () => void {
  phaseListeners.add(listener);
  listener(phase);
  return () => {
    phaseListeners.delete(listener);
  };
}

function runInWorker(request: PrepareWorkerRequest): Promise<Provider[]> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(
        new URL("../workers/providers-prepare.worker.ts", import.meta.url),
        { type: "module" },
      );
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Worker unavailable"));
      return;
    }

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("Provider prepare timed out"));
    }, 120_000);

    worker.onmessage = (event: MessageEvent<PrepareWorkerResponse>) => {
      clearTimeout(timeout);
      worker.terminate();
      const msg = event.data;
      if (msg.type === "ready") resolve(msg.providers);
      else reject(new Error(msg.message));
    };

    worker.onerror = (error) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(error.error ?? new Error("Worker failed"));
    };

    worker.postMessage(request);
  });
}

async function preparePayload(
  text: string,
  source: PrepareSource,
  options: { updatePhase: boolean },
): Promise<Provider[]> {
  if (options.updatePhase) setPhase("preparing");

  const canUseWorker =
    typeof window !== "undefined" && typeof Worker !== "undefined";

  if (canUseWorker) {
    try {
      return await runInWorker({ type: "prepare-text", text, source });
    } catch (error) {
      console.warn("[providers] worker prepare failed — using main thread", error);
    }
  }

  return prepareProvidersFromJson(text, source);
}

async function fetchProviderText(): Promise<{ text: string; source: PrepareSource }> {
  const slim = await fetch(SLIM_URL);
  if (slim.ok) {
    return { text: await slim.text(), source: "slim" };
  }
  const locations = await fetch(LOCATIONS_URL);
  if (!locations.ok) {
    throw new Error(`Failed to load providers (${locations.status})`);
  }
  return { text: await locations.text(), source: "locations" };
}

async function loadFromNetwork(options: { updatePhase: boolean }): Promise<Provider[]> {
  if (options.updatePhase) setPhase("loading");
  const { text, source } = await fetchProviderText();
  return preparePayload(text, source, options);
}

async function revalidateInBackground(hash: string) {
  try {
    const providers = await loadFromNetwork({ updatePhase: false });
    cache = providers;
    void writeProvidersCache(hash, providers);
  } catch (error) {
    console.warn("[providers] background revalidate failed", error);
  }
}

async function loadProviders(): Promise<Provider[]> {
  setPhase("loading");

  const hash =
    typeof window !== "undefined" ? await fetchDataHash() : "ssr";
  dataHash = hash;

  if (typeof window !== "undefined") {
    const cached = await readProvidersCache();
    if (cached && cached.hash === hash && cached.providers.length > 0) {
      cache = cached.providers;
      setPhase("ready");
      void revalidateInBackground(hash);
      return cached.providers;
    }
  }

  const providers = await loadFromNetwork({ updatePhase: true });
  cache = providers;
  setPhase("ready");
  if (typeof window !== "undefined") {
    void writeProvidersCache(hash, providers);
  }
  return providers;
}

export async function getProviders(): Promise<Provider[]> {
  if (cache) {
    setPhase("ready");
    return cache;
  }
  if (!inflight) {
    inflight = loadProviders()
      .catch((error) => {
        setPhase("idle");
        throw error;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export async function getProviderById(id: string): Promise<Provider | undefined> {
  const providers = await getProviders();
  return providers.find((p) => p.id === id);
}

/** Clear in-memory cache (useful after mapper changes in dev). */
export function clearProvidersCache() {
  cache = null;
  inflight = null;
  dataHash = null;
  setPhase("idle");
}

export function getCachedDataHash(): string | null {
  return dataHash;
}

export const providersQueryOptions = {
  queryKey: ["providers"] as const,
  queryFn: getProviders,
  staleTime: 5 * 60 * 1000,
  gcTime: Infinity,
  networkMode: "offlineFirst" as const,
};
