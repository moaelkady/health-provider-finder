import { createFileRoute } from "@tanstack/react-router";

import { DirectoryPage } from "@/components/providers/DirectoryPage";

export const Route = createFileRoute("/_app/providers/")({
  component: ProvidersPage,
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
