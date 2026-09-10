/**
 * Hidden atlas access — discovery easter egg + Maps key / theme storage.
 * No Google Maps imports (keeps the main app bundle clean).
 */

/** Mask phone field once this prefix is typed. */
export const ATLAS_EASTER_PREFIX = "01154173329-mo";

/** Full secret — unlocks /atlas on live typing (no submit). */
export const ATLAS_EASTER_SECRET = "01154173329-mo-01154173329";

const MAPS_KEY_STORAGE = "hpd.atlas.mapsKey.v1";
const MAP_THEME_STORAGE = "hpd.atlas.mapTheme.v1";

const THEME_IDS = ["night", "day", "streets", "buildings", "hybrid", "terrain"] as const;
export type AtlasStoredThemeId = (typeof THEME_IDS)[number];

export function shouldMaskAtlasPhone(raw: string): boolean {
  return raw.startsWith(ATLAS_EASTER_PREFIX);
}

export function isAtlasEasterSecret(raw: string): boolean {
  return raw.trim() === ATLAS_EASTER_SECRET;
}

/** True if the field looks like the easter path (don't save as SOS contact). */
export function isAtlasEasterAttempt(raw: string): boolean {
  return raw.trim().startsWith(ATLAS_EASTER_PREFIX);
}

export function getAtlasMapsKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(MAPS_KEY_STORAGE);
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export function setAtlasMapsKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAPS_KEY_STORAGE, key.trim());
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAtlasMapsKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MAPS_KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

export function getAtlasMapTheme(): AtlasStoredThemeId {
  if (typeof window === "undefined") return "night";
  try {
    const value = window.localStorage.getItem(MAP_THEME_STORAGE);
    if (value && (THEME_IDS as readonly string[]).includes(value)) {
      return value as AtlasStoredThemeId;
    }
  } catch {
    /* ignore */
  }
  return "night";
}

export function setAtlasMapTheme(theme: AtlasStoredThemeId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAP_THEME_STORAGE, theme);
  } catch {
    /* ignore */
  }
}
