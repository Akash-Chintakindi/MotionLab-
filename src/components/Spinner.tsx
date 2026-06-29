export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500 dark:border-slate-700 dark:border-t-brand-400"
        role="status"
        aria-label={label}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
