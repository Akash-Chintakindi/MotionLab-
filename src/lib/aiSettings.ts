// Single source of truth for the global "AI questions" toggle. AI is OFF by
// default; when off, practice surfaces draw exclusively from the static
// question bank and make no network calls. State is persisted to localStorage
// and shared live across the app via a tiny subscription.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "motionlab.aiEnabled";

/** Subscribers notified whenever the flag changes (in this tab or another). */
const listeners = new Set<() => void>();

/** Guarded localStorage access — returns null when storage is unavailable (SSR). */
function readStorage(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Ignore quota/availability errors; the in-memory listeners still fire.
  }
}

/** Non-React getter. Reads localStorage; defaults to FALSE. */
export function isAiEnabled(): boolean {
  return readStorage() === "true";
}

/** Persist the flag and notify all subscribers so the UI updates live. */
export function setAiEnabled(enabled: boolean): void {
  writeStorage(enabled ? "true" : "false");
  for (const listener of listeners) listener();
}

// Cross-tab sync: a change in another tab fires a `storage` event here.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      for (const listener of listeners) listener();
    }
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * React hook returning `[enabled, setEnabled]`. Subscribes to the shared store
 * so every component re-renders the moment the flag flips anywhere in the app.
 */
export function useAiEnabled(): [boolean, (v: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, isAiEnabled, () => false);
  return [enabled, setAiEnabled];
}
