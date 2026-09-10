import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Navigation, Phone, MessageCircle } from "lucide-react";
import { memo } from "react";

import { MapsActionMenu } from "@/components/providers/MapsActionMenu";
import { PhoneActionMenu } from "@/components/providers/PhoneActionMenu";
import { Button } from "@/components/ui/button";
import {
  providerMobilePhones,
  providerPhones,
  providerWhatsAppMessage,
  telHref,
  whatsappUrl,
} from "@/lib/contact-actions";
import { formatDistanceKm } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { Provider } from "@/types/provider";
import { NetworkBadge, ProviderStatusBadge, TypeBadge } from "./ProviderStatusBadge";
import { ServiceTags, SpecialtyTags } from "./Tags";

interface Props {
  provider: Provider;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export const ProviderCard = memo(function ProviderCard({
  provider,
  isFavorite,
  onToggleFavorite,
}: Props) {
  const { location } = provider;
  const distance =
    typeof location.distanceKm === "number" ? formatDistanceKm(location.distanceKm) : null;
  const phones = providerPhones(provider);
  const mobiles = providerMobilePhones(provider);
  const waMessage = providerWhatsAppMessage(provider);

  return (
    <article className="group rounded-xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <Link
            to="/providers/$providerId"
            params={{ providerId: provider.id }}
            className="block truncate text-base font-semibold text-foreground hover:text-primary sm:text-lg"
          >
            {provider.name}
          </Link>
          {provider.organization && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {provider.organization.name}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
          aria-pressed={isFavorite}
          onClick={() => onToggleFavorite(provider.id)}
          className="shrink-0 rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <Heart className={cn("size-4", isFavorite && "fill-primary text-primary")} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {distance && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <Navigation className="size-3" />
            {distance}
          </span>
        )}
        <TypeBadge type={provider.type} />
        <NetworkBadge network={provider.network} />
        <ProviderStatusBadge status={provider.status} />
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">
            <span className="font-medium text-foreground">
              {location.area}، {location.governorate}
            </span>
            <span className="block text-xs leading-relaxed">{location.address}</span>
          </span>
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <SpecialtyTags specialties={provider.specialties} max={3} />
        <ServiceTags services={provider.services} max={4} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4">
        {phones.length > 0 && (
          <PhoneActionMenu
            mode="call"
            numbers={phones}
            hrefFor={telHref}
          >
            <Phone className="size-4" />
            اتصال
          </PhoneActionMenu>
        )}
        {mobiles.length > 0 && (
          <PhoneActionMenu
            mode="whatsapp"
            numbers={mobiles}
            hrefFor={(n) => whatsappUrl(n, waMessage) ?? "#"}
            className="border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-200"
          >
            <MessageCircle className="size-4" />
            واتساب
          </PhoneActionMenu>
        )}
        <MapsActionMenu provider={provider} />
        <Button asChild size="sm" variant="outline" className="h-10 w-full">
          <Link to="/providers/$providerId" params={{ providerId: provider.id }}>
            التفاصيل
          </Link>
        </Button>
      </div>
    </article>
  );
});
