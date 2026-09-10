import { ChevronDown, MessageCircle, Phone } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BROKER, brokerTelHref, brokerWhatsAppUrl } from "@/lib/broker";
import { cn } from "@/lib/utils";

export function BrokerHelpButton({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-9 max-w-[min(100%,14rem)] items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-start shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          aria-label="التواصل مع أمان ليك، وسيط التأمين"
        >
          <span className="min-w-0 truncate">
            <span className="font-semibold text-foreground">{BROKER.nameAr}</span>
            <span className="text-muted-foreground"> · مساعدة</span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem]">
        <DropdownMenuItem asChild>
          <a href={brokerTelHref()} className="cursor-pointer gap-2">
            <Phone className="size-4" />
            اتصال
            <span className="ms-auto text-xs text-muted-foreground" dir="ltr">
              {BROKER.phoneDisplay}
            </span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={brokerWhatsAppUrl()}
            target="_blank"
            rel="noreferrer"
            className="cursor-pointer gap-2 text-emerald-800 focus:text-emerald-900 dark:text-emerald-300 dark:focus:text-emerald-200"
          >
            <MessageCircle className="size-4" />
            واتساب
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
