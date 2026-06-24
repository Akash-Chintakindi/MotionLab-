import { useState } from "react";
import type { MultipleChoiceConfig } from "../../types/content";
import { PositionTimeGraph } from "../graph/PositionTimeGraph";
import { StaticPlot } from "../graph/StaticPlot";
import type { StepComponentProps } from "./types";

export function MultipleChoiceStep({
  step,
  locked,
  prefillCorrect,
  onAnswer,
}: StepComponentProps) {
  const cfg = step.interactionConfig as MultipleChoiceConfig;
  const correctId = (step.correctAnswer as { optionId: string }).optionId;
  const [selected, setSelected] = useState<string | null>(
    prefillCorrect ? correctId : null,
  );
  // Tracks whether the current selection has been submitted (and was wrong),
  // so we can prompt a resubmit without grading on every click.
  const [submittedWrong, setSubmittedWrong] = useState(false);

  function choose(optionId: string) {
    if (locked) return;
    setSelected(optionId);
    setSubmittedWrong(false);
  }

  function submit() {
    if (locked || selected === null) return;
    const correct = selected === correctId;
    setSubmittedWrong(!correct);
    onAnswer(correct);
  }

  return (
    <div className="space-y-4">
      {cfg.graph && <PositionTimeGraph config={cfg.graph} mode="static" />}
      {cfg.plot && <StaticPlot config={cfg.plot} />}
      <div className="grid gap-2.5" role="radiogroup" aria-label={step.prompt}>
        {cfg.options.map((opt) => {
          const isSelected = selected === opt.id;
          const showCorrect = locked && opt.id === correctId;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={locked}
              onClick={() => choose(opt.id)}
              className={[
                "rounded-xl border px-4 py-3 text-left text-base transition",
                showCorrect
                  ? "border-emerald-400 bg-emerald-50"
                  : isSelected
                    ? submittedWrong
                      ? "border-red-300 bg-red-50"
                      : "border-brand-400 bg-brand-50"
                    : "border-slate-200 bg-white hover:border-brand-300",
              ].join(" ")}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {!locked && (
        <button
          type="button"
          onClick={submit}
          disabled={selected === null}
          className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {submittedWrong ? "Resubmit" : "Submit"}
        </button>
      )}
    </div>
  );
}
