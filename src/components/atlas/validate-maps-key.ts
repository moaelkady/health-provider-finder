import {
  ensureAtlasMapsOptions,
  loadAtlasMapsLibrary,
} from "@/components/atlas/atlas-maps-loader";

const VALIDATE_TIMEOUT_MS = 12000;
/** Auth failure can arrive after the first `idle`. */
const AUTH_GRACE_MS = 3000;

export type ValidateMapsKeyResult = "ok" | "fail";

/** Ignore superseded runs (React Strict Mode double-mount / rapid retries). */
let validateSeq = 0;

function normalizeMapsKey(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^key=/i, "")
    .trim();
}

/** Browser Maps keys are `AIza…` — reject obvious garbage before loading the API. */
function looksLikeMapsBrowserKey(key: string): boolean {
  return /^AIza[0-9A-Za-z_-]{20,}$/.test(key);
}

function probeHasMapsError(container: HTMLElement | null): boolean {
  return Boolean(container?.querySelector(".gm-err-container"));
}

/**
 * Prove a Maps JS key can load a map before revealing Atlas.
 *
 * `idle` alone is not enough — wait a short grace for auth failure / error UI.
 * Concurrent calls: only the latest run's result matters; older runs clean up safely.
 */
export async function validateMapsKey(apiKey: string): Promise<ValidateMapsKeyResult> {
  const key = normalizeMapsKey(apiKey);
  if (!key || !looksLikeMapsBrowserKey(key)) return "fail";

  const runId = ++validateSeq;

  let settled = false;
  let probeMap: google.maps.Map | null = null;
  let container: HTMLDivElement | null = null;
  let idleListener: google.maps.MapsEventListener | null = null;
  let timeoutId = 0;
  let graceId = 0;
  let observer: MutationObserver | null = null;

  type AuthWindow = Window & { gm_authFailure?: (() => void) | undefined };
  const authWindow = window as AuthWindow;
  const previousAuthFailure = authWindow.gm_authFailure;
  const originalWarn = console.warn.bind(console);

  const isCurrent = () => runId === validateSeq;

  const onAuthFailure = () => {
    previousAuthFailure?.();
    finish("fail");
  };

  const onWarn: typeof console.warn = (...args: unknown[]) => {
    const text = args.map(String).join(" ");
    if (/Google Maps JavaScript API warning:\s*InvalidKey\b/i.test(text)) {
      finish("fail");
    }
    originalWarn(...args);
  };

  const cleanup = () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = 0;
    }
    if (graceId) {
      window.clearTimeout(graceId);
      graceId = 0;
    }
    if (idleListener) {
      idleListener.remove();
      idleListener = null;
    }
    observer?.disconnect();
    observer = null;
    probeMap = null;
    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    // Only restore globals we still own (don't clobber a newer validation run).
    if (console.warn === onWarn) {
      console.warn = originalWarn;
    }
    if (authWindow.gm_authFailure === onAuthFailure) {
      if (previousAuthFailure) {
        authWindow.gm_authFailure = previousAuthFailure;
      } else {
        delete authWindow.gm_authFailure;
      }
    }
  };

  let resolvePromise!: (result: ValidateMapsKeyResult) => void;
  const promise = new Promise<ValidateMapsKeyResult>((resolve) => {
    resolvePromise = resolve;
  });

  const finish = (result: ValidateMapsKeyResult) => {
    if (settled) return;
    settled = true;
    cleanup();
    // Stale runs still resolve so awaiters unblock; callers should ignore if superseded.
    resolvePromise(isCurrent() ? result : "fail");
  };

  authWindow.gm_authFailure = onAuthFailure;
  console.warn = onWarn;
  timeoutId = window.setTimeout(() => finish("fail"), VALIDATE_TIMEOUT_MS);

  void (async () => {
    try {
      if (!isCurrent()) {
        finish("fail");
        return;
      }

      ensureAtlasMapsOptions(key);
      const { Map } = await loadAtlasMapsLibrary();

      if (!isCurrent()) {
        finish("fail");
        return;
      }

      container = document.createElement("div");
      container.setAttribute("aria-hidden", "true");
      container.style.cssText =
        "position:fixed;left:0;top:0;width:120px;height:120px;opacity:0.02;pointer-events:none;z-index:-1;overflow:hidden;";
      document.body.appendChild(container);

      observer = new MutationObserver(() => {
        if (probeHasMapsError(container)) finish("fail");
      });
      observer.observe(container, { childList: true, subtree: true });

      probeMap = new Map(container, {
        center: { lat: 30.0444, lng: 31.2357 },
        zoom: 8,
        disableDefaultUI: true,
        keyboardShortcuts: false,
        gestureHandling: "none",
        clickableIcons: false,
      });

      idleListener = probeMap.addListener("idle", () => {
        if (settled || !isCurrent()) return;
        if (probeHasMapsError(container)) {
          finish("fail");
          return;
        }
        if (graceId) window.clearTimeout(graceId);
        graceId = window.setTimeout(() => {
          if (settled || !isCurrent()) return;
          if (probeHasMapsError(container)) {
            finish("fail");
            return;
          }
          finish("ok");
        }, AUTH_GRACE_MS);
      });
    } catch {
      finish("fail");
    }
  })();

  return promise;
}
