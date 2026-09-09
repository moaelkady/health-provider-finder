import { X } from "lucide-react";

import type { ProviderFilters } from "@/types/provider";

type FacetKey = Exclude<keyof ProviderFilters, "query">;

const LABELS: Record<FacetKey, string> = {
  types: "النوع",
  specialties: "التخصص",
  governorates: "المحافظة",
  areas: "المنطقة",
  networks: "الشبكة",
  services: "الخدمة",
};

interface Props {
  filters: ProviderFilters;
  onRemove: (key: FacetKey, value: string) => void;
  onClear: () => void;
}

export function FilterChips({ filters, onRemove, onClear }: Props) {
  const entries = (Object.keys(LABELS) as FacetKey[]).flatMap((key) =>
    (filters[key] as string[]).map((value) => ({ key, value })),
  );

  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {entries.map(({ key, value }) => (
        <button
          key={`${key}-${value}`}
          type="button"
          onClick={() => onRemove(key, value)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <span className="text-muted-foreground">{LABELS[key]}:</span>
          {value}
          <X className="size-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
      >
        مسح التصفية
      </button>
    </div>
  );
}
