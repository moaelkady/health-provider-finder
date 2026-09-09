/// <reference lib="webworker" />

import type { PrecacheEntry } from "workbox-precaching";

declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: Array<string | PrecacheEntry>;
  }
}

export {};
