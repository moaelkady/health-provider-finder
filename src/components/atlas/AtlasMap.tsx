import { MarkerClusterer, defaultOnClusterClickHandler } from "@googlemaps/markerclusterer";
import { Link } from "@tanstack/react-router";
import {
  Filter,
  Heart,
  List,
  LocateFixed,
  Lock,
  MapPinned,
  MoreVertical,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  distinctAtlasGovernorates,
  distinctAtlasNetworks,
  distinctAtlasStatuses,
  distinctAtlasTypes,
  filterAtlasPoints,
  fitAtlasToPoints,
  haversineKm,
  nearestAtlasGovernorate,
  sortAtlasPoints,
  type AtlasLatLng,
} from "@/components/atlas/atlas-geo";
import {
  applyAtlasTheme,
  ATLAS_THEMES,
  type AtlasThemeId,
} from "@/components/atlas/atlas-map-styles";
import {
  ensureAtlasMapsOptions,
  loadAtlasMapsLibrary,
} from "@/components/atlas/atlas-maps-loader";
import { AtlasPinSheet } from "@/components/atlas/AtlasPinSheet";
import {
  getAtlasCameraState,
  getAtlasFilterState,
  setAtlasCameraState,
  setAtlasFilterState,
  zoomForRadiusKm,
  type AtlasRadiusKm,
} from "@/components/atlas/atlas-view-storage";
import { attachPalestineLabel } from "@/components/atlas/palestine-label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFavorites } from "@/hooks/useFavorites";
import {
  getAtlasMapTheme,
  setAtlasMapTheme,
  type AtlasStoredThemeId,
} from "@/lib/atlas-access";
import { cn } from "@/lib/utils";
import type { AtlasMapPoint } from "@/types/atlas";

const POINTS_URL = "/data/generated/map-points.min.json";
const EGYPT_CENTER = { lat: 26.8, lng: 30.8 };
const EGYPT_ZOOM = 6;
const LIST_CAP = 50;
const CLUSTER_LIST_MAX = 50;
const FIT_WHEN_AT_MOST = 200;
const RADIUS_OPTIONS: AtlasRadiusKm[] = [5, 10, 25];
const RADIUS_NEED_GPS = "فعّل «موقعي» ثم اختر ٥ / ١٠ / ٢٥ كم";
const RADIUS_EMPTY_NEED_GPS = "نطاق القرب يحتاج موقعك — اضغط «موقعي»";
const EMPTY_FILTERS = "لا نتائج ضمن التصفية الحالية";

type GmWindow = Window & { gm_authFailure?: () => void };

interface Props {
  apiKey: string;
  onLock: () => void;
  initialId?: string | undefined;
  initialQuery?: string | undefined;
}

/**
 * Imperative Google Map + MarkerClusterer — clusterer owns all pin markers.
 */
