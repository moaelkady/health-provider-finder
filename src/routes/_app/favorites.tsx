import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useMemo } from "react";

import {
  EmptyState,
  ErrorState,
  ProviderListSkeleton,
} from "@/components/common/States";
import { ProviderList } from "@/components/providers/ProviderList";
import { Button } from "@/components/ui/button";
import { providersQueryOptions } from "@/data/provider-repository";
import { useFavorites } from "@/hooks/useFavorites";

export const Route = createFileRoute("/_app/favorites")({
  component: FavoritesPage,
  pendingComponent: () => <ProviderListSkeleton count={6} />,
  pendingMs: 150,
  head: () => ({
    meta: [
      { title: "المفضلة" },
      {
        name: "description",
        content: "مقدمو الخدمة الذين حفظتهم للوصول السريع.",
      },
    ],
  }),
});

function FavoritesPage() {
  const { data, isLoading, isError, refetch } = useQuery(providersQueryOptions);
  const { favorites, favoriteIds, toggleFavorite } = useFavorites();

  const saved = useMemo(() => {
    if (!data) return [];
    const set = new Set(favorites);
    return data.filter((p) => set.has(p.id));
  }, [data, favorites]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          المفضلة
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مقدمو الخدمة الذين حفظتهم للوصول السريع.
        </p>
      </div>

      {isLoading && <ProviderListSkeleton count={6} />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && saved.length === 0 && (
        <EmptyState
          icon={<Heart className="size-6" />}
          title="لم تحفظ أي مقدم خدمة بعد."
          description="تصفح الدليل واضغط على أيقونة القلب لحفظ مقدمي الخدمة الذين تحتاجهم."
          action={
            <Button asChild className="h-11">
              <Link to="/providers">تصفح دليل مقدمي الخدمة</Link>
            </Button>
          }
        />
      )}
      {!isLoading && !isError && saved.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {saved.length.toLocaleString("ar-EG")}
            </span>{" "}
            مقدم خدمة محفوظ
          </p>
          <ProviderList
            providers={saved}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        </>
      )}
    </div>
  );
}
