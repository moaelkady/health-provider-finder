/**
 * Browser geolocation with session persistence for nearby directory mode.
 *
 * Geolocation requires a secure context (HTTPS or localhost). On a phone over
 * LAN, run `npm run dev:phone`, open the https:// Network URL, and accept the
 * self-signed certificate once — same as camera access in capture-verify.
 */

import { useCallback, useEffect, useState } from "react";

import type { GeoPoint } from "@/types/provider";

const STORAGE_KEY = "hpd.userLocation.v1";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "unavailable"
  | "insecure";

type StoredLocation = {
  coords: GeoPoint;
  savedAt: number;
};

function isSecureContextAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function readStored(): GeoPoint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLocation;
    if (
      !parsed?.coords ||
      typeof parsed.coords.lat !== "number" ||
      typeof parsed.coords.lng !== "number"
    ) {
      return null;
    }
    return parsed.coords;
  } catch {
    return null;
  }
}

function writeStored(coords: GeoPoint) {
  try {
    const payload: StoredLocation = { coords, savedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function clearStored() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function mapGeoError(error: GeolocationPositionError): {
  status: LocationStatus;
  message: string;
} {
  if (error.code === error.PERMISSION_DENIED) {
    return {
      status: "denied",
      message:
        "تم رفض إذن الموقع. على الآيفون: الإعدادات → Chrome → الموقع → أثناء استخدام التطبيق، ثم أعد المحاولة.",
    };
  }
  if (error.code === error.TIMEOUT) {
    return {
      status: "unavailable",
      message: "انتهت مهلة تحديد الموقع. فعّل خدمة الموقع (GPS) وحاول مرة أخرى.",
    };
  }
  return {
    status: "unavailable",
    message: "تعذر تحديد موقعك. اختر محافظتك يدوياً أدناه للمتابعة.",
  };
}

export function useUserLocation() {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSecureContextAvailable()) {
      setStatus("insecure");
      setErrorMessage(
        "المتصفح يمنع الموقع على HTTP. شغّل npm run dev:phone وافتح رابط Network بـ https:// من التيرمنال، واقبل شهادة الأمان مرة واحدة.",
      );
      return;
    }
    const stored = readStored();
    if (stored) {
      setCoords(stored);
      setStatus("ready");
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setErrorMessage(null);

    if (!isSecureContextAvailable()) {
      setStatus("insecure");
      setErrorMessage(
        "المتصفح يمنع الموقع على HTTP. افتح الرابط بـ https:// (من npm run dev:phone) واقبل الشهادة، أو اختر محافظتك أدناه.",
      );
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      setErrorMessage("جهازك أو متصفحك لا يدعم تحديد الموقع.");
      return;
    }

    setStatus("requesting");

    try {
      let position: GeolocationPosition;
      try {
        position = await getPosition({
          enableHighAccuracy: false,
          timeout: 12_000,
          maximumAge: 120_000,
        });
      } catch (firstError) {
        const err = firstError as GeolocationPositionError;
        if (err.code === err.PERMISSION_DENIED) throw err;
        position = await getPosition({
          enableHighAccuracy: true,
          timeout: 20_000,
          maximumAge: 0,
        });
      }

      const next: GeoPoint = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      writeStored(next);
      setCoords(next);
      setStatus("ready");
      setErrorMessage(null);
    } catch (error) {
      const mapped = mapGeoError(error as GeolocationPositionError);
      setStatus(mapped.status);
      setErrorMessage(mapped.message);
    }
  }, []);

  const clearLocation = useCallback(() => {
    clearStored();
    setCoords(null);
    setErrorMessage(null);
    setStatus(isSecureContextAvailable() ? "idle" : "insecure");
  }, []);

  return {
    status,
    coords,
    errorMessage,
    isReady: status === "ready" && !!coords,
    isSecure: isSecureContextAvailable(),
    requestLocation,
    clearLocation,
  };
}
