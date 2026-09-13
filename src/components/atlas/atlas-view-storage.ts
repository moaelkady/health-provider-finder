/** Persist atlas filters + camera — no Google Maps imports. */

export type AtlasRadiusKm = 5 | 10 | 25;

export interface AtlasCameraState {
  center: { lat: number; lng: number };
  zoom: number;
}

export interface AtlasFilterState {
  type: string | null;
  governorate: string | null;
  network: string | null;
  radiusKm: AtlasRadiusKm | null;
  favoritesOnly: boolean;
  query: string;
}

const CAMERA_STORAGE = "hpd.atlas.camera.v1";
const FILTER_STORAGE = "hpd.atlas.filters.v1";
/** Legacy combined key — cleared on read so corrupt zoom does not return. */
const LEGACY_VIEW_STORAGE = "hpd.atlas.view.v1";

const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 6;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)));
}

function isValidCenter(center: unknown): center is { lat: number; lng: number } {
  if (!center || typeof center !== "object") return false;
  const c = center as { lat?: unknown; lng?: unknown };
  return (
    typeof c.lat === "number" &&
    typeof c.lng === "number" &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    c.lat >= -90 &&
    c.lat <= 90 &&
    c.lng >= -180 &&
    c.lng <= 180
  );
}

function clearLegacyView(): void {
  try {
    window.localStorage.removeItem(LEGACY_VIEW_STORAGE);
  } catch {
    /* ignore */
  }
}

export function getAtlasCameraState(): AtlasCameraState | null {
  if (typeof window === "undefined") return null;
  clearLegacyView();
  try {
    const raw = window.localStorage.getItem(CAMERA_STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AtlasCameraState>;
    if (!isValidCenter(parsed.center)) return null;
    const zoom = clampZoom(typeof parsed.zoom === "number" ? parsed.zoom : 6);
    return { center: parsed.center, zoom };
  } catch {
    return null;
  }
}

export function setAtlasCameraState(state: AtlasCameraState): void {
  if (typeof window === "undefined") return;
  if (!isValidCenter(state.center)) return;
  const zoom = clampZoom(state.zoom);
  if (zoom < MIN_ZOOM || zoom > MAX_ZOOM) return;
  try {
    window.localStorage.setItem(
      CAMERA_STORAGE,
      JSON.stringify({ center: state.center, zoom }),
    );
  } catch {
    /* ignore */
  }
}

export function getAtlasFilterState(): Partial<AtlasFilterState> | null {
  if (typeof window === "undefined") return null;
  clearLegacyView();
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<AtlasFilterState>;
  } catch {
    return null;
  }
}

export function setAtlasFilterState(state: AtlasFilterState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FILTER_STORAGE, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function zoomForRadiusKm(radiusKm: AtlasRadiusKm): number {
  if (radiusKm <= 5) return 14;
  if (radiusKm <= 10) return 13;
  return 12;
}
