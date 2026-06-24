import { useState, type FormEvent } from "react";
import type { NumericConfig } from "../../types/content";
import { PositionTimeGraph } from "../graph/PositionTimeGraph";
import { StaticPlot } from "../graph/StaticPlot";
import type { StepComponentProps } from "./types";

export function NumericStep({
  step,
  locked,
  prefillCorrect,
  onAnswer,
}: StepComponentProps) {
  const cfg = step.interactionConfig as NumericConfig;
  const target = (step.correctAnswer as { value: number }).value;
  const [value, setValue] = useState(prefillCorrect ? String(target) : "");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      onAnswer(false);
      return;
    }
    onAnswer(Math.abs(parsed - target) <= cfg.tolerance);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {cfg.graph && <PositionTimeGraph config={cfg.graph} mode="static" />}
      {cfg.plot && <StaticPlot config={cfg.plot} />}
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="any"
          inputMode="decimal"
          disabled={locked}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={cfg.placeholder ?? "Your answer"}
          aria-label="Numeric answer"
          className="w-40 rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
        {cfg.unit && <span className="text-slate-600">{cfg.unit}</span>}
      </div>
      {!locked && (
        <button
          type="submit"
          className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-white transition hover:bg-slate-700"
        >
          Check answer
        </button>
      )}
    </form>
  );
}
