import type { ConceptConfig } from "../../types/content";
import { PositionTimeGraph } from "../graph/PositionTimeGraph";
import type { StepComponentProps } from "./types";

export function ConceptStep({ step }: StepComponentProps) {
  const cfg = step.interactionConfig as ConceptConfig;
  return (
    <div className="space-y-4">
      {cfg.graph && (
        <PositionTimeGraph config={cfg.graph} mode="static" />
      )}
      {cfg.formula && (
        <div className="rounded-xl bg-ink px-4 py-5 text-center">
          <span className="font-mono text-2xl tracking-wide text-white">
            {cfg.formula}
          </span>
        </div>
      )}
      {cfg.body?.map((p, i) => (
        <p key={i} className="text-slate-700">
          {p}
        </p>
      ))}
    </div>
  );
}
