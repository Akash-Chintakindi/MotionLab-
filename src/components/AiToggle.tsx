import { useAiEnabled } from "../lib/aiSettings";

const HELPER =
  "On = fresh AI-generated questions; Off = curated question bank.";

/**
 * Global "AI questions" switch, wired to the shared `useAiEnabled` store so it
 * reflects and persists state live across the app. Defaults to OFF.
 *  - `compact`: a small inline switch for the header.
 *  - `full`: a labeled card with helper text for the profile page.
 */
export function AiToggle({
  variant = "compact",
  testId = variant === "full" ? "ai-toggle-profile" : "ai-toggle",
}: {
  variant?: "compact" | "full";
  testId?: string;
}) {
  const [enabled, setEnabled] = useAiEnabled();

  const Switch = (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      data-testid={testId}
      onClick={() => setEnabled(!enabled)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        enabled ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
          enabled ? "translate-x-5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );

  if (variant === "compact") {
    return (
      <label
        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        title={HELPER}
      >
        <span className="hidden sm:inline">AI questions</span>
        <span className="sm:hidden">AI</span>
        {Switch}
      </label>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700/70">
      <div className="min-w-0">
        <p className="font-semibold text-ink dark:text-slate-100">AI questions</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{HELPER}</p>
      </div>
      {Switch}
    </div>
  );
}
