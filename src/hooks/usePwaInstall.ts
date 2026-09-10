import { useCallback, useEffect, useState } from "react";

import {
  beginInstallPromptCapture,
  getDeferredInstallPrompt,
  isIosDevice,
  isMacSafari,
  isPwaKnownInstalled,
  isPwaStandalone,
  markPwaInstalled,
  promptPwaInstall,
  subscribeInstallPrompt,
} from "@/lib/pwa-install";

export function usePwaInstall() {
  const [standalone, setStandalone] = useState(false);
  const [ready, setReady] = useState(false);
  const [ios, setIos] = useState(false);
  const [macSafari, setMacSafari] = useState(false);
  const [knownInstalled, setKnownInstalled] = useState(false);
  const [canNativePrompt, setCanNativePrompt] = useState(false);

  const sync = useCallback(() => {
    const nextStandalone = isPwaStandalone();
    if (nextStandalone) {
      markPwaInstalled();
    }
    setStandalone(nextStandalone);
    setKnownInstalled(isPwaKnownInstalled());
    setCanNativePrompt(getDeferredInstallPrompt() != null);
  }, []);

  useEffect(() => {
    beginInstallPromptCapture();
    setIos(isIosDevice());
    setMacSafari(isMacSafari());
    sync();
    setReady(true);

    const onDisplayMode = () => sync();
    const mediaQueries = [
      window.matchMedia("(display-mode: standalone)"),
      window.matchMedia("(display-mode: window-controls-overlay)"),
      window.matchMedia("(display-mode: fullscreen)"),
      window.matchMedia("(display-mode: minimal-ui)"),
    ];
    for (const media of mediaQueries) {
      media.addEventListener?.("change", onDisplayMode);
    }

    const unsubscribe = subscribeInstallPrompt(sync);

    return () => {
      for (const media of mediaQueries) {
        media.removeEventListener?.("change", onDisplayMode);
      }
      unsubscribe();
    };
  }, [sync]);

  const promptInstall = useCallback(async () => {
    return promptPwaInstall();
  }, []);

  const showInstall =
    ready &&
    !standalone &&
    !knownInstalled &&
    (ios || macSafari || canNativePrompt);

  return {
    ready,
    standalone,
    ios,
    macSafari,
    knownInstalled,
    canNativePrompt,
    showInstall,
    promptInstall,
  };
}
