import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { ProviderCard } from "@/components/providers/ProviderCard";
import type { Provider } from "@/types/provider";

const ESTIMATE_ROW_PX = 300;

interface Props {
  providers: Provider[];
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  /** Optional distances by provider id (nearby mode). */
  distances?: Map<string, number> | undefined;
}

/** Column count from the list container width (not the viewport). */
function columnsForWidth(width: number): number {
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

function useGridColumns(containerRef: React.RefObject<HTMLElement | null>) {
  const [columns, setColumns] = useState(1);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => {
      setColumns(columnsForWidth(node.clientWidth));
    };
    update();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [containerRef]);

  return columns;
}

/**
 * Window-virtualized provider grid — keeps DOM bounded for thousands of results.
 */
export function ProviderList({
  providers,
  favoriteIds,
  onToggleFavorite,
  distances,
}: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const columns = useGridColumns(listRef);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [isExtending, setIsExtending] = useState(false);

  const rows = useMemo(() => {
    const chunks: Provider[][] = [];
    for (let i = 0; i < providers.length; i += columns) {
      chunks.push(providers.slice(i, i + columns));
    }
    return chunks;
  }, [providers, columns]);

  useLayoutEffect(() => {
    const node = listRef.current;
    if (!node) return;
    setScrollMargin(node.offsetTop);
  }, [providers.length, columns]);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => ESTIMATE_ROW_PX,
    overscan: 4,
    scrollMargin,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    if (virtualItems.length === 0) return;
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    const nearEnd = last.index >= rows.length - 3 && rows.length > 6;
    setIsExtending(nearEnd);
  }, [virtualItems, rows.length]);

  useEffect(() => {
    virtualizer.scrollToIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when result set identity changes
  }, [providers]);

  return (
    <div ref={listRef}>
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualRow) => {
          const row = rows[virtualRow.index] ?? [];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute start-0 top-0 w-full"
              style={{
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              }}
            >
              <div
                className="grid gap-3 pb-3"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {row.map((provider) => {
                  const distanceKm = distances?.get(provider.id);
                  const withDistance =
                    distanceKm === undefined
                      ? provider
                      : {
                          ...provider,
                          location: { ...provider.location, distanceKm },
                        };
                  return (
                    <ProviderCard
                      key={provider.id}
                      provider={withDistance}
                      isFavorite={favoriteIds.has(provider.id)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {isExtending && virtualItems.length > 0 ? (
        <div className="sr-only" aria-live="polite">
          جاري تحميل المزيد
        </div>
      ) : null}
    </div>
  );
}
