import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder, className }: Props) {
  return (
    <div className={className ? `relative ${className}` : "relative"}>
      <Search className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground sm:start-4" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          placeholder ?? "ابحث بالاسم أو التخصص أو المنطقة أو العنوان"
        }
        aria-label="البحث عن مقدمي الخدمة"
        className="h-12 w-full rounded-xl border border-border bg-card pe-10 ps-11 text-base text-foreground shadow-card outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-4 focus:ring-primary/10 sm:h-12 sm:ps-12"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="مسح البحث"
          className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
