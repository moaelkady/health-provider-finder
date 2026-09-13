/**
 * Manual coordinate corrections that survive Orient data rebuilds.
 * Applied in mapGeneratedLocation before precision/coords are derived.
 */
export interface LocationOverride {
  lat: number;
  lng: number;
  /** Prefer "geocoded" so the UI treats the pin as exact. */
  geocodingStatus?: "geocoded" | "approximate";
  formattedAddress?: string;
}

export const LOCATION_OVERRIDES: Record<string, LocationOverride> = {
  /** صيدليات العزبى — Terrace-A, El Shorouk (was wrongly pinned to Sky Plaza). */
  baaeebd46e29bd20: {
    lat: 30.151687,
    lng: 31.6268183,
    geocodingStatus: "geocoded",
    formattedAddress:
      "5J2G+MPG تراس مول, El Sadat Rd, El Shorouk, Cairo Governorate 4932002",
  },
};
