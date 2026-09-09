import { cn } from "@/lib/utils";
import type { NetworkTier, ProviderStatus } from "@/types/provider";

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function ProviderStatusBadge({
  status,
  className,
}: {
  status: ProviderStatus;
  className?: string;
}) {
  const tone =
    status === "نشط"
      ? "border-success/25 bg-success/10 text-success"
      : status === "قيد التفعيل"
        ? "border-warning/30 bg-warning/10 text-warning"
        : "border-destructive/25 bg-destructive/10 text-destructive";

  return (
    <span className={cn(base, tone, className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}

export function NetworkBadge({
  network,
  className,
}: {
  network: NetworkTier;
  className?: string;
}) {
  const tone =
    network === "الشبكة المفضلة"
      ? "border-primary/25 bg-primary/10 text-primary"
      : network === "ضمن الشبكة"
        ? "border-border bg-muted text-muted-foreground"
        : "border-destructive/25 bg-destructive/5 text-destructive";

  return <span className={cn(base, tone, className)}>{network}</span>;
}

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <span className={cn(base, "border-border bg-card text-foreground/80", className)}>{type}</span>
  );
}
