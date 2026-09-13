import { Link } from "@tanstack/react-router";
import { Heart, MapPinned, MessageCircle, Navigation, Phone, X } from "lucide-react";
import { toast } from "sonner";

import { atlasMapsCoordsUrl, atlasMapsDirectionsUrl } from "@/components/atlas/atlas-geo";
import type { AtlasLatLng } from "@/components/atlas/atlas-geo";
import { isEgyptianMobile, telHref, whatsappUrl } from "@/lib/contact-actions";
import { cn } from "@/lib/utils";
import type { AtlasMapPoint } from "@/types/atlas";

interface Props {
  point: AtlasMapPoint | null;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  userPosition?: AtlasLatLng | null;
  className?: string | undefined;
}

export function AtlasPinSheet({
  point,
  onClose,
  isFavorite = false,
  onToggleFavorite,
  userPosition = null,
  className,
}: Props) {
  if (!point) return null;

  const place = [point.area, point.governorate].filter(Boolean).join(" · ");
  const phone = point.phone?.trim() || null;
  const wa = phone && isEgyptianMobile(phone) ? whatsappUrl(phone) : null;
  const mapsUrl = atlasMapsCoordsUrl(point.lat, point.lng);
  const directionsUrl = atlasMapsDirectionsUrl(
    { lat: point.lat, lng: point.lng },
    userPosition,
  );

  const onDirections = () => {
    if (!userPosition) {
      toast.message("فعّل «موقعي» للاتجاهات من مكانك — فتح الموقع على الخريطة");
    }
    window.open(directionsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
      role="dialog"
      aria-label={point.name}
    >
      <div className="rounded-2xl border border-[#2a3c42]/90 bg-[#121a1d]/95 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-base font-semibold text-[#e8eef0]">{point.name}</p>
            <p className="text-xs text-[#8aa0a6]">{point.type}</p>
            {place ? <p className="text-xs text-[#6a8288]">{place}</p> : null}
            {point.network ? (
              <p className="text-[11px] text-[#6a9aaa]">{point.network}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onToggleFavorite ? (
              <button
                type="button"
                onClick={() => onToggleFavorite(point.id)}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full border",
                  isFavorite
                    ? "border-[#e8b84a]/50 bg-[#e8b84a]/15 text-[#e8b84a]"
                    : "border-[#2a3c42] text-[#9ab0b6] hover:text-[#e8eef0]",
                )}
                aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                aria-pressed={isFavorite}
              >
                <Heart className={cn("size-3.5", isFavorite && "fill-current")} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-full border border-[#2a3c42] text-[#9ab0b6] hover:text-[#e8eef0]"
              aria-label="إغلاق"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {phone ? (
            <a
              href={telHref(phone)}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#2a3c42] bg-[#0c1214]/80 text-sm text-[#c5d4d8] hover:text-[#e8eef0]"
            >
              <Phone className="size-3.5" />
              اتصال
            </a>
          ) : null}
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-800/60 bg-emerald-950/40 text-sm text-emerald-300 hover:bg-emerald-950/70"
            >
              <MessageCircle className="size-3.5" />
              واتساب
            </a>
          ) : null}
          <button
            type="button"
            onClick={onDirections}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#2a3c42] bg-[#0c1214]/80 text-sm text-[#c5d4d8] hover:text-[#e8eef0]"
          >
            <Navigation className="size-3.5" />
            الاتجاهات
          </button>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#2a3c42] bg-[#0c1214]/80 text-sm text-[#c5d4d8] hover:text-[#e8eef0]"
          >
            <MapPinned className="size-3.5" />
            خرائط
          </a>
          <Link
            to="/providers/$providerId"
            params={{ providerId: point.id }}
            className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#3d6b78]/50 bg-[#2d6b7a]/25 text-sm text-[#d5e8ec] hover:bg-[#2d6b7a]/40"
          >
            الدليل
          </Link>
        </div>
      </div>
    </div>
  );
}
