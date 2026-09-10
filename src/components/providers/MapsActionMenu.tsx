import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  mapsActionLabel,
  mapsCoordsUrl,
  mapsSearchUrl,
} from "@/lib/contact-actions";
import { cn } from "@/lib/utils";
import type { Provider } from "@/types/provider";

interface Props {
  provider: Provider;
  className?: string;
  /** Override button size/variant defaults for list vs detail. */
  size?: "sm" | "default";
  variant?: "outline" | "default";
  children?: ReactNode;
}

/**
 * Maps CTA: text search always; coordinates when available (dropdown).
 * Single option → direct link (no empty menu).
 */
export function MapsActionMenu({
  provider,
  className,
  size = "sm",
  variant = "outline",
  children,
}: Props) {
  const searchUrl = mapsSearchUrl(provider);
  const coordsUrl = mapsCoordsUrl(provider);
  const label = children ?? (
    <>
      <ExternalLink className="size-4" />
      {mapsActionLabel()}
    </>
  );

  if (!coordsUrl) {
    return (
      <Button asChild size={size} variant={variant} className={cn("h-10 w-full", className)}>
        <a href={searchUrl} target="_blank" rel="noreferrer">
          {label}
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size={size}
          variant={variant}
          className={cn("h-10 w-full", className)}
        >
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[14rem]">
        <DropdownMenuItem asChild>
          <a href={searchUrl} target="_blank" rel="noreferrer" className="cursor-pointer">
            بحث بالاسم والمنطقة
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={coordsUrl} target="_blank" rel="noreferrer" className="cursor-pointer">
            فتح بالإحداثيات
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
