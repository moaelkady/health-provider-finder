import { Link } from "@tanstack/react-router";
import { ArrowRight, Heart, Mail, MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  providerMobilePhones,
  providerPhones,
  providerWhatsAppMessage,
  telHref,
  whatsappUrl,
} from "@/lib/contact-actions";
import { cn } from "@/lib/utils";
import type { Provider } from "@/types/provider";
import { LocationCard } from "./LocationCard";
import { NetworkBadge, ProviderStatusBadge, TypeBadge } from "./ProviderStatusBadge";
import { ServiceTags, SpecialtyTags } from "./Tags";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-6">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

interface Props {
  provider: Provider;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export function ProviderDetail({ provider, isFavorite, onToggleFavorite }: Props) {
  const { contact } = provider;
  const phones = providerPhones(provider);
  const mobiles = new Set(providerMobilePhones(provider));
  const waMessage = providerWhatsAppMessage(provider);

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link
        to="/providers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowRight className="size-4" /> العودة إلى الدليل
      </Link>

      <header className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-snug text-foreground sm:truncate sm:text-2xl">
              {provider.name}
            </h1>
            {provider.organization && (
              <p className="mt-1 text-sm text-muted-foreground">
                تابع لـ {provider.organization.name}
                {provider.organization.locationCount
                  ? ` · ${provider.organization.locationCount.toLocaleString("ar-EG")} فرع ضمن الشبكة`
                  : ""}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <TypeBadge type={provider.type} />
              <NetworkBadge network={provider.network} />
              <ProviderStatusBadge status={provider.status} />
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onToggleFavorite(provider.id)}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "إزالة من المفضلة" : "حفظ في المفضلة"}
            className="size-11 shrink-0 sm:h-10 sm:w-auto sm:px-4"
          >
            <Heart className={cn("size-4", isFavorite && "fill-primary text-primary")} />
            <span className="hidden sm:inline">{isFavorite ? "محفوظ" : "حفظ"}</span>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="order-first lg:order-last lg:sticky lg:top-20 lg:self-start">
          <LocationCard provider={provider} />
        </div>

        <div className="space-y-4 sm:space-y-6 lg:col-span-2 lg:order-first">
          <Section title="نظرة عامة">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">نوع مقدم الخدمة</dt>
                <dd className="text-sm font-medium text-foreground">{provider.type}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">الشبكة</dt>
                <dd className="text-sm font-medium text-foreground">{provider.network}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">الحالة</dt>
                <dd className="text-sm font-medium text-foreground">{provider.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">التخصص الرئيسي</dt>
                <dd className="text-sm font-medium text-foreground">
                  {provider.specialties[0]?.name ?? "—"}
                </dd>
              </div>
            </dl>
            {provider.notes && (
              <p className="mt-5 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                {provider.notes}
              </p>
            )}
          </Section>

          <Section title="الخدمات">
            <ServiceTags services={provider.services} />
          </Section>

          <Section title="التخصصات">
            <SpecialtyTags specialties={provider.specialties} />
          </Section>

          <Section title="التواصل">
            <div className="space-y-3">
              {phones.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا يوجد رقم هاتف مسجل.</p>
              ) : (
                phones.map((phone) => {
                  const wa = mobiles.has(phone) ? whatsappUrl(phone, waMessage) : null;
                  return (
                    <div
                      key={phone}
                      className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium text-foreground" dir="ltr">
                        {phone}
                      </span>
                      <div className="grid grid-cols-2 gap-2 sm:flex">
                        <Button asChild size="sm" className="h-10">
                          <a href={telHref(phone)}>
                            <Phone className="size-4" />
                            اتصال
                          </a>
                        </Button>
                        {wa && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-10 border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                          >
                            <a href={wa} target="_blank" rel="noreferrer">
                              <MessageCircle className="size-4" />
                              واتساب
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/30"
                >
                  <Mail className="size-4 text-primary" />
                  <span className="min-w-0 truncate font-medium text-foreground" dir="ltr">
                    {contact.email}
                  </span>
                </a>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
