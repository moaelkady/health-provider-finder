import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  EmptyState,
  ErrorState,
  ProviderDetailSkeleton,
} from "@/components/common/States";
import { ProviderDetail } from "@/components/providers/ProviderDetail";
import { Button } from "@/components/ui/button";
import { providersQueryOptions } from "@/data/provider-repository";
import { useFavorites } from "@/hooks/useFavorites";

export const Route = createFileRoute("/_app/providers/$providerId")({
  component: ProviderDetailPage,
  pendingComponent: () => <ProviderDetailSkeleton />,
  pendingMs: 150,
  head: () => ({
    meta: [{ title: "مقدم الخدمة" }],
  }),
});

function ProviderDetailPage() {
  const { providerId } = Route.useParams();
  const { data, isLoading, isError, refetch } = useQuery(providersQueryOptions);
  const { isFavorite, toggleFavorite } = useFavorites();

  if (isLoading) return <ProviderDetailSkeleton />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const provider = data.find((p) => p.id === providerId);
  if (!provider) {
    return (
      <EmptyState
        title="مقدم الخدمة غير موجود"
        description="قد يكون هذا المقدم قد أُزيل من دليل الشبكة."
        action={
          <Button asChild className="h-11">
            <Link to="/providers">العودة إلى الدليل</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ProviderDetail
      provider={provider}
      isFavorite={isFavorite(provider.id)}
      onToggleFavorite={toggleFavorite}
    />
  );
}
