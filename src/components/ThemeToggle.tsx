import { useThemePref, type ThemePref } from "../lib/theme";

const OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "System", icon: "🖥️" },
];

/**
 * Appearance control wired to the shared theme store.
 *  - `full`: a labeled card with a Light / Dark / System segmented control
 *    (used on the profile page).
 *  - `compact`: a single header button that cycles the three modes.
 */
export function ThemeToggle({
  variant = "full",
  testId = variant === "full" ? "theme-toggle-profile" : "theme-toggle",
}: {
  variant?: "compact" | "full";
  testId?: string;
}) {
  const [pref, setPref] = useThemePref();

  if (variant === "compact") {
    const order: ThemePref[] = ["light", "dark", "system"];
    const current = OPTIONS.find((o) => o.value === pref) ?? OPTIONS[2];
    const next = order[(order.indexOf(pref) + 1) % order.length];
    return (
      <button
        type="button"
        data-testid={testId}
        onClick={() => setPref(next)}
        title={`Theme: ${current.label} (tap for ${next})`}
        aria-label={`Theme: ${current.label}. Switch to ${next}.`}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <span aria-hidden>{current.icon}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700/70">
      <div className="min-w-0">
        <p className="font-semibold text-ink dark:text-slate-100">Appearance</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose a light or dark theme, or follow your device.
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="flex shrink-0 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700/70"
      >
        {OPTIONS.map((o) => {
          const active = pref === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              data-testid={`${testId}-${o.value}`}
              onClick={() => setPref(o.value)}
              className={[
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition",
                active
                  ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:text-white dark:ring-slate-600"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              ].join(" ")}
            >
              <span aria-hidden>{o.icon}</span>
              <span className="hidden sm:inline">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
