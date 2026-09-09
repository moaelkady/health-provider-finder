import {
  EmptyState,
  ErrorState,
  DirectoryPreparingState,
} from "@/components/common/States";
import { FilterChips } from "@/components/providers/FilterChips";
import { FilterPanel } from "@/components/providers/FilterPanel";
import { ProviderList } from "@/components/providers/ProviderList";
import { SearchBar } from "@/components/providers/SearchBar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  getProvidersLoadPhase,
  providersQueryOptions,
  subscribeProvidersLoadPhase,
} from "@/data/provider-repository";
import { useFavorites } from "@/hooks/useFavorites";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { useUserLocation } from "@/hooks/useUserLocation";
import { cn } from "@/lib/utils";
import {
  buildDistanceMap,
  buildFacets,
  countActiveFilters,
  facetFiltersKey,
  filterByRadius,
  filterProviders,
  filtersNeedPrune,
  pruneFiltersToFacets,
  QUICK_TYPE_PRIORITY,
  sortProviders,
} from "@/lib/provider-search";
import {
  emptyFilters,
  type ProviderFilters,
  type SortKey,
} from "@/types/provider";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  BookmarkPlus,
  Filter,
  LocateFixed,
  Loader2,
  MapPinOff,
  RotateCcw,
  X,
} from "lucide-react";

const PENDING_SEARCH_KEY = "hpd.pendingSearch.v1";
const RADIUS_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: 5, label: "٥ كم" },
  { value: 10, label: "١٠ كم" },
  { value: 25, label: "٢٥ كم" },
  { value: null, label: "الكل" },
];

export function readPendingSearch(): ProviderFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_SEARCH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_SEARCH_KEY);
    return JSON.parse(raw) as ProviderFilters;
  } catch {
    return null;
  }
}

export function writePendingSearch(filters: ProviderFilters) {
  try {
    sessionStorage.setItem(PENDING_SEARCH_KEY, JSON.stringify(filters));
  } catch {
    /* ignore */
  }
}

