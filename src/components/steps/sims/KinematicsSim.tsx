import { useState } from "react";
import type { SliderSimulationConfig } from "../../../types/content";
import { PlotGraph } from "../../graph/PlotGraph";
import { Slider } from "../../Slider";
import { roundTo } from "../../../lib/curves";

function niceRange(samples: number[]): [number, number] {
  let min = Math.min(0, ...samples);
  let max = Math.max(0, ...samples);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.15;
  return [min - pad, max + pad];
}

/**
 * Constant-acceleration sandbox. Adjust a and v0; watch a(t), v(t), x(t)
 * update together (each is the integral of the one above it).
 */
export function KinematicsSim({ config }: { config: SliderSimulationConfig }) {
  const T = config.T ?? 5;
  const x0 = config.x0 ?? 0;
  const [a, setA] = useState(config.a ?? 2);
  const [v0, setV0] = useState(config.v0 ?? 0);

  const aFn = () => a;
  const vFn = (t: number) => v0 + a * t;
  const xFn = (t: number) => x0 + v0 * t + 0.5 * a * t * t;

  const ts = Array.from({ length: 21 }, (_, i) => (T * i) / 20);
  const [vMin, vMax] = niceRange(ts.map(vFn));
  const [xMin, xMax] = niceRange(ts.map(xFn));
  const [aMin, aMax] = config.aRange ?? [-5, 5];
  const [v0Min, v0Max] = config.v0Range ?? [-6, 6];

  const finalV = roundTo(vFn(T), 1);
  const displacement = roundTo(xFn(T) - x0, 1);

  return (
    <div className="space-y-3">
      <Stacked label="a(t) — acceleration (m/s²)">
        <PlotGraph f={aFn} tMin={0} tMax={T} yMin={aMin} yMax={aMax} yLabel="a" color="#ef4444" height={120} ariaLabel="acceleration versus time" />
      </Stacked>
      <Stacked label="v(t) — velocity (m/s), the integral of a(t)">
        <PlotGraph f={vFn} tMin={0} tMax={T} yMin={vMin} yMax={vMax} yLabel="v" color="#1f7aff" height={120} ariaLabel="velocity versus time" />
      </Stacked>
      <Stacked label="x(t) — position (m), the integral of v(t)">
        <PlotGraph f={xFn} tMin={0} tMax={T} yMin={xMin} yMax={xMax} yLabel="x" color="#10b981" height={120} ariaLabel="position versus time" />
      </Stacked>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-100 px-3 py-2">
          <div className="text-xs text-slate-600">Final velocity at t = {T}s</div>
          <div className="text-lg font-bold" data-testid="final-velocity">
            {finalV} m/s
          </div>
        </div>
        <div className="rounded-xl bg-slate-100 px-3 py-2">
          <div className="text-xs text-slate-600">Displacement</div>
          <div className="text-lg font-bold" data-testid="displacement">
            {displacement} m
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        <Slider label="Acceleration a" value={a} min={aMin} max={aMax} step={0.5} unit="m/s²" onChange={setA} />
        <Slider label="Initial velocity v₀" value={v0} min={v0Min} max={v0Max} step={0.5} unit="m/s" onChange={setV0} />
      </div>
    </div>
  );
}

function Stacked({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-500">{label}</div>
      {children}
    </div>
  );
}
