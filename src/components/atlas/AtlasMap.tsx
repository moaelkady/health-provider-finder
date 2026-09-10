import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Link } from "@tanstack/react-router";
import { LocateFixed, Lock, MapPinned } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  applyAtlasTheme,
  ATLAS_THEMES,
  type AtlasThemeId,
} from "@/components/atlas/atlas-map-styles";
import { ensureAtlasMapsOptions, loadAtlasMapsLibrary } from "@/components/atlas/atlas-maps-loader";
import { attachPalestineLabel } from "@/components/atlas/palestine-label";
import {
  getAtlasMapTheme,
  setAtlasMapTheme,
  type AtlasStoredThemeId,
} from "@/lib/atlas-access";
import { cn } from "@/lib/utils";
import type { AtlasMapPoint } from "@/types/atlas";

const POINTS_URL = "/data/generated/map-points.min.json";
const EGYPT_CENTER = { lat: 26.8, lng: 30.8 };

type GmWindow = Window & { gm_authFailure?: () => void };

interface Props {
  apiKey: string;
  onLock: () => void;
}

/**
 * Imperative Google Map + MarkerClusterer — isolated chunk, no React pan churn.
 */
export default function AtlasMap({ apiKey, onLock }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const userCircleRef = useRef<google.maps.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const didCenterOnUserRef = useRef(false);

  const [pointCount, setPointCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<AtlasThemeId>(() => getAtlasMapTheme());
  const [locating, setLocating] = useState(false);
  const [following, setFollowing] = useState(false);

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
  }, []);

  const applyTheme = useCallback((id: AtlasThemeId) => {
    const map = mapRef.current;
    if (!map) return;
    applyAtlasTheme(map, id);
    setTheme(id);
    setAtlasMapTheme(id as AtlasStoredThemeId);
  }, []);

  const updateUserPosition = useCallback(
    (coords: GeolocationCoordinates, panOnce: boolean) => {
      const map = mapRef.current;
      if (!map) return;

      const position = { lat: coords.latitude, lng: coords.longitude };
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

        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (next) => updateUserPosition(next.coords, false),
          () => {
            /* keep last known while watching */
          },
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
  }, [stopWatching, updateUserPosition]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let clusterer: MarkerClusterer | null = null;
    let info: google.maps.InfoWindow | null = null;
    let disposePalestineLabel: (() => void) | null = null;
    const markers: google.maps.Marker[] = [];
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

        const [pointsRes, mapsLib] = await Promise.all([fetch(POINTS_URL), loadAtlasMapsLibrary()]);

        if (!pointsRes.ok) {
          throw new Error("POINTS");
        }
        const points = (await pointsRes.json()) as AtlasMapPoint[];
        if (cancelled) return;

        setPointCount(points.length);

        const { Map } = mapsLib;

        const map = new Map(host, {
          center: EGYPT_CENTER,
          zoom: 6,
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

        info = new google.maps.InfoWindow();

        for (const point of points) {
          const marker = new google.maps.Marker({
            position: { lat: point.lat, lng: point.lng },
            title: point.name,
          });
          marker.addListener("click", () => {
            if (!info || !mapRef.current) return;
            const href = `/providers/${encodeURIComponent(point.id)}`;
            info.setContent(
              `<div dir="rtl" style="font-family:Cairo,sans-serif;max-width:220px;padding:4px 2px">
                <div style="font-weight:600;font-size:14px;color:#1a2428;margin-bottom:4px">${escapeHtml(point.name)}</div>
                <div style="font-size:12px;color:#5a6a6e;margin-bottom:8px">${escapeHtml(point.type)}</div>
                <a href="${href}" style="font-size:12px;color:#2d6b7a;text-decoration:none">عرض في الدليل ←</a>
              </div>`,
            );
            info.open({ map: mapRef.current, anchor: marker });
          });
          markers.push(marker);
        }

        clusterer = new MarkerClusterer({
          map,
          markers,
        });

        if (!cancelled) setReady(true);
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
      disposePalestineLabel = null;
      if (prevAuthFailure) {
        gmWindow.gm_authFailure = prevAuthFailure;
      } else {
        delete gmWindow.gm_authFailure;
      }
      clusterer?.clearMarkers();
      for (const marker of markers) {
        marker.setMap(null);
      }
      info?.close();
      mapRef.current = null;
      host.replaceChildren();
    };
  }, [apiKey, clearUserOverlay, stopWatching]);

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
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[#0c1214]/90 to-transparent pb-20 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="pointer-events-auto mx-auto flex max-w-6xl flex-col gap-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-[#c5d4d8]">
                  <MapPinned className="size-4 shrink-0 text-[#6a9aa4]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-wide">الأطلس</p>
                    {pointCount != null && (
                      <p className="text-[11px] text-[#6a8288]">
                        {pointCount.toLocaleString("ar-EG")} موقع
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    to="/providers"
                    className="rounded-full border border-[#2a3c42]/80 bg-[#121a1d]/80 px-3 py-1.5 text-xs text-[#9ab0b6] backdrop-blur hover:text-[#e8eef0]"
                  >
                    الدليل
                  </Link>
                  <button
                    type="button"
                    onClick={onLock}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#2a3c42]/80 bg-[#121a1d]/80 px-3 py-1.5 text-xs text-[#9ab0b6] backdrop-blur hover:text-[#e8eef0]"
                    aria-label="نسيان المفتاح"
                  >
                    <Lock className="size-3.5" />
                    قفل
                  </button>
                </div>
              </div>

              <div
                className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="مظهر الخريطة"
              >
                {ATLAS_THEMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={theme === item.id}
                    onClick={() => applyTheme(item.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      theme === item.id
                        ? "border-[#3d6b78] bg-[#2d6b7a]/35 text-[#e8eef0]"
                        : "border-[#2a3c42]/80 bg-[#121a1d]/75 text-[#9ab0b6] hover:text-[#e8eef0]",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            className={cn(
              "absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] end-4 z-10 inline-flex size-12 items-center justify-center rounded-full border shadow-lg backdrop-blur transition-colors",
              following
                ? "border-[#3b82f6]/60 bg-[#1e3a5f]/90 text-[#93c5fd]"
                : "border-[#2a3c42]/90 bg-[#121a1d]/90 text-[#c5d4d8] hover:text-[#e8eef0]",
              locating && "opacity-70",
            )}
            aria-label="موقعي"
            title="موقعي"
          >
            <LocateFixed className={cn("size-5", locating && "motion-safe:animate-pulse")} />
          </button>
        </>
      )}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
