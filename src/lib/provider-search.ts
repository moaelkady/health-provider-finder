/**
 * Data-driven search, filtering, faceting and sorting.
 *
 * Prefers precomputed `searchBlob` / `nameNorm` on each Provider (attached at
 * prepare time). Falls back to on-the-fly normalize only if missing.
 */

import { normalize } from "@/lib/normalize-text";
import { distanceKm } from "@/lib/geo";
import type { GeoPoint, Provider, ProviderFilters, SortKey } from "@/types/provider";

export { normalize };

function nameNormOf(provider: Provider): string {
  return provider.nameNorm ?? normalize(provider.name);
}

function searchBlobOf(provider: Provider): string {
  if (provider.searchBlob) return provider.searchBlob;
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
  const name = nameNormOf(provider);
  const haystack = searchBlobOf(provider);
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
  const haystack = searchBlobOf(provider);
  return tokens.every((token) => haystack.includes(token));
}

/** Build id → distanceKm without cloning providers. */
export function buildDistanceMap(
  providers: Provider[],
  origin: GeoPoint,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const provider of providers) {
    const coords = provider.location.coordinates;
    if (!coords) continue;
    map.set(provider.id, Math.round(distanceKm(origin, coords) * 10) / 10);
  }
  return map;
}

/**
 * @deprecated Prefer buildDistanceMap + filterByRadius with distances.
 * Kept for callers that still need attached distanceKm on the object.
 */
export function withDistances(providers: Provider[], origin: GeoPoint): Provider[] {
  const distances = buildDistanceMap(providers, origin);
  return providers.map((provider) => {
    const d = distances.get(provider.id);
    if (d === undefined) return provider;
    return {
      ...provider,
      location: {
        ...provider.location,
        distanceKm: d,
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
  distances?: Map<string, number>,
): Provider[] {
  if (radiusKm == null) return providers;
  return providers.filter((p) => {
    const d = distances?.get(p.id) ?? p.location.distanceKm;
    return typeof d === "number" && d <= radiusKm;
  });
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
  distances?: Map<string, number>,
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
        const da =
          distances?.get(a.id) ?? a.location.distanceKm ?? Number.POSITIVE_INFINITY;
        const db =
          distances?.get(b.id) ?? b.location.distanceKm ?? Number.POSITIVE_INFINITY;
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

const FACET_KEYS: FacetFilterKey[] = [
  "types",
  "specialties",
  "governorates",
  "areas",
  "networks",
  "services",
];

const collectFacet = (values: Iterable<string>) =>
  Array.from(new Set(Array.from(values).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ar"),
  );

function matchesFacetFilters(
  provider: Provider,
  filters: ProviderFilters,
  omit: FacetFilterKey | null,
): boolean {
  if (omit !== "types" && filters.types.length && !filters.types.includes(provider.type)) {
    return false;
  }
  if (
    omit !== "networks" &&
    filters.networks.length &&
    !filters.networks.includes(provider.network)
  ) {
    return false;
  }
  if (
    omit !== "governorates" &&
    filters.governorates.length &&
    !filters.governorates.includes(provider.location.governorate)
  ) {
    return false;
  }
  if (
    omit !== "areas" &&
    filters.areas.length &&
    !filters.areas.includes(provider.location.area)
  ) {
    return false;
  }
  if (
    omit !== "specialties" &&
    filters.specialties.length &&
    !provider.specialties.some((s) => filters.specialties.includes(s.name))
  ) {
    return false;
  }
  if (
    omit !== "services" &&
    filters.services.length &&
    !provider.services.some((s) => filters.services.includes(s.name))
  ) {
    return false;
  }
  return true;
}

/**
 * Facet values from providers matching all active filters except each listed key
 * (so multi-select within a group still shows siblings; other groups narrow).
 *
 * Single pass over providers collects all six facet sets (ignores query).
 */
export function buildFacets(providers: Provider[], filters: ProviderFilters): Facets {
  const buckets: Record<FacetFilterKey, Set<string>> = {
    types: new Set(),
    specialties: new Set(),
    governorates: new Set(),
    areas: new Set(),
    networks: new Set(),
    services: new Set(),
  };

  for (const provider of providers) {
    for (const key of FACET_KEYS) {
      if (!matchesFacetFilters(provider, filters, key)) continue;
      switch (key) {
        case "types":
          if (provider.type) buckets.types.add(provider.type);
          break;
        case "networks":
          buckets.networks.add(provider.network);
          break;
        case "governorates":
          if (provider.location.governorate) {
            buckets.governorates.add(provider.location.governorate);
          }
          break;
        case "areas":
          if (provider.location.area) buckets.areas.add(provider.location.area);
          break;
        case "specialties":
          for (const s of provider.specialties) buckets.specialties.add(s.name);
          break;
        case "services":
          for (const s of provider.services) buckets.services.add(s.name);
          break;
      }
    }
  }

  return {
    types: collectFacet(buckets.types),
    specialties: collectFacet(buckets.specialties),
    governorates: collectFacet(buckets.governorates),
    areas: collectFacet(buckets.areas),
    networks: collectFacet(buckets.networks),
    services: collectFacet(buckets.services),
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

/** Stable facet-only signature so query keystrokes don't rebuild facets. */
export function facetFiltersKey(filters: ProviderFilters): string {
  return JSON.stringify({
    types: filters.types,
    specialties: filters.specialties,
    governorates: filters.governorates,
    areas: filters.areas,
    networks: filters.networks,
    services: filters.services,
  });
}
