/**
 * Google Maps link building.
 *
 * Text search uses Arabic-first name + area + governorate.
 * Coordinates are available as an alternate open path when present.
 */

import type { Provider } from "@/types/provider";
import {
  mapsActionLabel as label,
  mapsCoordsUrl,
  mapsSearchUrl,
} from "@/lib/contact-actions";

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

export { mapsCoordsUrl, mapsSearchUrl };
