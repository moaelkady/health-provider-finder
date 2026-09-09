import { useState } from "react";

import { SosEmergencySheet } from "@/components/sos/SosEmergencySheet";
import { cn } from "@/lib/utils";

export function SosButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-9 min-w-14 items-center justify-center rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-sm font-bold tracking-wide text-red-700 shadow-sm transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300",
          className,
        )}
        aria-label="طوارئ SOS"
      >
        SOS
      </button>
      <SosEmergencySheet open={open} onOpenChange={setOpen} />
    </>
  );
}
