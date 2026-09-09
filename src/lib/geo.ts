import type { GeoPoint } from "@/types/provider";

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Straight-line distance in kilometers (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000).toLocaleString("ar-EG")} م`;
  }
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return `${rounded.toLocaleString("ar-EG")} كم`;
}
