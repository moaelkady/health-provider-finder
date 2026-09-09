import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { providersQueryOptions } from "@/data/provider-repository";

export const Route = createFileRoute("/_app")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(providersQueryOptions);
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
