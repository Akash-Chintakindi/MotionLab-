import { useState } from "react";
import type { GraphDragConfig } from "../../types/content";
import { PositionTimeGraph } from "../graph/PositionTimeGraph";
import type { StepComponentProps } from "./types";

export function GraphDragStep({
  step,
  locked,
  prefillCorrect,
  onAnswer,
}: StepComponentProps) {
  const cfg = step.interactionConfig as GraphDragConfig;
  const predictAnswer =
    cfg.mode === "predict"
      ? (step.correctAnswer as { regionId: string }).regionId
      : null;
  const [selectedRegion, setSelectedRegion] = useState<string | null>(
    prefillCorrect ? predictAnswer : null,
  );

  if (cfg.mode === "predict") {
    const correctRegionId = predictAnswer as string;
    return (
      <PositionTimeGraph
        config={cfg.graph}
        mode="predict"
        selectedRegionId={selectedRegion}
        correctRegionId={correctRegionId}
        revealRegions={locked}
        onSelectRegion={(regionId) => {
          if (locked) return;
          setSelectedRegion(regionId);
          onAnswer(regionId === correctRegionId);
        }}
      />
    );
  }

  // explore / secant: free exploration, no grading.
  return (
    <PositionTimeGraph
      config={cfg.graph}
      mode={cfg.mode}
      showTangent={cfg.showTangent}
      showSecant={cfg.showSecant}
      showDeltaTControl={cfg.showDeltaTControl}
      initialT={cfg.initialT}
      initialT2={cfg.initialT2}
    />
  );
}
