import { useEffect, useRef, useState } from "react";
import type { SliderSimulationConfig } from "../../../types/content";
import { PlotGraph } from "../../graph/PlotGraph";
import { Slider } from "../../Slider";
import { roundTo } from "../../../lib/curves";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";

const T = 6;

/**
 * Velocity-time line v(t) = v0 + a*t with a live 1D motion animation and a
 * speeding-up / slowing-down indicator. Acceleration is the slope of v(t).
 */
export function MotionSim({ config }: { config: SliderSimulationConfig }) {
  const [v0, setV0] = useState(config.v0 ?? 2);
  const [a, setA] = useState(config.a ?? -1);
  const [simT, setSimT] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setSimT(T / 2);
      return;
    }
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ((ts - startRef.current) / 1000) % T;
      setSimT(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  const v = (t: number) => v0 + a * t;
  const x = (t: number) => v0 * t + 0.5 * a * t * t;

  // Track range for mapping the animated dot.
  const xs = Array.from({ length: 25 }, (_, i) => x((T * i) / 24));
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const dotPct =
    xmax === xmin ? 50 : ((x(simT) - xmin) / (xmax - xmin)) * 100;

  const vNow = v(simT);
  const motion =
    a === 0
      ? "constant velocity"
      : Math.sign(vNow) === Math.sign(a)
        ? "speeding up"
        : "slowing down";

  const [v0Min, v0Max] = config.v0Range ?? [-6, 6];
  const [aMin, aMax] = config.aRange ?? [-3, 3];

  return (
    <div className="space-y-4">
      <PlotGraph
        f={v}
        tMin={0}
        tMax={T}
        yMin={-12}
        yMax={12}
        yLabel="velocity (m/s)"
        color="#1f7aff"
        markerT={simT}
        ariaLabel="velocity versus time"
      />

      {/* 1D motion track */}
      <div className="rounded-xl bg-slate-50 p-3">
        <div className="mb-2 text-xs font-medium text-slate-500">
          Object on a track
        </div>
        <div className="relative h-10 rounded-lg bg-white ring-1 ring-slate-200">
          <div
            className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-brand-500 transition-[left] duration-75"
            style={{ left: `calc(${dotPct}% - 12px)` }}
            data-testid="motion-dot"
            aria-hidden
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
        <span>
          v = <b>{roundTo(vNow, 1)} m/s</b>
        </span>
        <span>
          a = slope = <b>{roundTo(a, 1)} m/s²</b>
        </span>
        <span
          data-testid="motion-state"
          className={[
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            motion === "speeding up"
              ? "bg-red-100 text-red-700"
              : motion === "slowing down"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-700",
          ].join(" ")}
        >
          {motion}
        </span>
      </div>

      <div className="space-y-3">
        <Slider label="Initial velocity v₀" value={v0} min={v0Min} max={v0Max} step={0.5} unit="m/s" onChange={setV0} />
        <Slider label="Acceleration a" value={a} min={aMin} max={aMax} step={0.5} unit="m/s²" onChange={setA} />
      </div>
    </div>
  );
}
