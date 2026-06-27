import type { WorkedExampleConfig } from "../../types/content";
import { PositionTimeGraph } from "../graph/PositionTimeGraph";
import { StaticPlot } from "../graph/StaticPlot";
import { RichText } from "../RichText";
import type { StepComponentProps } from "./types";

/**
 * Renders a fully solved example problem as a teaching demonstration: the
 * problem statement, optional visual, an ordered list of solution lines (each
 * with an optional label + equation), and a transferable takeaway. Auto step —
 * the learner reads it, then advances to attempt a similar problem.
 */
export function WorkedExampleStep({ step }: StepComponentProps) {
  const cfg = step.interactionConfig as WorkedExampleConfig;
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-brand-50 p-4 ring-1 ring-brand-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Worked example
        </p>
        <p className="mt-1 text-[15px] leading-relaxed text-slate-800">
          <RichText>{cfg.problem}</RichText>
        </p>
      </div>

      {cfg.graph && <PositionTimeGraph config={cfg.graph} mode="static" />}
      {cfg.plot && <StaticPlot config={cfg.plot} />}

      <ol className="space-y-3">
        {cfg.solution.map((line, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              {line.label && (
                <p className="text-sm font-semibold text-ink">
                  <RichText>{line.label}</RichText>
                </p>
              )}
              <p className="text-[15px] leading-relaxed text-slate-700">
                <RichText>{line.detail}</RichText>
              </p>
              {line.formula && (
                <div className="mt-1.5 rounded-lg bg-ink px-3 py-2 text-center">
                  <span className="font-mono text-base tracking-wide text-white">
                    {line.formula}
                  </span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {cfg.takeaway && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <p className="text-sm font-semibold text-amber-900">Takeaway</p>
          <p className="mt-0.5 text-[15px] leading-relaxed text-amber-900">
            <RichText>{cfg.takeaway}</RichText>
          </p>
        </div>
      )}
    </div>
  );
}
