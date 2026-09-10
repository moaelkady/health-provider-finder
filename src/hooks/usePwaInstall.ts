import { useCallback, useEffect, useState } from "react";

import {
  beginInstallPromptCapture,
  getDeferredInstallPrompt,
  isIosDevice,
  isPwaStandalone,
  promptPwaInstall,
  subscribeInstallPrompt,
} from "@/lib/pwa-install";

export function usePwaInstall() {
  const [standalone, setStandalone] = useState(false);
  const [ready, setReady] = useState(false);
  const [ios, setIos] = useState(false);
  const [canNativePrompt, setCanNativePrompt] = useState(false);

  useEffect(() => {
    beginInstallPromptCapture();
    setStandalone(isPwaStandalone());
    setIos(isIosDevice());
    setCanNativePrompt(getDeferredInstallPrompt() != null);
    setReady(true);

    const onDisplayMode = () => setStandalone(isPwaStandalone());
    const media = window.matchMedia("(display-mode: standalone)");
    media.addEventListener?.("change", onDisplayMode);

    const unsubscribe = subscribeInstallPrompt(() => {
      setCanNativePrompt(getDeferredInstallPrompt() != null);
      setStandalone(isPwaStandalone());
    });

    return () => {
      media.removeEventListener?.("change", onDisplayMode);
      unsubscribe();
    };
  }, []);

  const promptInstall = useCallback(async () => {
    return promptPwaInstall();
  }, []);

  return {
    ready,
    standalone,
    ios,
    canNativePrompt,
    showInstall: ready && !standalone,
    promptInstall,
  };
}
