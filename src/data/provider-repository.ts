/**
 * Single data-access point for the directory.
 *
 * Loads generated locations from
 * `/data/generated/locations.json`, maps them to `Provider`, and caches the
 * result in memory. Swap only this module if the data source changes.
 */

import { mapGeneratedLocation, type GeneratedLocation } from "./map-generated-location";
import type { Provider } from "@/types/provider";

const DATA_URL = "/data/generated/locations.json";

let cache: Provider[] | null = null;
let inflight: Promise<Provider[]> | null = null;

async function loadProviders(): Promise<Provider[]> {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`Failed to load providers (${response.status})`);
  }
  const rows = (await response.json()) as GeneratedLocation[];
  return rows.map(mapGeneratedLocation);
}

export async function getProviders(): Promise<Provider[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = loadProviders()
      .then((providers) => {
        cache = providers;
        return providers;
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
}

export const providersQueryOptions = {
  queryKey: ["providers"] as const,
  queryFn: getProviders,
  staleTime: 5 * 60 * 1000,
};
