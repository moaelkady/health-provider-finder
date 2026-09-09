/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request, url }) =>
    request.mode === "navigate" && url.origin === self.location.origin,
  async (options) => {
    try {
      return await new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 3,
      }).handle(options);
    } catch {
      const cached = await caches.match("/offline.html", { ignoreSearch: true });
      return cached ?? Response.error();
    }
  },
);

registerRoute(
  ({ url }) => url.pathname.startsWith("/data/generated/"),
  new CacheFirst({
    cacheName: "provider-data",
  }),
);
