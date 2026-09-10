export const THEME_STORAGE_KEY = "hpd.theme.v1";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_COLOR_LIGHT = "#2d6b7a";
export const THEME_COLOR_DARK = "#1a2228";

const PREFS = new Set<ThemePreference>(["light", "dark", "system"]);

type ThemeListener = () => void;
const listeners = new Set<ThemeListener>();

export function subscribeTheme(listener: ThemeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyThemeListeners() {
  listeners.forEach((listener) => listener());
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && PREFS.has(value as ThemePreference);
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") return getSystemTheme();
  return preference;
}

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

export function setThemePreference(preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
  notifyThemeListeners();
}

export function applyThemeClass(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");

  const color = resolved === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = color;
    document.head.appendChild(meta);
    return;
  }
  metas.forEach((meta) => {
    meta.setAttribute("content", color);
  });
}

/** Blocking inline script — keep in sync with THEME_STORAGE_KEY / resolve rules. */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);var c=d?${JSON.stringify(THEME_COLOR_DARK)}:${JSON.stringify(THEME_COLOR_LIGHT)};var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",c);}catch(e){}})();`;
