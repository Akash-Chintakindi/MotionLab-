import { useState } from "react";
import type { SortConfig } from "../../types/content";
import { PositionTimeGraph } from "../graph/PositionTimeGraph";
import type { StepComponentProps } from "./types";

export function SortStep({
  step,
  locked,
  prefillCorrect,
  onAnswer,
}: StepComponentProps) {
  const cfg = step.interactionConfig as SortConfig;
  const answer = step.correctAnswer as Record<string, string>;
  const [assignment, setAssignment] = useState<Record<string, string>>(
    prefillCorrect ? { ...answer } : {},
  );

  const allAssigned = cfg.items.every((it) => assignment[it.id]);

  function assign(itemId: string, bucketId: string) {
    if (locked) return;
    setAssignment((prev) => ({ ...prev, [itemId]: bucketId }));
  }

  function check() {
    if (locked || !allAssigned) return;
    const correct = cfg.items.every(
      (it) => assignment[it.id] === answer[it.id],
    );
    onAnswer(correct);
  }

  return (
    <div className="space-y-4">
      {cfg.graph && <PositionTimeGraph config={cfg.graph} mode="static" />}
      <div className="space-y-3">
        {cfg.items.map((item) => {
          const chosen = assignment[item.id];
          const isRight = locked && chosen === answer[item.id];
          const isWrong = locked && chosen !== answer[item.id];
          return (
            <div
              key={item.id}
              className={[
                "rounded-xl border p-3",
                isRight
                  ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10"
                  : isWrong
                    ? "border-red-300 bg-red-50 dark:bg-red-500/10"
                    : "border-slate-200 bg-white dark:border-slate-700/70 dark:bg-slate-900",
              ].join(" ")}
            >
              <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {item.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {cfg.buckets.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    disabled={locked}
                    onClick={() => assign(item.id, b.id)}
                    className={[
                      "rounded-lg border px-3 py-1.5 text-sm transition",
                      chosen === b.id
                        ? "border-brand-400 bg-brand-50 font-medium dark:bg-brand-500/10"
                        : "border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700/70 dark:bg-slate-900",
                    ].join(" ")}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!locked && (
        <button
          type="button"
          onClick={check}
          disabled={!allAssigned}
          className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          Check answer
        </button>
      )}
    </div>
  );
}
