import type { AtlasMapPoint } from "@/types/atlas";

export type AtlasLatLng = { lat: number; lng: number };

const EARTH_KM = 6371;

export function normalizeAtlasQuery(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

export function haversineKm(a: AtlasLatLng, b: AtlasLatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface AtlasFilterOptions {
  query: string;
  type: string | null;
  governorate: string | null;
  network: string | null;
  status: string | null;
  favoritesOnly: boolean;
  favoriteIds: Set<string>;
  userPosition: AtlasLatLng | null;
  radiusKm: number | null;
}

export function filterAtlasPoints(
  points: AtlasMapPoint[],
  options: AtlasFilterOptions,
): AtlasMapPoint[] {
  const q = normalizeAtlasQuery(options.query);
  return points.filter((point) => {
    if (options.type && point.type !== options.type) return false;
    if (options.governorate && point.governorate !== options.governorate) return false;
    if (options.network && point.network !== options.network) return false;
    if (options.status && point.status !== options.status) return false;
    if (options.favoritesOnly && !options.favoriteIds.has(point.id)) return false;
    if (q) {
      const hay = normalizeAtlasQuery(
        [point.name, point.area ?? "", point.governorate ?? "", point.type].join(" "),
      );
      if (!hay.includes(q)) return false;
    }
    if (options.radiusKm != null && options.userPosition) {
      const km = haversineKm(options.userPosition, { lat: point.lat, lng: point.lng });
      if (km > options.radiusKm) return false;
    }
    return true;
  });
}

export function sortAtlasPoints(
  points: AtlasMapPoint[],
  userPosition: AtlasLatLng | null,
): AtlasMapPoint[] {
  const copy = [...points];
  if (userPosition) {
    copy.sort(
      (a, b) =>
        haversineKm(userPosition, { lat: a.lat, lng: a.lng }) -
        haversineKm(userPosition, { lat: b.lat, lng: b.lng }),
    );
    return copy;
  }
  copy.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return copy;
}

/** Distinct facet values; with GPS, nearest-first (min distance of any point in that value). */
function distinctAtlasFacetValues(
  points: AtlasMapPoint[],
  getValue: (point: AtlasMapPoint) => string | null | undefined,
  userPosition: AtlasLatLng | null = null,
): string[] {
  const nearestKm = new Map<string, number>();
  for (const point of points) {
    const value = getValue(point)?.trim();
    if (!value) continue;
    const km = userPosition
      ? haversineKm(userPosition, { lat: point.lat, lng: point.lng })
      : Number.POSITIVE_INFINITY;
    const prev = nearestKm.get(value);
    if (prev == null || km < prev) nearestKm.set(value, km);
  }
  const values = [...nearestKm.keys()];
  if (userPosition) {
    values.sort(
      (a, b) =>
        (nearestKm.get(a) ?? 0) - (nearestKm.get(b) ?? 0) ||
        a.localeCompare(b, "ar"),
    );
  } else {
    values.sort((a, b) => a.localeCompare(b, "ar"));
  }
  return values;
}

export function distinctAtlasTypes(
  points: AtlasMapPoint[],
  userPosition: AtlasLatLng | null = null,
): string[] {
  return distinctAtlasFacetValues(points, (p) => p.type, userPosition);
}

export function distinctAtlasGovernorates(
  points: AtlasMapPoint[],
  userPosition: AtlasLatLng | null = null,
): string[] {
  return distinctAtlasFacetValues(points, (p) => p.governorate, userPosition);
}

export function distinctAtlasNetworks(
  points: AtlasMapPoint[],
  userPosition: AtlasLatLng | null = null,
): string[] {
  return distinctAtlasFacetValues(points, (p) => p.network, userPosition);
}

export function distinctAtlasStatuses(
  points: AtlasMapPoint[],
  userPosition: AtlasLatLng | null = null,
): string[] {
  return distinctAtlasFacetValues(points, (p) => p.status, userPosition);
}

/** Governorate of the nearest map point to the user, or null. */
export function nearestAtlasGovernorate(
  points: AtlasMapPoint[],
  userPosition: AtlasLatLng,
): string | null {
  let best: string | null = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const point of points) {
    const gov = point.governorate?.trim();
    if (!gov) continue;
    const km = haversineKm(userPosition, { lat: point.lat, lng: point.lng });
    if (km < bestKm) {
      bestKm = km;
      best = gov;
    }
  }
  return best;
}

export function atlasMapsCoordsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function atlasMapsDirectionsUrl(
  destination: AtlasLatLng,
  origin?: AtlasLatLng | null,
): string {
  const dest = `${destination.lat},${destination.lng}`;
  if (origin) {
    const o = `${origin.lat},${origin.lng}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(dest)}`;
  }
  return atlasMapsCoordsUrl(destination.lat, destination.lng);
}

/** Fit camera to points. No-op if empty (avoids world-zoom collapse). */
export function fitAtlasToPoints(
  map: google.maps.Map,
  points: AtlasMapPoint[],
  options?: { maxZoom?: number; padding?: number },
): void {
  if (points.length === 0) return;
  const maxZoom = options?.maxZoom ?? 15;
  const padding = options?.padding ?? 64;

  if (points.length === 1) {
    const p = points[0]!;
    map.panTo({ lat: p.lat, lng: p.lng });
    const z = map.getZoom() ?? 6;
    if (z < Math.min(maxZoom, 14)) map.setZoom(Math.min(maxZoom, 14));
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  for (const p of points) {
    bounds.extend({ lat: p.lat, lng: p.lng });
  }
  if (bounds.isEmpty()) return;
  map.fitBounds(bounds, padding);
  const listener = map.addListener("idle", () => {
    listener.remove();
    const z = map.getZoom();
    if (z != null && z > maxZoom) map.setZoom(maxZoom);
  });
}
