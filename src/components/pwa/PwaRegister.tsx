import { useEffect } from "react";
import { toast } from "sonner";

const RELOAD_FLAG = "pwa-sw-reload";

/**
 * Registers the service worker and prompts when a new version is waiting.
 * Client-only — safe to mount under RootComponent.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    let refreshing = false;

    const onControllerChange = () => {
      if (refreshing) return;
      if (sessionStorage.getItem(RELOAD_FLAG) === "1") {
        sessionStorage.removeItem(RELOAD_FLAG);
        return;
      }
      refreshing = true;
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        if (cancelled) return;

        const promptUpdate = (worker: ServiceWorker) => {
          toast("تحديث متاح — اضغط للتحديث", {
            duration: Infinity,
            action: {
              label: "تحديث",
              onClick: () => {
                worker.postMessage({ type: "SKIP_WAITING" });
                worker.addEventListener("statechange", () => {
                  if (worker.state === "activated") {
                    window.location.reload();
                  }
                });
              },
            },
          });
        };

        if (registration.waiting) {
          promptUpdate(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              promptUpdate(worker);
            }
          });
        });
      } catch (error) {
        console.warn("[pwa] service worker registration failed", error);
      }
    })();

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
