import { Link, useRouterState } from "@tanstack/react-router";
import { Bookmark, Heart, Search, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { BrokerHelpButton } from "@/components/layout/BrokerHelpButton";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { SosButton } from "@/components/sos/SosButton";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/providers", label: "الدليل", icon: Search },
  { to: "/favorites", label: "المفضلة", icon: Heart },
  { to: "/searches", label: "عمليات البحث", icon: Bookmark },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

function isActivePath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-background">
      <OfflineBanner />
      {/* Mobile-first: sticky top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <BrokerHelpButton className="min-w-0 shrink" />
          <InstallAppButton className="shrink-0" />
          <SosButton className="shrink-0" />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl lg:gap-8 lg:px-4">
        {/* Desktop enhancement: side nav (hidden on mobile) */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 flex-col border-e border-border py-6 lg:flex">
          <nav className="flex flex-1 flex-col gap-1 pe-3">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = isActivePath(pathname, to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Bottom padding clears the mobile tab bar */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-5 sm:pt-6 lg:pb-8 lg:pe-2">
          {children}
        </main>
      </div>

      {/* Mobile-first: bottom tab navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur safe-bottom lg:hidden"
        aria-label="التنقل الرئيسي"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = isActivePath(pathname, to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.25px]")} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
