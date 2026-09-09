import { cn } from "@/lib/utils";
import type { Service, Specialty } from "@/types/provider";

function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-1 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ServiceTags({ services, max }: { services: Service[]; max?: number }) {
  if (!services.length) return <span className="text-xs text-muted-foreground">—</span>;
  const shown = max ? services.slice(0, max) : services;
  const rest = services.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <Tag key={s.id}>{s.name}</Tag>
      ))}
      {rest > 0 && <Tag>+{rest} more</Tag>}
    </div>
  );
}

export function SpecialtyTags({ specialties, max }: { specialties: Specialty[]; max?: number }) {
  if (!specialties.length)
    return <span className="text-xs text-muted-foreground">No specialties listed</span>;
  const shown = max ? specialties.slice(0, max) : specialties;
  const rest = specialties.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <Tag key={s.id} className="border-primary/20 bg-primary/5 text-primary">
          {s.name}
        </Tag>
      ))}
      {rest > 0 && <Tag>+{rest}</Tag>}
    </div>
  );
}
