import type { ReactNode } from "react";
import { AlertTriangle, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <SearchX className="size-6" />}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">حدث خطأ ما</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        تعذر تحميل مقدمي الرعاية الصحية. يرجى المحاولة مرة أخرى.
      </p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

export function ProviderCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/3" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-20 rounded-md" />
        <Skeleton className="h-6 w-24 rounded-md" />
      </div>
      <div className="mt-5 flex gap-2 border-t border-border pt-4">
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
    </div>
  );
}

export function ProviderListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProviderCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProviderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <Skeleton className="h-7 w-1/2" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}
