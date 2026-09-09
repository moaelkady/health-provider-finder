import { ExternalLink, MapPin, Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { mapsActionLabel, mapsSearchUrl } from "@/lib/contact-actions";
import { formatDistanceKm } from "@/lib/geo";
import { hasExactLocation } from "@/lib/maps";
import type { Provider } from "@/types/provider";

/**
 * Location summary + Maps CTA (address search — stored coords are often inaccurate).
 */
export function LocationCard({ provider }: { provider: Provider }) {
  const { location } = provider;
  const exact = hasExactLocation(provider);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="relative h-40 bg-map-placeholder sm:h-44">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60" />
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid size-10 place-items-center rounded-full border border-primary/30 bg-card text-primary shadow-card">
            <MapPin className="size-5" />
          </div>
        </div>
        <span className="absolute bottom-2 start-3 rounded-md bg-card/90 px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {exact
            ? "موقع مسجّل في البيانات"
            : location.precision === "approximate"
              ? "موقع تقريبي"
              : "الموقع غير محدد بعد"}
        </span>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">الموقع</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {location.address}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">المنطقة</dt>
            <dd className="font-medium text-foreground">{location.area}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">المحافظة</dt>
            <dd className="font-medium text-foreground">{location.governorate}</dd>
          </div>
        </dl>
        {typeof location.distanceKm === "number" && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Navigation className="size-3.5" /> على بعد حوالي{" "}
            {formatDistanceKm(location.distanceKm)}
          </p>
        )}
        <Button asChild className="h-11 w-full">
          <a href={mapsSearchUrl(provider)} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            {mapsActionLabel()}
          </a>
        </Button>
      </div>
    </section>
  );
}
