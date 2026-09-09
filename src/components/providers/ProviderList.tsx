import { useEffect, useRef, useState } from "react";

import type { Provider } from "@/types/provider";
import { ProviderCard } from "./ProviderCard";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 24;

interface Props {
  providers: Provider[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

/**
 * Renders results in incremental pages so the list stays fast with tens of
 * thousands of records.
 */
export function ProviderList({ providers, isFavorite, onToggleFavorite }: Props) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [providers]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisible((v) => Math.min(v + PAGE_SIZE, providers.length));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [providers.length]);

  const shown = providers.slice(0, visible);

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isFavorite={isFavorite(provider.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
      {visible < providers.length && (
        <div ref={sentinel} className="mt-6 flex justify-center">
          <Button variant="outline" className="h-11 w-full sm:w-auto" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            تحميل المزيد
          </Button>
        </div>
      )}
    </div>
  );
}
