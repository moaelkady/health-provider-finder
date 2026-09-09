/**
 * Data-driven search, filtering, faceting and sorting.
 *
 * All logic is pure and operates on arrays of `Provider`, so it works the same
 * with 10 mock records or tens of thousands of real ones.
 */

import type { GeoPoint, Provider, ProviderFilters, SortKey } from "@/types/provider";
import { distanceKm } from "@/lib/geo";

/** Normalize Arabic/Latin text for tolerant search matching. */
export const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ً|ٌ|ٍ|َ|ُ|ِ|ّ|ْ|ٰ/g, "")
    .trim();

function searchableText(provider: Provider): string {
  return normalize(
    [
      provider.name,
      provider.type,
      provider.organization?.name ?? "",
      provider.location.address,
      provider.location.area,
      provider.location.governorate,
      ...provider.specialties.map((s) => s.name),
      ...provider.services.map((s) => s.name),
    ].join(" "),
  );
}

/** Cheap relevance score: name matches beat field matches. */
function relevanceScore(provider: Provider, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const name = normalize(provider.name);
  const haystack = searchableText(provider);
  let score = 0;
  for (const token of tokens) {
    if (name.startsWith(token)) score += 6;
    else if (name.includes(token)) score += 4;
    else if (haystack.includes(token)) score += 1;
  }
  if (provider.network === "الشبكة المفضلة") score += 0.5;
  return score;
}

function matchesTokens(provider: Provider, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = searchableText(provider);
  return tokens.every((token) => haystack.includes(token));
}

/** Attach distanceKm from a user location (does not mutate input). */
export function withDistances(providers: Provider[], origin: GeoPoint): Provider[] {
  return providers.map((provider) => {
    const coords = provider.location.coordinates;
    if (!coords) return provider;
    return {
      ...provider,
      location: {
        ...provider.location,
        distanceKm: Math.round(distanceKm(origin, coords) * 10) / 10,
      },
    };
  });
}

/**
 * When radiusKm is set, keep only providers within that distance that have
 * coordinates. `null` means no radius limit.
 */
export function filterByRadius(
  providers: Provider[],
  radiusKm: number | null,
): Provider[] {
  if (radiusKm == null) return providers;
  return providers.filter(
    (p) =>
      typeof p.location.distanceKm === "number" && p.location.distanceKm <= radiusKm,
  );
}

export function filterProviders(
  providers: Provider[],
  filters: ProviderFilters,
): Provider[] {
  const tokens = normalize(filters.query).split(/\s+/).filter(Boolean);

  return providers.filter((provider) => {
    if (!matchesTokens(provider, tokens)) return false;
    if (filters.types.length && !filters.types.includes(provider.type)) return false;
    if (filters.networks.length && !filters.networks.includes(provider.network)) return false;
    if (
      filters.governorates.length &&
      !filters.governorates.includes(provider.location.governorate)
    )
      return false;
    if (filters.areas.length && !filters.areas.includes(provider.location.area)) return false;
    if (
      filters.specialties.length &&
      !provider.specialties.some((s) => filters.specialties.includes(s.name))
    )
      return false;
    if (
      filters.services.length &&
      !provider.services.some((s) => filters.services.includes(s.name))
    )
      return false;
    return true;
  });
}

export function sortProviders(
  providers: Provider[],
  sort: SortKey,
  query: string,
): Provider[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  const list = [...providers];

  switch (sort) {
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    case "type":
      return list.sort(
        (a, b) => a.type.localeCompare(b.type, "ar") || a.name.localeCompare(b.name, "ar"),
      );
    case "distance":
      return list.sort((a, b) => {
        const da = a.location.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.location.distanceKm ?? Number.POSITIVE_INFINITY;
        return da - db || a.name.localeCompare(b.name, "ar");
      });
    case "relevance":
    default:
      return list.sort(
        (a, b) =>
          relevanceScore(b, tokens) - relevanceScore(a, tokens) ||
          a.name.localeCompare(b.name, "ar"),
      );
  }
}

export interface Facets {
  types: string[];
  specialties: string[];
  governorates: string[];
  areas: string[];
  networks: string[];
  services: string[];
}

type FacetFilterKey = Exclude<keyof ProviderFilters, "query">;

const collectFacet = (values: string[]) =>
  Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "ar"));

/**
 * Facet values from providers matching all active filters except the listed key
 * (so multi-select within a group still shows siblings; other groups narrow).
 */
export function buildFacets(providers: Provider[], filters: ProviderFilters): Facets {
  const matchingExcept = (omit: FacetFilterKey) =>
    filterProviders(providers, {
      ...filters,
      query: "",
      [omit]: [],
    });

  const forTypes = matchingExcept("types");
  const forSpecialties = matchingExcept("specialties");
  const forGovernorates = matchingExcept("governorates");
  const forAreas = matchingExcept("areas");
  const forNetworks = matchingExcept("networks");
  const forServices = matchingExcept("services");

  return {
    types: collectFacet(forTypes.map((p) => p.type)),
    specialties: collectFacet(forSpecialties.flatMap((p) => p.specialties.map((s) => s.name))),
    governorates: collectFacet(forGovernorates.map((p) => p.location.governorate)),
    areas: collectFacet(forAreas.map((p) => p.location.area)),
    networks: collectFacet(forNetworks.map((p) => p.network)),
    services: collectFacet(forServices.flatMap((p) => p.services.map((s) => s.name))),
  };
}

/** Drop selected facet values that are no longer available in the cascaded facets. */
export function pruneFiltersToFacets(
  filters: ProviderFilters,
  facets: Facets,
): ProviderFilters {
  const keep = <T extends string>(selected: T[], available: string[]): T[] => {
    const set = new Set(available);
    return selected.filter((v) => set.has(v));
  };

  return {
    ...filters,
    types: keep(filters.types, facets.types),
    specialties: keep(filters.specialties, facets.specialties),
    governorates: keep(filters.governorates, facets.governorates),
    areas: keep(filters.areas, facets.areas),
    networks: keep(filters.networks, facets.networks),
    services: keep(filters.services, facets.services),
  };
}

export function filtersNeedPrune(filters: ProviderFilters, facets: Facets): boolean {
  const pruned = pruneFiltersToFacets(filters, facets);
  return (
    pruned.types.length !== filters.types.length ||
    pruned.specialties.length !== filters.specialties.length ||
    pruned.governorates.length !== filters.governorates.length ||
    pruned.areas.length !== filters.areas.length ||
    pruned.networks.length !== filters.networks.length ||
    pruned.services.length !== filters.services.length
  );
}

export function countActiveFilters(filters: ProviderFilters): number {
  return (
    filters.types.length +
    filters.specialties.length +
    filters.governorates.length +
    filters.areas.length +
    filters.networks.length +
    filters.services.length
  );
}

/** Preferred quick-filter types (order = display order). Only shown if present in facets. */
export const QUICK_TYPE_PRIORITY = [
  "صيدليات",
  "مستشفيات",
  "معامل التحاليل",
  "مراكز الأسنان",
  "هيئة أطباء",
  "مجمع عيادات",
  "مراكز الأشعة",
  "مراكز علاج طبيعي",
  "مراكز البصريات",
] as const;
