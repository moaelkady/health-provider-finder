import { createFileRoute } from "@tanstack/react-router";

import { ProviderListSkeleton } from "@/components/common/States";
import { DirectoryPage } from "@/components/providers/DirectoryPage";

export const Route = createFileRoute("/_app/providers/")({
  component: ProvidersPage,
  pendingComponent: () => <ProviderListSkeleton count={6} />,
  pendingMs: 150,
  head: () => ({
    meta: [
      { title: "دليل مقدمي الخدمة" },
      {
        name: "description",
        content:
          "ابحث عن المستشفيات والعيادات ومراكز الأسنان والصيدليات والمعامل ضمن شبكة مقدمي الخدمة.",
      },
    ],
  }),
});

function ProvidersPage() {
  return <DirectoryPage />;
}
