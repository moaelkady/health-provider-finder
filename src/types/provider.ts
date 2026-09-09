/**
 * Domain types for the healthcare provider directory.
 *
 * Display values are Arabic-first. UI components only ever depend on these
 * types — never on the raw generated JSON module.
 */

/** Provider type is data-driven (source types vary widely). */
export type ProviderType = string;

export type NetworkTier = "ضمن الشبكة" | "الشبكة المفضلة" | "خارج الشبكة";

export type ProviderStatus = "نشط" | "قيد التفعيل" | "موقوف";

export interface Specialty {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
}

/**
 * Location precision drives the map behaviour:
 * - "exact"       -> open the coordinate directly in Google Maps
 * - "approximate" -> coordinate exists but is area-level, prefer a text search
 * - "unresolved"  -> no coordinate at all, always fall back to a text search
 */
export type LocationPrecision = "exact" | "approximate" | "unresolved";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ProviderLocation {
  address: string;
  area: string;
  governorate: string;
  precision: LocationPrecision;
  coordinates?: GeoPoint;
  /** Optional straight-line distance in km, when the user shares a location. */
  distanceKm?: number;
}

export interface Organization {
  id: string;
  name: string;
  /** Total number of locations this organization operates in the network. */
  locationCount?: number;
}

export interface ContactInfo {
  /** All known phone numbers (formatted for display), primary first. */
  phones: string[];
  email?: string;
  website?: string;
}

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  organization?: Organization;
  specialties: Specialty[];
  services: Service[];
  location: ProviderLocation;
  contact: ContactInfo;
  network: NetworkTier;
  status: ProviderStatus;
  /** Optional free-text note shown on the detail page. */
  notes?: string;
}

export type SortKey = "relevance" | "name" | "distance" | "type";

export interface ProviderFilters {
  query: string;
  types: ProviderType[];
  specialties: string[];
  governorates: string[];
  areas: string[];
  networks: NetworkTier[];
  services: string[];
}

export const emptyFilters: ProviderFilters = {
  query: "",
  types: [],
  specialties: [],
  governorates: [],
  areas: [],
  networks: [],
  services: [],
};