export default function AtlasMap({ apiKey, onLock, initialId, initialQuery }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersByIdRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const markerToIdRef = useRef<Map<google.maps.Marker, string>>(new Map());
  const pointsByIdRef = useRef<Map<string, AtlasMapPoint>>(new Map());
  const pointsRef = useRef<AtlasMapPoint[]>([]);
  const userPositionRef = useRef<AtlasLatLng | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const userCircleRef = useRef<google.maps.Circle | null>(null);
  const radiusCircleRef = useRef<google.maps.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const didCenterOnUserRef = useRef(false);
  const didApplyDeepLinkRef = useRef(false);
  const mapReadyForPersistRef = useRef(false);
  const skipNextFitRef = useRef(true);
  const prevFilterKeyRef = useRef("");
  const emptyToastAtRef = useRef(0);

  const savedCamera = useMemo(() => getAtlasCameraState(), []);
  const savedFilters = useMemo(() => getAtlasFilterState(), []);
  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites();

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<AtlasThemeId>(() => getAtlasMapTheme());
  const [locating, setLocating] = useState(false);
  const [following, setFollowing] = useState(false);
  const [userPosition, setUserPosition] = useState<AtlasLatLng | null>(null);

  const [query, setQuery] = useState(() => initialQuery ?? savedFilters?.query ?? "");
  const [draftQuery, setDraftQuery] = useState(() => initialQuery ?? savedFilters?.query ?? "");
  const [typeFilter, setTypeFilter] = useState<string | null>(() => savedFilters?.type ?? null);
  const [governorateFilter, setGovernorateFilter] = useState<string | null>(
    () => savedFilters?.governorate ?? null,
  );
  const [networkFilter, setNetworkFilter] = useState<string | null>(
    () => savedFilters?.network ?? null,
  );
  const [statusFilter, setStatusFilter] = useState<string | null>(
    () => savedFilters?.status ?? null,
  );
  const [radiusKm, setRadiusKm] = useState<AtlasRadiusKm | null>(
    () => savedFilters?.radiusKm ?? null,
  );
  const [favoritesOnly, setFavoritesOnly] = useState(
    () => savedFilters?.favoritesOnly ?? false,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [listOverride, setListOverride] = useState<AtlasMapPoint[] | null>(null);
  const [selected, setSelected] = useState<AtlasMapPoint | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [governorates, setGovernorates] = useState<string[]>([]);
  const [networks, setNetworks] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<AtlasMapPoint[]>([]);

  const activeFilterCount =
    (typeFilter ? 1 : 0) +
    (governorateFilter ? 1 : 0) +
    (networkFilter ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (favoritesOnly ? 1 : 0) +
    (radiusKm != null ? 1 : 0);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setFollowing(false);
  }, []);

  const clearUserOverlay = useCallback(() => {
    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = null;
    userCircleRef.current?.setMap(null);
    userCircleRef.current = null;
    radiusCircleRef.current?.setMap(null);
    radiusCircleRef.current = null;
  }, []);

  const applyTheme = useCallback((id: AtlasThemeId) => {
    const map = mapRef.current;
    if (!map) return;
    applyAtlasTheme(map, id);
    setTheme(id);
    setAtlasMapTheme(id as AtlasStoredThemeId);
  }, []);

  const persistCamera = useCallback(() => {
    if (!mapReadyForPersistRef.current) return;
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    if (!center || zoom == null || !Number.isFinite(zoom) || zoom < 3 || zoom > 18) return;
    setAtlasCameraState({
      center: { lat: center.lat(), lng: center.lng() },
      zoom,
    });
  }, []);

  const persistFilters = useCallback(() => {
    setAtlasFilterState({
      type: typeFilter,
      governorate: governorateFilter,
      network: networkFilter,
      status: statusFilter,
      radiusKm,
      favoritesOnly,
      query,
    });
  }, [
    favoritesOnly,
    governorateFilter,
    networkFilter,
    query,
    radiusKm,
    statusFilter,
    typeFilter,
  ]);

  useEffect(() => {
    if (!ready) return;
    persistFilters();
  }, [persistFilters, ready]);

  useEffect(() => {
    if (!ready) return;
    const points = pointsRef.current;
    if (points.length === 0) return;
    setTypes(distinctAtlasTypes(points, userPosition));
    setGovernorates(distinctAtlasGovernorates(points, userPosition));
    setNetworks(distinctAtlasNetworks(points, userPosition));
    setStatuses(distinctAtlasStatuses(points, userPosition));
  }, [ready, userPosition]);

  const focusPoint = useCallback((point: AtlasMapPoint, zoom = 15) => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo({ lat: point.lat, lng: point.lng });
    const current = map.getZoom() ?? 6;
    if (current < zoom) map.setZoom(zoom);
    setSelected(point);
  }, []);

  const updateRadiusCircle = useCallback((center: AtlasLatLng | null, km: number | null) => {
    const map = mapRef.current;
    if (!map) return;
    if (!center || km == null) {
      radiusCircleRef.current?.setMap(null);
      radiusCircleRef.current = null;
      return;
    }
    if (!radiusCircleRef.current) {
      radiusCircleRef.current = new google.maps.Circle({
        map,
        center,
        radius: km * 1000,
        fillColor: "#2d6b7a",
        fillOpacity: 0.08,
        strokeColor: "#5a9aaa",
        strokeOpacity: 0.45,
        strokeWeight: 1,
        clickable: false,
        zIndex: 1,
      });
    } else {
      radiusCircleRef.current.setCenter(center);
      radiusCircleRef.current.setRadius(km * 1000);
      radiusCircleRef.current.setMap(map);
    }
  }, []);

  const updateUserPosition = useCallback(
    (coords: GeolocationCoordinates, panOnce: boolean) => {
      const map = mapRef.current;
      if (!map) return;

      const position = { lat: coords.latitude, lng: coords.longitude };
      userPositionRef.current = position;
      setUserPosition(position);
      const accuracy = Math.max(coords.accuracy || 40, 24);

      if (!userMarkerRef.current) {
        userMarkerRef.current = new google.maps.Marker({
          map,
          position,
          title: "موقعك",
          zIndex: 9999,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
      } else {
        userMarkerRef.current.setPosition(position);
      }

      if (!userCircleRef.current) {
        userCircleRef.current = new google.maps.Circle({
          map,
          center: position,
          radius: accuracy,
          fillColor: "#3b82f6",
          fillOpacity: 0.12,
          strokeColor: "#60a5fa",
          strokeOpacity: 0.45,
          strokeWeight: 1,
          clickable: false,
          zIndex: 9998,
        });
      } else {
        userCircleRef.current.setCenter(position);
        userCircleRef.current.setRadius(accuracy);
      }

      if (panOnce && !didCenterOnUserRef.current) {
        didCenterOnUserRef.current = true;
        map.panTo(position);
        const zoom = map.getZoom() ?? 6;
        if (zoom < 14) map.setZoom(14);
      }
    },
    [],
  );

  const locateMe = useCallback(() => {
    if (following) {
      stopWatching();
      toast.message("توقف تتبع الموقع");
      return;
    }
    if (!navigator.geolocation) {
      toast.error("الموقع غير متاح على هذا الجهاز");
      return;
    }
    if (!mapRef.current) return;

    setLocating(true);
    didCenterOnUserRef.current = false;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        updateUserPosition(pos.coords, true);
        setFollowing(true);

        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGovernorateFilter((current) => {
          if (current != null) return current;
          const nearest = nearestAtlasGovernorate(pointsRef.current, position);
          if (!nearest) return current;
          toast.message(`أقرب محافظة: ${nearest}`);
          return nearest;
        });

        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (next) => updateUserPosition(next.coords, false),
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
        );
      },
      (err) => {
        setLocating(false);
        stopWatching();
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("تم رفض إذن الموقع — فعّله من إعدادات المتصفح");
        } else if (err.code === err.TIMEOUT) {
          toast.error("انتهت مهلة تحديد الموقع — حاول مجدداً");
        } else {
          toast.error("تعذر تحديد موقعك");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [following, stopWatching, updateUserPosition]);

  const resetView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    skipNextFitRef.current = true;
    setQuery("");
    setDraftQuery("");
    setTypeFilter(null);
    setGovernorateFilter(null);
    setNetworkFilter(null);
    setStatusFilter(null);
    setRadiusKm(null);
    setFavoritesOnly(false);
    setListOverride(null);
    map.setCenter(EGYPT_CENTER);
    map.setZoom(EGYPT_ZOOM);
    updateRadiusCircle(null, null);
  }, [updateRadiusCircle]);

  const onSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = draftQuery.trim();
    setQuery(next);
    if (!next) return;
    // Matching runs in the filter effect; open list for multi-hit after state applies.
    window.setTimeout(() => {
      const matches = filterAtlasPoints(pointsRef.current, {
        query: next,
        type: typeFilter,
        governorate: governorateFilter,
        network: networkFilter,
        status: statusFilter,
        favoritesOnly,
        favoriteIds,
        userPosition,
        radiusKm,
      });
      if (matches.length === 0) {
        toast.message("لا نتائج لهذا البحث");
        return;
      }
      if (matches.length === 1) {
        focusPoint(matches[0]!);
        return;
      }
      setListOverride(null);
      setListOpen(true);
      const first = sortAtlasPoints(matches, userPosition)[0];
      if (first) focusPoint(first, 12);
    }, 0);
  };

  const onRadiusPick = (value: AtlasRadiusKm | null) => {
    if (value != null && !userPosition) {
      toast.message(RADIUS_NEED_GPS);
      return;
    }
    setRadiusKm(value);
    if (value != null && userPosition && mapRef.current) {
      skipNextFitRef.current = true;
      mapRef.current.panTo(userPosition);
      mapRef.current.setZoom(zoomForRadiusKm(value));
      updateRadiusCircle(userPosition, value);
    } else {
      updateRadiusCircle(null, null);
    }
  };

  // Sync clusterer markers from filters — clusterer owns pins (never setMap on them).
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const clusterer = clustererRef.current;
    if (!map || !clusterer) return;

    const next = filterAtlasPoints(pointsRef.current, {
      query,
      type: typeFilter,
      governorate: governorateFilter,
      network: networkFilter,
      status: statusFilter,
      favoritesOnly,
      favoriteIds,
      userPosition,
      radiusKm,
    });
    setFiltered(next);
    setListOverride(null);

    const filterKey = `${query}|${typeFilter}|${governorateFilter}|${networkFilter}|${statusFilter}|${favoritesOnly}|${radiusKm}|${favoriteIds.size}`;
    const filterChanged = filterKey !== prevFilterKeyRef.current;
    prevFilterKeyRef.current = filterKey;

    const activeMarkers: google.maps.Marker[] = [];
    for (const point of next) {
      const marker = markersByIdRef.current.get(point.id);
      if (!marker) continue;
      marker.setIcon(
        favoriteIds.has(point.id)
          ? {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#e8b84a",
              fillOpacity: 1,
              strokeColor: "#0c1214",
              strokeWeight: 1.5,
            }
          : {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#5a9aaa",
              fillOpacity: 0.95,
              strokeColor: "#0c1214",
              strokeWeight: 1.5,
            },
      );
      activeMarkers.push(marker);
    }

    clusterer.clearMarkers();
    if (activeMarkers.length > 0) {
      clusterer.addMarkers(activeMarkers);
    } else {
      clusterer.render();
    }

    updateRadiusCircle(userPosition, radiusKm);

    if (next.length === 0) {
      const now = Date.now();
      if (filterChanged && now - emptyToastAtRef.current > 1500) {
        emptyToastAtRef.current = now;
        if (radiusKm != null && !userPosition) {
          toast.message(RADIUS_EMPTY_NEED_GPS);
        } else {
          toast.message(EMPTY_FILTERS);
        }
      }
      return;
    }

    if (skipNextFitRef.current) {
      skipNextFitRef.current = false;
      return;
    }

    if (!filterChanged) return;

    // Radius: camera already set in onRadiusPick.
    if (radiusKm != null && userPosition) return;

    if (next.length <= FIT_WHEN_AT_MOST) {
      fitAtlasToPoints(map, next, { maxZoom: 15, padding: 72 });
      // fitBounds can leave clusters blank until the next idle — force a redraw.
      google.maps.event.addListenerOnce(map, "idle", () => {
        clustererRef.current?.render();
      });
    }
  }, [
    favoriteIds,
    favoritesOnly,
    governorateFilter,
    networkFilter,
    query,
    radiusKm,
    ready,
    statusFilter,
    typeFilter,
    updateRadiusCircle,
    userPosition,
  ]);

  // Init map once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let disposePalestineLabel: (() => void) | null = null;
    let idleListener: google.maps.MapsEventListener | null = null;
    const initialTheme = getAtlasMapTheme();

    const gmWindow = window as GmWindow;
    const prevAuthFailure = gmWindow.gm_authFailure;
    gmWindow.gm_authFailure = () => {
      if (cancelled) return;
      setReady(false);
      setError(
        "المفتاح غير مفعّل لخرائط جوجل. من Google Cloud فعّل Maps JavaScript API لهذا المشروع، ثم أعد إدخال المفتاح.",
      );
    };

    void (async () => {
      try {
        ensureAtlasMapsOptions(apiKey);

        const [pointsRes, mapsLib] = await Promise.all([
          fetch(POINTS_URL),
          loadAtlasMapsLibrary(),
        ]);
        if (!pointsRes.ok) throw new Error("POINTS");
        const points = (await pointsRes.json()) as AtlasMapPoint[];
        if (cancelled) return;

        pointsRef.current = points;
        pointsByIdRef.current = new globalThis.Map(points.map((p) => [p.id, p]));
        setTypes(distinctAtlasTypes(points, userPositionRef.current));
        setGovernorates(distinctAtlasGovernorates(points, userPositionRef.current));
        setNetworks(distinctAtlasNetworks(points, userPositionRef.current));
        setStatuses(distinctAtlasStatuses(points, userPositionRef.current));

        const { Map: GoogleMap } = mapsLib;
        const center = savedCamera?.center ?? EGYPT_CENTER;
        const zoom = savedCamera?.zoom ?? EGYPT_ZOOM;

        const map = new GoogleMap(host, {
          center,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
          backgroundColor: "#0c1214",
        });
        mapRef.current = map;
        applyAtlasTheme(map, initialTheme);
        setTheme(initialTheme);
        disposePalestineLabel = attachPalestineLabel(map);
        idleListener = map.addListener("idle", () => {
          if (!mapReadyForPersistRef.current) {
            const z = map.getZoom();
            if (z != null && z >= 3 && z <= 18) {
              mapReadyForPersistRef.current = true;
            }
          }
          persistCamera();
        });

        for (const point of points) {
          const marker = new google.maps.Marker({
            position: { lat: point.lat, lng: point.lng },
            title: point.name,
            // No map — MarkerClusterer owns attachment.
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#5a9aaa",
              fillOpacity: 0.95,
              strokeColor: "#0c1214",
              strokeWeight: 1.5,
            },
          });
          marker.addListener("click", () => setSelected(point));
          markersByIdRef.current.set(point.id, marker);
          markerToIdRef.current.set(marker, point.id);
        }

        clustererRef.current = new MarkerClusterer({
          map,
          markers: [...markersByIdRef.current.values()],
          onClusterClick: (event, cluster, mapInstance) => {
            const clusterMarkers = cluster.markers as google.maps.Marker[];
            if (clusterMarkers.length > 0 && clusterMarkers.length <= CLUSTER_LIST_MAX) {
              const clusterPoints: AtlasMapPoint[] = [];
              for (const marker of clusterMarkers) {
                const id = markerToIdRef.current.get(marker);
                const point = id ? pointsByIdRef.current.get(id) : undefined;
                if (point) clusterPoints.push(point);
              }
              if (clusterPoints.length > 0) {
                setListOverride(sortAtlasPoints(clusterPoints, userPositionRef.current));
                setListOpen(true);
                const bounds = cluster.bounds;
                if (bounds && !bounds.isEmpty()) {
                  mapInstance.fitBounds(bounds, 48);
                }
                return;
              }
            }
            defaultOnClusterClickHandler(event, cluster, mapInstance);
          },
        });

        if (!cancelled) {
          skipNextFitRef.current = true;
          setFiltered(points);
          setReady(true);
        }
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        if (err instanceof Error && err.message === "KEY_CHANGED") {
          setError("تم تغيير المفتاح — حدّث الصفحة ثم أدخل المفتاح من جديد.");
        } else if (err instanceof Error && err.message === "POINTS") {
          setError("تعذر تحميل نقاط الأطلس.");
        } else {
          setError("تعذر فتح الأطلس. تحقّق من المفتاح وأعد المحاولة.");
        }
      }
    })();

    return () => {
      cancelled = true;
      stopWatching();
      clearUserOverlay();
      disposePalestineLabel?.();
      idleListener?.remove();
      if (prevAuthFailure) {
        gmWindow.gm_authFailure = prevAuthFailure;
      } else {
        delete gmWindow.gm_authFailure;
      }
      clustererRef.current?.clearMarkers();
      clustererRef.current?.setMap(null);
      clustererRef.current = null;
      markersByIdRef.current.clear();
      markerToIdRef.current.clear();
      pointsByIdRef.current.clear();
      mapRef.current = null;
      host.replaceChildren();
    };
  }, [apiKey, clearUserOverlay, persistCamera, savedCamera?.center, savedCamera?.zoom, stopWatching]);

  useEffect(() => {
    if (!ready || didApplyDeepLinkRef.current) return;
    if (initialQuery) {
      setQuery(initialQuery);
      setDraftQuery(initialQuery);
    }
    if (initialId) {
      const point = pointsRef.current.find((p) => p.id === initialId);
      if (point) {
        didApplyDeepLinkRef.current = true;
        skipNextFitRef.current = true;
        focusPoint(point);
        return;
      }
    }
    if (initialQuery) didApplyDeepLinkRef.current = true;
  }, [focusPoint, initialId, initialQuery, ready]);

  const listItems = useMemo(() => {
    const source = listOverride ?? filtered;
    return sortAtlasPoints(source, userPosition).slice(0, LIST_CAP);
  }, [filtered, listOverride, userPosition]);

  const listTotal = listOverride?.length ?? filtered.length;

  return (
    <div className="relative min-h-dvh bg-[#0c1214]">
      <div
        ref={hostRef}
        className={`absolute inset-0 transition-opacity duration-700 ${ready && !error ? "opacity-100" : "opacity-0"}`}
      />

      {!ready && !error && (
        <div className="absolute inset-0 z-10 grid place-items-center">
          <p className="text-sm text-[#7a9298] motion-safe:animate-pulse">جاري رسم الأطلس…</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 grid place-items-center px-4">
          <div className="max-w-md space-y-4 text-center">
            <p className="text-sm leading-relaxed text-[#c9a27a]">{error}</p>
            <button
              type="button"
              onClick={onLock}
              className="text-sm text-[#8ab0b8] underline-offset-4 hover:underline"
            >
              إعادة إدخال المفتاح
            </button>
          </div>
        </div>
      )}

      {ready && !error && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[#0c1214]/95 to-transparent pb-14 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="pointer-events-auto mx-auto flex max-w-6xl flex-col gap-2 px-3 sm:px-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 text-[#c5d4d8]">
                  <MapPinned className="size-4 shrink-0 text-[#6a9aa4]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-wide">الأطلس</p>
                    <p className="text-[11px] text-[#6a8288]">
                      {filtered.length.toLocaleString("ar-EG")} موقع
                      {filtered.length !== pointsRef.current.length
                        ? ` من ${pointsRef.current.length.toLocaleString("ar-EG")}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((v) => !v)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] backdrop-blur",
                      filtersOpen || activeFilterCount > 0
                        ? "border-[#3d6b78] bg-[#2d6b7a]/35 text-[#e8eef0]"
                        : "border-[#2a3c42]/80 bg-[#121a1d]/80 text-[#9ab0b6] hover:text-[#e8eef0]",
                    )}
                  >
                    <Filter className="size-3.5" />
                    تصفية
                    {activeFilterCount > 0 ? (
                      <span className="rounded-full bg-[#2d6b7a] px-1.5 text-[10px]">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex size-9 items-center justify-center rounded-full border border-[#2a3c42]/80 bg-[#121a1d]/80 text-[#9ab0b6] backdrop-blur hover:text-[#e8eef0]"
                        aria-label="المزيد"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="min-w-[11rem] border-[#2a3c42] bg-[#121a1d] text-[#e8eef0]"
                    >
                      <DropdownMenuLabel className="text-[#8aa0a6]">المظهر</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={theme}
                        onValueChange={(v) => applyTheme(v as AtlasThemeId)}
                      >
                        {ATLAS_THEMES.map((item) => (
                          <DropdownMenuRadioItem key={item.id} value={item.id}>
                            {item.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator className="bg-[#2a3c42]" />
                      <DropdownMenuItem asChild>
                        <Link to="/providers" className="cursor-pointer">
                          الدليل
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={resetView}
                        className="cursor-pointer gap-2"
                      >
                        <RotateCcw className="size-3.5" />
                        إعادة ضبط العرض
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={onLock}
                        className="cursor-pointer gap-2 text-[#c9a27a]"
                      >
                        <Lock className="size-3.5" />
                        قفل المفتاح
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <form onSubmit={onSearchSubmit} className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-[#6a8288]" />
                <input
                  value={draftQuery}
                  onChange={(e) => setDraftQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو المنطقة…"
                  className="h-10 w-full rounded-xl border border-[#2a3c42]/90 bg-[#121a1d]/90 pe-3 ps-9 text-sm text-[#e8eef0] placeholder:text-[#5a7076] outline-none backdrop-blur focus:border-[#3d6b78]"
                  dir="rtl"
                />
              </form>

              {filtersOpen && (
                <div className="space-y-3 rounded-2xl border border-[#2a3c42]/90 bg-[#121a1d]/95 p-3 shadow-xl backdrop-blur">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[#c5d4d8]">التصفية</p>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="text-[#8aa0a6] hover:text-[#e8eef0]"
                      aria-label="إغلاق التصفية"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-[11px] text-[#6a8288]">النوع</span>
                    <select
                      value={typeFilter ?? ""}
                      onChange={(e) => setTypeFilter(e.target.value || null)}
                      className="h-9 w-full rounded-lg border border-[#2a3c42] bg-[#0c1214] px-2 text-sm text-[#e8eef0]"
                    >
                      <option value="">الكل</option>
                      {types.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-[11px] text-[#6a8288]">المحافظة</span>
                    <select
                      value={governorateFilter ?? ""}
                      onChange={(e) => setGovernorateFilter(e.target.value || null)}
                      className="h-9 w-full rounded-lg border border-[#2a3c42] bg-[#0c1214] px-2 text-sm text-[#e8eef0]"
                    >
                      <option value="">الكل</option>
                      {governorates.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-[11px] text-[#6a8288]">الشبكة</span>
                    <select
                      value={networkFilter ?? ""}
                      onChange={(e) => setNetworkFilter(e.target.value || null)}
                      className="h-9 w-full rounded-lg border border-[#2a3c42] bg-[#0c1214] px-2 text-sm text-[#e8eef0]"
                    >
                      <option value="">الكل</option>
                      {networks.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-[11px] text-[#6a8288]">الحالة</span>
                    <select
                      value={statusFilter ?? ""}
                      onChange={(e) => setStatusFilter(e.target.value || null)}
                      className="h-9 w-full rounded-lg border border-[#2a3c42] bg-[#0c1214] px-2 text-sm text-[#e8eef0]"
                    >
                      <option value="">الكل</option>
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-1.5">
                    <span className="text-[11px] text-[#6a8288]">القرب</span>
                    <div className="flex flex-wrap gap-1.5">
                      <FilterChip
                        active={radiusKm == null}
                        onClick={() => onRadiusPick(null)}
                        label="الكل"
                      />
                      {RADIUS_OPTIONS.map((km) => (
                        <FilterChip
                          key={km}
                          active={radiusKm === km}
                          onClick={() => onRadiusPick(km)}
                          label={`${km} كم`}
                          disabled={!userPosition}
                        />
                      ))}
                    </div>
                    {!userPosition ? (
                      <p className="text-[11px] text-[#5a7076]">{RADIUS_NEED_GPS}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setFavoritesOnly((v) => !v)}
                    className={cn(
                      "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border text-sm",
                      favoritesOnly
                        ? "border-[#e8b84a]/50 bg-[#e8b84a]/15 text-[#e8b84a]"
                        : "border-[#2a3c42] text-[#9ab0b6]",
                    )}
                  >
                    <Heart className="size-3.5" />
                    المفضلة فقط
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] end-4 z-20 flex flex-col gap-2">
            <Fab
              onClick={() => {
                setListOverride(null);
                setListOpen((v) => !v);
              }}
              active={listOpen}
              label="القائمة"
              title="قائمة النتائج"
            >
              <List className="size-5" />
            </Fab>
            <Fab
              onClick={locateMe}
              disabled={locating}
              active={following}
              label="موقعي"
              title={following ? "إيقاف التتبع" : "موقعي"}
            >
              <LocateFixed className={cn("size-5", locating && "motion-safe:animate-pulse")} />
            </Fab>
          </div>

          {listOpen && (
            <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 mx-auto mb-[max(5.5rem,calc(env(safe-area-inset-bottom)+5rem))] w-full max-w-lg px-3 lg:end-20 lg:start-auto lg:bottom-24 lg:mb-0 lg:w-80">
              <div className="max-h-[40vh] overflow-y-auto rounded-2xl border border-[#2a3c42]/90 bg-[#121a1d]/95 shadow-2xl backdrop-blur lg:max-h-[50vh]">
                <div className="sticky top-0 flex items-center justify-between border-b border-[#2a3c42]/70 bg-[#121a1d]/95 px-3 py-2">
                  <p className="text-xs font-medium text-[#c5d4d8]">
                    {listOverride ? "في هذه المجموعة · " : ""}
                    النتائج ({Math.min(listTotal, LIST_CAP).toLocaleString("ar-EG")}
                    {listTotal > LIST_CAP ? "+" : ""})
                  </p>
                  <button
                    type="button"
                    className="text-[11px] text-[#8aa0a6] hover:text-[#e8eef0]"
                    onClick={() => setListOpen(false)}
                  >
                    إغلاق
                  </button>
                </div>
                {listItems.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-[#6a8288]">
                    {radiusKm != null && !userPosition
                      ? RADIUS_EMPTY_NEED_GPS
                      : EMPTY_FILTERS}
                    .
                  </p>
                ) : (
                  <ul>
                    {listItems.map((point) => {
                      const dist =
                        userPosition != null
                          ? haversineKm(userPosition, { lat: point.lat, lng: point.lng })
                          : null;
                      return (
                        <li key={point.id}>
                          <button
                            type="button"
                            onClick={() => {
                              skipNextFitRef.current = true;
                              focusPoint(point);
                              setListOpen(false);
                            }}
                            className={cn(
                              "flex w-full flex-col gap-0.5 border-b border-[#2a3c42]/40 px-3 py-2.5 text-start hover:bg-[#1a262c]",
                              selected?.id === point.id && "bg-[#1a3038]/80",
                            )}
                          >
                            <span className="truncate text-sm text-[#e8eef0]">{point.name}</span>
                            <span className="truncate text-[11px] text-[#6a8288]">
                              {point.type}
                              {point.area ? ` · ${point.area}` : ""}
                              {dist != null ? ` · ${dist.toFixed(1)} كم` : ""}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {listTotal > LIST_CAP ? (
                  <p className="px-3 py-2 text-center text-[11px] text-[#5a7076]">
                    والمزيد عند التقريب أو تضييق البحث…
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <AtlasPinSheet
            point={selected}
            onClose={() => setSelected(null)}
            isFavorite={selected ? isFavorite(selected.id) : false}
            onToggleFavorite={toggleFavorite}
            userPosition={userPosition}
            className={listOpen ? "mb-2 lg:mb-0" : undefined}
          />
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-[#3d6b78] bg-[#2d6b7a]/35 text-[#e8eef0]"
          : "border-[#2a3c42]/80 bg-[#0c1214] text-[#9ab0b6]",
      )}
    >
      {label}
    </button>
  );
}

function Fab({
  children,
  onClick,
  disabled,
  active,
  label,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className={cn(
        "inline-flex size-12 items-center justify-center rounded-full border shadow-lg backdrop-blur transition-colors",
        active
          ? "border-[#3b82f6]/60 bg-[#1e3a5f]/90 text-[#93c5fd]"
          : "border-[#2a3c42]/90 bg-[#121a1d]/90 text-[#c5d4d8] hover:text-[#e8eef0]",
        disabled && "opacity-70",
      )}
    >
      {children}
    </button>
  );
}