type FacetKey = Exclude<keyof ProviderFilters, "query">;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function DirectoryPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery(providersQueryOptions);
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { saveSearch } = useSavedSearches();
  const {
    status: locationStatus,
    coords,
    errorMessage: locationError,
    isReady: locationReady,
    requestLocation,
    clearLocation,
  } = useUserLocation();

  const [filters, setFilters] = useState<ProviderFilters>(emptyFilters);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | null>(10);
  const [loadPhase, setLoadPhase] = useState(getProvidersLoadPhase);
  const [, startTransition] = useTransition();
  const debouncedQuery = useDebouncedValue(filters.query, 200);
  const deferredFilters = useDeferredValue(filters);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const deferredSort = useDeferredValue(sort);
  const deferredRadius = useDeferredValue(radiusKm);
  const filtersPending =
    deferredFilters !== filters ||
    deferredQuery !== debouncedQuery ||
    deferredSort !== sort ||
    deferredRadius !== radiusKm;

  useEffect(() => subscribeProvidersLoadPhase(setLoadPhase), []);

  useEffect(() => {
    const pending = readPendingSearch();
    if (pending) setFilters(pending);
  }, []);

  useEffect(() => {
    if (locationReady) setSort("distance");
  }, [locationReady]);

  const facetKey = facetFiltersKey(deferredFilters);
  const facets = useMemo(
    () => buildFacets(data ?? [], deferredFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- facetKey captures facet fields only
    [data, facetKey],
  );

  useEffect(() => {
    if (!data?.length) return;
    if (!filtersNeedPrune(filters, facets)) return;
    startTransition(() => {
      setFilters((prev) => pruneFiltersToFacets(prev, facets));
    });
  }, [data, facets, filters]);

  const quickTypes = useMemo(() => {
    const available = new Set(facets.types);
    return QUICK_TYPE_PRIORITY.filter((t) => available.has(t));
  }, [facets.types]);

  /** Top governorates for manual “my area” when GPS is blocked. */
  const quickGovernorates = useMemo(() => {
    if (!data) return [] as string[];
    const counts = new Map<string, number>();
    for (const p of data) {
      const g = p.location.governorate;
      if (!g || g === "—") continue;
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
  }, [data]);

  const locationNeedsHelp =
    locationStatus === "denied" ||
    locationStatus === "unavailable" ||
    locationStatus === "insecure";

  const distances = useMemo(() => {
    if (!data || !locationReady || !coords) return undefined;
    return buildDistanceMap(data, coords);
  }, [data, locationReady, coords]);

  const results = useMemo(() => {
    if (!data) return [];
    const withQuery = { ...deferredFilters, query: deferredQuery };
    let list = filterProviders(data, withQuery);
    if (distances) {
      list = filterByRadius(list, deferredRadius, distances);
    }
    return sortProviders(list, deferredSort, deferredQuery, distances);
  }, [
    data,
    deferredFilters,
    deferredQuery,
    deferredSort,
    deferredRadius,
    distances,
  ]);

  const activeFilterCount = countActiveFilters(filters);
  const nearbyActive = locationReady;

  const toggleFilter = (key: FacetKey, value: string) => {
    startTransition(() => {
      setFilters((prev) => {
        const list = prev[key] as string[];
        const next = list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value];
        return { ...prev, [key]: next };
      });
    });
  };

  const clearFilters = () => startTransition(() => setFilters(emptyFilters));

  const canSaveSearch = activeFilterCount > 0 || Boolean(filters.query.trim());

  const handleSaveSearch = () => {
    if (!canSaveSearch) return;
    const parts = [
      filters.query.trim() || null,
      ...filters.types.slice(0, 2),
      ...filters.governorates.slice(0, 1),
    ].filter(Boolean);
    const label = parts.length ? parts.join(" · ") : "بحث محفوظ";
    saveSearch(label, filters);
    toast.success("تم حفظ البحث", {
      description: "تجده في تبويب «عمليات البحث».",
    });
  };

  const handleClearLocation = () => {
    clearLocation();
    setRadiusKm(10);
    setSort("relevance");
  };

  if (isLoading || loadPhase === "loading" || loadPhase === "preparing") {
    return (
      <div className="space-y-4">
        <DirectoryHeader />
        <DirectoryPreparingState
          message={
            loadPhase === "preparing" ? "جاري تجهيز الدليل…" : "جاري تحميل الدليل…"
          }
        />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <DirectoryHeader />
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  const emptyNearby =
    nearbyActive &&
    results.length === 0 &&
    radiusKm != null &&
    !filters.query &&
    activeFilterCount === 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      <DirectoryHeader />

      {/* Sticky search cluster — stays under app header */}
      <div className="sticky top-14 z-20 -mx-4 space-y-3 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="flex gap-2">
          <SearchBar
            value={filters.query}
            onChange={(query) => setFilters((prev) => ({ ...prev, query }))}
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant={nearbyActive ? "default" : "outline"}
            className="h-12 shrink-0 gap-1.5 px-3"
            onClick={() => {
              if (nearbyActive) {
                handleClearLocation();
                return;
              }
              requestLocation();
            }}
            disabled={locationStatus === "requesting"}
            aria-pressed={nearbyActive}
            title={nearbyActive ? "إيقاف الموقع" : "قريب مني"}
          >
            {locationStatus === "requesting" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LocateFixed className="size-4" />
            )}
            <span className="text-xs sm:text-sm">
              {nearbyActive ? "مفعّل" : "قريب مني"}
            </span>
          </Button>
        </div>

        {(locationNeedsHelp || locationError) && (
          <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5">
            <p className="flex items-start gap-2 text-xs text-foreground">
              <MapPinOff className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <span>
                {locationError ??
                  (locationStatus === "denied"
                    ? "تم رفض إذن الموقع. يمكنك التصفية بالمحافظة والمنطقة يدوياً."
                    : "تعذر تحديد موقعك. جرّب مرة أخرى أو صفِّ حسب المحافظة.")}
              </span>
            </p>
            {locationStatus === "insecure" && (
              <p className="ps-5 text-[11px] leading-relaxed text-muted-foreground">
                شغّل{" "}
                <span className="font-semibold text-foreground" dir="ltr">
                  npm run dev:phone
                </span>
                ، افتح رابط{" "}
                <span className="font-semibold text-foreground" dir="ltr">
                  https://
                </span>{" "}
                Network من التيرمنال (ليس http)، واقبل تحذير الشهادة مرة واحدة، ثم اضغط «قريب
                مني».
              </p>
            )}
            {locationStatus !== "insecure" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => requestLocation()}
              >
                إعادة المحاولة
              </Button>
            )}
          </div>
        )}

        {locationNeedsHelp && quickGovernorates.length > 0 && !nearbyActive && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">أو اختر محافظتك</p>
            <div className="flex gap-2 overflow-x-auto pb-0.5 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {quickGovernorates.map((gov) => {
                const active = filters.governorates.includes(gov);
                return (
                  <button
                    key={gov}
                    type="button"
                    onClick={() => toggleFilter("governorates", gov)}
                    className={cn(
                      "shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:border-primary/40",
                    )}
                  >
                    {gov}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {nearbyActive && (
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">النطاق</span>
            {RADIUS_OPTIONS.map((opt) => {
              const active = radiusKm === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setRadiusKm(opt.value)}
                  className={cn(
                    "shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/40",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleClearLocation}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
              إيقاف الموقع
            </button>
          </div>
        )}

        {/* Quick type chips */}
        {quickTypes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickTypes.map((type) => {
              const active = filters.types.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleFilter("types", type)}
                  className={cn(
                    "shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/40",
                  )}
                >
                  {type}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-11 flex-1 sm:flex-none lg:hidden">
                <Filter className="size-4" />
                تصفية
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="flex h-[85dvh] flex-col rounded-t-2xl p-0 sm:max-h-[90dvh] lg:hidden"
            >
              <SheetTitle className="sr-only">التصفية</SheetTitle>
              <div className="min-h-0 flex-1 overflow-hidden">
                <FilterPanel
                  key={filtersOpen ? "sheet-open" : "sheet-closed"}
                  facets={facets}
                  filters={filters}
                  onToggle={toggleFilter}
                  onClear={clearFilters}
                  padForClose
                  userCoords={locationReady ? coords : null}
                  providers={data ?? []}
                />
              </div>
              <div className="space-y-2 border-t border-border p-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    disabled={!canSaveSearch}
                    onClick={handleSaveSearch}
                  >
                    <BookmarkPlus className="size-4" />
                    حفظ البحث
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    disabled={!canSaveSearch}
                    onClick={clearFilters}
                  >
                    <RotateCcw className="size-4" />
                    مسح الكل
                  </Button>
                </div>
                <Button className="h-11 w-full" onClick={() => setFiltersOpen(false)}>
                  عرض {results.length.toLocaleString("ar-EG")} نتيجة
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {canSaveSearch && (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0"
                onClick={handleSaveSearch}
              >
                <BookmarkPlus className="size-4" />
                حفظ
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0"
                onClick={clearFilters}
                aria-label="مسح التصفية"
              >
                <RotateCcw className="size-4" />
                <span className="hidden sm:inline">مسح</span>
              </Button>
            </>
          )}

          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-11 w-[8.5rem] shrink-0 sm:w-[10rem]">
              <SelectValue placeholder="ترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">الأكثر صلة</SelectItem>
              <SelectItem value="name">الاسم</SelectItem>
              <SelectItem value="distance" disabled={!nearbyActive}>
                المسافة
              </SelectItem>
              <SelectItem value="type">نوع مقدم الخدمة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">
          {nearbyActive && radiusKm != null ? (
            <>
              <span className="font-semibold text-foreground">
                {results.length.toLocaleString("ar-EG")}
              </span>{" "}
              قريب منك · ضمن {radiusKm.toLocaleString("ar-EG")} كم
            </>
          ) : nearbyActive ? (
            <>
              <span className="font-semibold text-foreground">
                {results.length.toLocaleString("ar-EG")}
              </span>{" "}
              قريب منك
            </>
          ) : (
            <>
              <span className="font-semibold text-foreground">
                {results.length.toLocaleString("ar-EG")}
              </span>{" "}
              مقدم خدمة
            </>
          )}
          {isFetching && !isLoading ? " · جاري التحديث…" : ""}
          {filtersPending ? " · جاري التصفية…" : ""}
        </p>
      </div>

      <FilterChips
        filters={filters}
        onRemove={toggleFilter}
        onClear={clearFilters}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-hidden rounded-xl border border-border bg-card lg:block">
          <FilterPanel
            facets={facets}
            filters={filters}
            onToggle={toggleFilter}
            onClear={clearFilters}
            userCoords={locationReady ? coords : null}
            providers={data ?? []}
          />
        </aside>

        <div>
          {results.length === 0 ? (
            emptyNearby ? (
              <EmptyState
                title="لا يوجد مقدمو خدمة ضمن هذا النطاق."
                description="وسّع نطاق البحث أو أوقف الموقع لتصفح الدليل بالكامل."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setRadiusKm((r) => (r == null ? null : r === 5 ? 10 : r === 10 ? 25 : null))
                      }
                    >
                      توسيع النطاق
                    </Button>
                    <Button variant="outline" onClick={handleClearLocation}>
                      مسح الموقع
                    </Button>
                  </div>
                }
              />
            ) : (
              <EmptyState
                title="لم نعثر على أي مقدمي خدمة مطابقة لبحثك."
                description="جرّب اسماً أو تخصصاً أو منطقة مختلفة، أو امسح عوامل التصفية لتصفح الشبكة بالكامل."
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    مسح التصفية
                  </Button>
                }
              />
            )
          ) : (
            <ProviderList
              providers={results}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              distances={distances}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DirectoryHeader() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        دليل مقدمي الخدمة
      </h1>
      <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
        ابحث عن أقرب مستشفى أو عيادة أو صيدلية ضمن شبكتك.
      </p>
    </div>
  );
}
