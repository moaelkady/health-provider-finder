import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSosContacts } from "@/hooks/useSosContacts";
import {
  EGYPT_AMBULANCE,
  SOS_COUNTDOWN_MS,
  dialAmbulance,
  openWhatsAppSos,
  type SosCoords,
} from "@/lib/sos";
import { cn } from "@/lib/utils";

type LocationPhase = "requesting" | "ready" | "denied" | "unavailable";

function requestCoords(): Promise<SosCoords | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  });
}

export function SosEmergencySheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { primaryContact } = useSosContacts();
  const [secondsLeft, setSecondsLeft] = useState(SOS_COUNTDOWN_MS / 1000);
  const [progress, setProgress] = useState(100);
  const [locationPhase, setLocationPhase] = useState<LocationPhase>("requesting");
  const [waBusy, setWaBusy] = useState(false);

  const resolvedRef = useRef(false);
  const coordsRef = useRef<SosCoords | null>(null);
  const locationPromiseRef = useRef<Promise<SosCoords | null> | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const stopCountdown = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const closeSheet = useCallback(() => {
    resolvedRef.current = true;
    stopCountdown();
    onOpenChange(false);
  }, [onOpenChange, stopCountdown]);

  const finishDial = useCallback(() => {
    if (resolvedRef.current) return;
    closeSheet();
    dialAmbulance();
  }, [closeSheet]);

  useEffect(() => {
    if (!open) {
      stopCountdown();
      setWaBusy(false);
      return;
    }

    resolvedRef.current = false;
    coordsRef.current = null;
    setLocationPhase("requesting");
    setSecondsLeft(SOS_COUNTDOWN_MS / 1000);
    setProgress(100);
    startRef.current = performance.now();

    const promise = requestCoords();
    locationPromiseRef.current = promise;
    void promise.then((result) => {
      if (locationPromiseRef.current !== promise) return;
      coordsRef.current = result;
      setLocationPhase(result ? "ready" : "denied");
    });

    const tick = (now: number) => {
      if (resolvedRef.current) return;
      const elapsed = now - startRef.current;
      const remaining = Math.max(0, SOS_COUNTDOWN_MS - elapsed);
      setProgress((remaining / SOS_COUNTDOWN_MS) * 100);
      setSecondsLeft(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        finishDial();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      stopCountdown();
      locationPromiseRef.current = null;
    };
  }, [open, finishDial, stopCountdown]);

  const handleWhatsApp = async () => {
    if (!primaryContact || resolvedRef.current || waBusy) return;
    resolvedRef.current = true;
    stopCountdown();
    setWaBusy(true);

    let next = coordsRef.current;
    if (!next && locationPromiseRef.current) {
      next = await Promise.race([
        locationPromiseRef.current,
        new Promise<SosCoords | null>((resolve) => {
          window.setTimeout(() => resolve(null), 1500);
        }),
      ]);
      if (next) {
        coordsRef.current = next;
      }
    }

    openWhatsAppSos(primaryContact.phone, next);
    setWaBusy(false);
    closeSheet();
  };

  const handleCallNow = () => {
    finishDial();
  };

  const locationHint =
    locationPhase === "ready"
      ? "تم تحديد موقعك لإرفاقه برسالة واتساب."
      : locationPhase === "requesting"
        ? "جاري تحديد موقعك…"
        : "تعذر تحديد الموقع — يمكن إرسال واتساب بدون رابط خريطة.";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          resolvedRef.current = true;
          stopCountdown();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-w-md gap-5 border-red-200 sm:rounded-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          closeSheet();
        }}
      >
        <DialogHeader className="space-y-2 text-start">
          <DialogTitle className="text-xl text-red-700">طوارئ SOS</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            اختر إجراءً الآن، أو سيتم الاتصال بالإسعاف{" "}
            <span className="font-semibold text-foreground" dir="ltr">
              {EGYPT_AMBULANCE}
            </span>{" "}
            تلقائياً خلال{" "}
            <span className="font-semibold text-foreground">{secondsLeft}</span> ثوانٍ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-red-100"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="العد التنازلي للاتصال بالطوارئ"
          >
            <div
              className="h-full rounded-full bg-red-500 transition-[width] duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-2xl font-bold tabular-nums text-red-700" dir="ltr">
            {secondsLeft}
          </p>
          <p className="text-center text-xs text-muted-foreground">{locationHint}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            className={cn(
              "h-14 w-full text-base font-semibold",
              primaryContact
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-muted text-muted-foreground",
            )}
            disabled={!primaryContact || waBusy}
            onClick={() => void handleWhatsApp()}
          >
            {waBusy
              ? "جاري الفتح…"
              : primaryContact
                ? `واتساب — ${primaryContact.label}`
                : "واتساب — أضف جهة موثوقة"}
          </Button>

          {!primaryContact && (
            <p className="text-center text-xs text-muted-foreground">
              لإرسال الموقع عبر واتساب، أضف رقماً من{" "}
              <Link
                to="/settings"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={closeSheet}
              >
                الإعدادات
              </Link>
              .
            </p>
          )}

          <Button
            type="button"
            variant="destructive"
            className="h-14 w-full text-base font-semibold"
            onClick={handleCallNow}
          >
            اتصال بالإسعاف {EGYPT_AMBULANCE}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full text-base"
            onClick={closeSheet}
          >
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
