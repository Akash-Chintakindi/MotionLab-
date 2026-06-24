import { useState } from "react";
import type { SliderSimulationConfig } from "../../../types/content";
import { PlotGraph } from "../../graph/PlotGraph";
import { getPlotFn, integrate, totalDistance } from "../../../lib/functions";
import { roundTo } from "../../../lib/curves";

/**
 * Velocity-time graph with a draggable interval. Shows the signed area (net
 * displacement) split by sign and the total distance (area of |v|).
 */
export function AreaSim({ config }: { config: SliderSimulationConfig }) {
  const plot = config.plot!;
  const f = getPlotFn(plot.preset);
  const [from, setFrom] = useState(config.initialFrom ?? plot.tMin);
  const [to, setTo] = useState(config.initialTo ?? plot.tMax);

  const net = roundTo(integrate(f, from, to), 1);
  const dist = roundTo(totalDistance(f, from, to), 1);

  return (
    <div className="space-y-4">
      <PlotGraph
        f={f}
        tMin={plot.tMin}
        tMax={plot.tMax}
        yMin={plot.yMin}
        yMax={plot.yMax}
        yLabel={plot.yLabel ?? "velocity (m/s)"}
        color={plot.color ?? "#1f7aff"}
        area={{ from, to }}
        onAreaChange={(a, b) => {
          setFrom(a);
          setTo(b);
        }}
        ariaLabel="velocity versus time with draggable interval"
      />
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-emerald-50 px-3 py-2">
          <div className="text-xs text-emerald-700">Net displacement</div>
          <div className="text-lg font-bold" data-testid="net-displacement">
            {net} m
          </div>
        </div>
        <div className="rounded-xl bg-slate-100 px-3 py-2">
          <div className="text-xs text-slate-600">Total distance</div>
          <div className="text-lg font-bold" data-testid="total-distance">
            {dist} m
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Green area counts as positive displacement, red as negative. Net adds
        them with sign; total distance adds their sizes.
      </p>
    </div>
  );
}
