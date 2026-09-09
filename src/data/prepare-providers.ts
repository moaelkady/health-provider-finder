/**
 * Prepare providers for search: map raw locations (if needed) + attach search index.
 * Used by the Web Worker and the main-thread fallback.
 */

import { mapGeneratedLocation, type GeneratedLocation } from "@/data/map-generated-location";
import { indexProviders } from "@/data/search-index";
import type { Provider } from "@/types/provider";

export type PrepareSource = "slim" | "locations";

export function prepareProvidersFromJson(
  text: string,
  source: PrepareSource,
): Provider[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Provider data must be a JSON array");
  }

  if (source === "slim") {
    return indexProviders(parsed as Provider[]);
  }

  return indexProviders(
    (parsed as GeneratedLocation[]).map((row) => mapGeneratedLocation(row)),
  );
}
