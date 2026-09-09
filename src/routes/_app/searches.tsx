import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bookmark, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/common/States";
import { writePendingSearch } from "@/components/providers/DirectoryPage";
import { Button } from "@/components/ui/button";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { countActiveFilters } from "@/lib/provider-search";

export const Route = createFileRoute("/_app/searches")({
  component: SearchesPage,
  head: () => ({
    meta: [
      { title: "عمليات البحث" },
      {
        name: "description",
        content: "عمليات البحث المحفوظة في دليل مقدمي الخدمة.",
      },
    ],
  }),
});

function SearchesPage() {
  const { searches, removeSearch } = useSavedSearches();
  const navigate = useNavigate();

  const applySearch = (filters: (typeof searches)[number]["filters"]) => {
    writePendingSearch(filters);
    void navigate({ to: "/providers" });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          عمليات البحث
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          أعد تشغيل عمليات البحث التي حفظتها من الدليل.
        </p>
      </div>

      {searches.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="size-6" />}
          title="لا توجد عمليات بحث محفوظة بعد"
          description="طبّق عوامل التصفية في الدليل ثم اختر «حفظ البحث» لتظهر هنا."
          action={
            <Button className="h-11" onClick={() => void navigate({ to: "/providers" })}>
              الذهاب إلى الدليل
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {searches.map((search) => {
            const active = countActiveFilters(search.filters);
            return (
              <li
                key={search.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{search.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {search.filters.query ? `«${search.filters.query}» · ` : ""}
                    {active.toLocaleString("ar-EG")} عامل تصفية ·{" "}
                    {new Date(search.createdAt).toLocaleDateString("ar-EG")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-10 flex-1 sm:flex-none"
                    onClick={() => applySearch(search.filters)}
                  >
                    تطبيق
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10"
                    aria-label="حذف عملية البحث"
                    onClick={() => removeSearch(search.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
