/**
 * Google Maps link building.
 *
 * Prefer address/text search — many stored coordinates are approximate or wrong.
 */

import type { Provider } from "@/types/provider";
import { mapsActionLabel as label, mapsSearchUrl } from "@/lib/contact-actions";

export function hasExactLocation(provider: Provider): boolean {
  return provider.location.precision === "exact" && !!provider.location.coordinates;
}

/** @deprecated Prefer mapsSearchUrl — kept as alias for call sites. */
export function mapsUrl(provider: Provider): string {
  return mapsSearchUrl(provider);
}

export function mapsActionLabel(_provider?: Provider): string {
  return label();
}
