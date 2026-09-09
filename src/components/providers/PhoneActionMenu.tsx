import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Mode = "call" | "whatsapp";

interface Props {
  mode: Mode;
  numbers: string[];
  /** Built once for WhatsApp prefills. */
  message?: string;
  hrefFor: (number: string) => string;
  className?: string;
  children: ReactNode;
}

/**
 * Single number → direct link button.
 * Multiple → dropdown to pick which number.
 */
export function PhoneActionMenu({
  mode,
  numbers,
  hrefFor,
  className,
  children,
}: Props) {
  if (numbers.length === 0) return null;

  if (numbers.length === 1) {
    return (
      <Button asChild size="sm" className={cn("h-10 w-full", className)} variant={mode === "call" ? "default" : "outline"}>
        <a href={hrefFor(numbers[0]!)} target={mode === "whatsapp" ? "_blank" : undefined} rel="noreferrer">
          {children}
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={mode === "call" ? "default" : "outline"}
          className={cn("h-10 w-full", className)}
        >
          {children}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem]">
        {numbers.map((number) => (
          <DropdownMenuItem key={number} asChild>
            <a
              href={hrefFor(number)}
              target={mode === "whatsapp" ? "_blank" : undefined}
              rel="noreferrer"
              className="cursor-pointer"
              dir="ltr"
            >
              {number}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
