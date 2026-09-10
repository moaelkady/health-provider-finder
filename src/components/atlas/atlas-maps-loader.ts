import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let configuredKey: string | null = null;

/**
 * setOptions may only run once per page load (js-api-loader).
 * Strict Mode remounts must not call it again.
 */
export function ensureAtlasMapsOptions(apiKey: string): void {
  if (configuredKey === apiKey) return;
  if (configuredKey != null && configuredKey !== apiKey) {
    throw new Error("KEY_CHANGED");
  }
  setOptions({
    key: apiKey,
    v: "weekly",
    language: "ar",
    region: "EG",
  });
  configuredKey = apiKey;
}

export async function loadAtlasMapsLibrary() {
  return importLibrary("maps");
}
