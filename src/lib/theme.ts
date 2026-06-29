// Single source of truth for the UI color theme. The preference is one of
// "light" | "dark" | "system"; "system" follows the OS color-scheme live.
// State is persisted to localStorage and shared across the app via a tiny
// subscription (mirrors lib/aiSettings.ts). Applying the theme toggles the
// `dark` class on <html> (Tailwind's class strategy) so every `dark:` variant
// activates. A matching inline script in index.html applies the class before
// first paint to avoid a flash of the wrong theme.

import { useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "motionlab.theme";

const listeners = new Set<() => void>();

function readStorage(): ThemePref {
  try {
    if (typeof localStorage === "undefined") return "system";
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

function writeStorage(value: ThemePref): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Ignore quota/availability errors; in-memory listeners still fire.
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

/** Non-React getter for the stored preference. Defaults to "system". */
export function getThemePref(): ThemePref {
  return readStorage();
}

/** The concrete light/dark theme a preference resolves to right now. */
export function resolveTheme(pref: ThemePref = readStorage()): ResolvedTheme {
  return pref === "system" ? (systemPrefersDark() ? "dark" : "light") : pref;
}

/** Apply the resolved theme to <html> + the address-bar color. */
function applyTheme(pref: ThemePref): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#0b1220" : "#f5f7fb");
}

function notify(): void {
  for (const listener of listeners) listener();
}

/** Persist the preference, apply it, and notify subscribers so UI updates live. */
export function setThemePref(pref: ThemePref): void {
  writeStorage(pref);
  applyTheme(pref);
  notify();
}

/** Re-apply the stored preference. Call once on startup (from main.tsx). */
export function initTheme(): void {
  applyTheme(readStorage());
}

if (typeof window !== "undefined") {
  // Follow OS changes while the preference is "system".
  if (typeof window.matchMedia === "function") {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readStorage() === "system") {
        applyTheme("system");
        notify();
      }
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onSystemChange);
    }
  }
  // Cross-tab sync.
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      applyTheme(readStorage());
      notify();
    }
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook returning `[pref, setPref]` for the Light/Dark/System control. */
export function useThemePref(): [ThemePref, (v: ThemePref) => void] {
  const pref = useSyncExternalStore(subscribe, getThemePref, () => "system" as ThemePref);
  return [pref, setThemePref];
}

/** React hook returning the resolved "light" | "dark" theme in effect. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    () => resolveTheme(),
    () => "light" as ResolvedTheme,
  );
}
