import { useCallback, useEffect, useState } from "react";

import {
  applyThemeClass,
  getThemePreference,
  resolveTheme,
  setThemePreference as persistThemePreference,
  subscribeTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  const [ready, setReady] = useState(false);

  const syncFromStorage = useCallback(() => {
    const next = getThemePreference();
    const resolvedNext = resolveTheme(next);
    setPreferenceState(next);
    setResolved(resolvedNext);
    applyThemeClass(resolvedNext);
    setReady(true);
  }, []);

  useEffect(() => {
    syncFromStorage();

    const unsubscribe = subscribeTheme(syncFromStorage);

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        syncFromStorage();
      }
    };
    window.addEventListener("storage", onStorage);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      if (getThemePreference() === "system") {
        syncFromStorage();
      }
    };
    media.addEventListener?.("change", onScheme);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
      media.removeEventListener?.("change", onScheme);
    };
  }, [syncFromStorage]);

  const setPreference = useCallback((next: ThemePreference) => {
    const resolvedNext = resolveTheme(next);
    applyThemeClass(resolvedNext);
    setPreferenceState(next);
    setResolved(resolvedNext);
    persistThemePreference(next);
  }, []);

  /** Header control: flip to the opposite of current resolved theme (explicit light/dark). */
  const toggleResolved = useCallback(() => {
    const next: ThemePreference = resolved === "dark" ? "light" : "dark";
    setPreference(next);
  }, [resolved, setPreference]);

  return { preference, resolved, ready, setPreference, toggleResolved };
}
