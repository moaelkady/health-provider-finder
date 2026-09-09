import { X } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { distanceKm } from "@/lib/geo";
import type { Facets } from "@/lib/provider-search";
import { normalize } from "@/lib/provider-search";
import type { GeoPoint, Provider, ProviderFilters } from "@/types/provider";
import { cn } from "@/lib/utils";

type FacetKey = Exclude<keyof ProviderFilters, "query">;

const FOCUS_SUGGESTION_LIMIT = 12;

/** Ordered for fastest mobile filtering. */
const GROUPS: { key: FacetKey; label: string; facet: keyof Facets }[] = [
  { key: "governorates", label: "المحافظة", facet: "governorates" },
  { key: "types", label: "نوع مقدم الخدمة", facet: "types" },
  { key: "networks", label: "الشبكة", facet: "networks" },
  { key: "specialties", label: "التخصص", facet: "specialties" },
  { key: "areas", label: "المنطقة / المدينة", facet: "areas" },
  { key: "services", label: "الخدمات", facet: "services" },
];

const emptyQueries = (): Record<FacetKey, string> => ({
  types: "",
  specialties: "",
  governorates: "",
  areas: "",
  networks: "",
  services: "",
});

/** Rank facet keys by nearest provider that carries that value. */
function rankKeysByProximity(
  providers: Provider[],
  coords: GeoPoint,
  getKey: (p: Provider) => string,
): string[] {
  const best = new Map<string, number>();
  for (const provider of providers) {
    const key = getKey(provider);
    const point = provider.location.coordinates;
    if (!key || !point) continue;
    const d = distanceKm(coords, point);
    const prev = best.get(key);
    if (prev == null || d < prev) best.set(key, d);
  }
  return [...best.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "ar"))
    .map(([key]) => key);
}

function pickSuggestions(
  values: string[],
  selected: string[],
  query: string,
  focused: boolean,
  proximityOrder: string[] | null,
): string[] {
  const available = values.filter((v) => !selected.includes(v));
  const token = normalize(query);

  if (token) {
    return available.filter((v) => normalize(v).includes(token));
  }

  if (!focused) return [];

  if (proximityOrder?.length) {
    const allowed = new Set(available);
    const nearby = proximityOrder.filter((v) => allowed.has(v));
    const rest = available.filter((v) => !nearby.includes(v));
    return [...nearby, ...rest].slice(0, FOCUS_SUGGESTION_LIMIT);
  }

  return available.slice(0, FOCUS_SUGGESTION_LIMIT);
}

interface Props {
  facets: Facets;
  filters: ProviderFilters;
  onToggle: (key: FacetKey, value: string) => void;
  onClear: () => void;
  /** Extra end padding when a sheet close button sits over the header. */
  padForClose?: boolean;
  /** When set, area/governorate focus suggestions prioritize nearby places. */
  userCoords?: GeoPoint | null;
  providers?: Provider[];
}

export function FilterPanel({
  facets,
  filters,
  onToggle,
  onClear,
  padForClose = false,
  userCoords = null,
  providers = [],
}: Props) {
  const [queries, setQueries] = useState(emptyQueries);
  const [focusedKey, setFocusedKey] = useState<FacetKey | null>(null);
  const selectedGovernorates = filters.governorates;

  const nearbyGovernorates = useMemo(() => {
    if (!userCoords || !providers.length) return null;
    return rankKeysByProximity(
      providers,
      userCoords,
      (p) => p.location.governorate,
    );
  }, [userCoords, providers]);

  const nearbyAreas = useMemo(() => {
    if (!userCoords || !providers.length) return null;
    return rankKeysByProximity(providers, userCoords, (p) => p.location.area);
  }, [userCoords, providers]);

  const handleClear = () => {
    setQueries(emptyQueries());
    setFocusedKey(null);
    onClear();
  };

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-border px-4 py-3",
          padForClose && "pe-12",
        )}
      >
        <h2 className="text-sm font-semibold text-foreground">التصفية</h2>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          مسح الكل
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            اضغط على حقل لعرض اقتراحات، أو اكتب للبحث.
            {userCoords ? " مع تفعيل الموقع تُعرض الأماكن الأقرب أولاً." : ""}
          </p>

          {GROUPS.map((group) => {
            const values = facets[group.facet];
            const selected = filters[group.key] as string[];
            if (!values.length && !selected.length) return null;

            const query = queries[group.key];
            const token = normalize(query);
            const focused = focusedKey === group.key;
            const proximityOrder =
              group.key === "areas"
                ? nearbyAreas
                : group.key === "governorates"
                  ? nearbyGovernorates
                  : null;

            const matches = pickSuggestions(
              values,
              selected,
              query,
              focused,
              proximityOrder,
            );
            const showList = focused;
            const searchEmpty = showList && matches.length === 0;
            const showAreasHint =
              group.key === "areas" &&
              !selectedGovernorates.length &&
              focused;

            return (
              <fieldset key={group.key} className="space-y-1.5">
                <legend className="text-xs font-semibold tracking-wide text-muted-foreground">
                  {group.label}
                  {userCoords &&
                    (group.key === "areas" || group.key === "governorates") &&
                    focused &&
                    !token && (
                      <span className="ms-1 font-normal text-primary">· الأقرب إليك</span>
                    )}
                </legend>
                <Input
                  value={query}
                  onChange={(e) =>
                    setQueries((prev) => ({ ...prev, [group.key]: e.target.value }))
                  }
                  onFocus={() => setFocusedKey(group.key)}
                  onBlur={() =>
                    setFocusedKey((current) => (current === group.key ? null : current))
                  }
                  placeholder={`ابحث في ${group.label}…`}
                  className="h-9"
                  aria-label={`ابحث في ${group.label}`}
                  autoComplete="off"
                />

                {showAreasHint && (
                  <p className="text-[11px] text-muted-foreground">
                    اختر محافظة أولاً لتضييق قائمة المناطق.
                  </p>
                )}

                {selected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {selected.map((value) => (
                      <button
                        key={`${group.key}-chip-${value}`}
                        type="button"
                        onClick={() => onToggle(group.key, value)}
                        className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                      >
                        <span className="truncate">{value}</span>
                        <X className="size-3 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {showList &&
                  (searchEmpty ? (
                    <p className="py-1 text-xs text-muted-foreground">لا نتائج</p>
                  ) : (
                    <div
                      className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-1.5"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {matches.map((value) => (
                        <button
                          key={`${group.key}-${value}`}
                          type="button"
                          onClick={() => onToggle(group.key, value)}
                          className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-start text-sm text-foreground hover:bg-muted/60"
                        >
                          <span
                            className="grid h-4 w-4 shrink-0 place-content-center rounded-sm border border-primary shadow"
                            aria-hidden
                          />
                          <span className="min-w-0 truncate">{value}</span>
                        </button>
                      ))}
                    </div>
                  ))}
              </fieldset>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
