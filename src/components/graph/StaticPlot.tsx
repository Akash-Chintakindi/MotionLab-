import type { PlotConfig } from "../../types/content";
import { getPlotFn } from "../../lib/functions";
import { PlotGraph } from "./PlotGraph";

export function StaticPlot({ config }: { config: PlotConfig }) {
  return (
    <PlotGraph
      f={getPlotFn(config.preset)}
      tMin={config.tMin}
      tMax={config.tMax}
      yMin={config.yMin}
      yMax={config.yMax}
      xLabel={config.xLabel}
      yLabel={config.yLabel}
      color={config.color}
      area={config.area}
      regions={config.regions}
      ariaLabel={`${config.yLabel ?? "value"} versus time`}
    />
  );
}
