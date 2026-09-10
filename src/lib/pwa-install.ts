/**
 * Detect installed PWA vs browser, and capture the Chromium install prompt early
 * so we do not miss `beforeinstallprompt` before React mounts.
 */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALLED_STORAGE_KEY = "hpd.pwa.installed.v1";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let captureStarted = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function isPwaKnownInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INSTALLED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPwaInstalled(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(INSTALLED_STORAGE_KEY) === "1") return;
    window.localStorage.setItem(INSTALLED_STORAGE_KEY, "1");
  } catch {
    return;
  }
  notify();
}

export function clearPwaInstalled(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(INSTALLED_STORAGE_KEY) == null) return;
    window.localStorage.removeItem(INSTALLED_STORAGE_KEY);
  } catch {
    return;
  }
  notify();
}

/** Call once on the client (idempotent). */
export function beginInstallPromptCapture() {
  if (typeof window === "undefined" || captureStarted) return;
  captureStarted = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    // Browser is offering install again → treat as not installed.
    clearPwaInstalled();
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    markPwaInstalled();
    notify();
  });

  if (isPwaStandalone()) {
    markPwaInstalled();
  }
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function promptPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferredPrompt;
  if (!event) return "unavailable";
  deferredPrompt = null;
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") {
    markPwaInstalled();
  }
  return outcome;
}

export function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mediaStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mediaStandalone || iosStandalone;
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Desktop Safari on Mac (not iPhone/iPad, not Chrome/Chromium). */
export function isMacSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isIosDevice()) return false;
  const ua = navigator.userAgent;
  const isMac = /Macintosh|Mac OS X/.test(ua);
  if (!isMac) return false;
  // Safari includes Version/… and Safari/…; Chromium also contains Safari but adds Chrome/CriOS/Edg.
  const isSafari = /Safari\//.test(ua) && !/Chrome\/|CriOS\/|Edg\/|Chromium\//.test(ua);
  return isSafari;
}
