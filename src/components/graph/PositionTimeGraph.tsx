import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GraphConfig } from "../../types/content";
import {
  averageVelocity,
  clamp,
  getCurve,
  niceTicks,
  roundTo,
} from "../../lib/curves";

const W = 360;
const H = 260;
const PAD = { left: 44, right: 16, top: 16, bottom: 38 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export type GraphMode = "static" | "explore" | "secant" | "predict";

interface Props {
  config: GraphConfig;
  mode?: GraphMode;
  showTangent?: boolean;
  showSecant?: boolean;
  showDeltaTControl?: boolean;
  initialT?: number;
  initialT2?: number;
  /** predict mode */
  selectedRegionId?: string | null;
  correctRegionId?: string | null;
  revealRegions?: boolean;
  onSelectRegion?: (regionId: string) => void;
}

export function PositionTimeGraph({
  config,
  mode = "static",
  showTangent,
  showSecant,
  showDeltaTControl,
  initialT,
  initialT2,
  selectedRegionId,
  correctRegionId,
  revealRegions,
  onSelectRegion,
}: Props) {
  const curve = getCurve(config.curve);
  const { tMin, tMax, xMin, xMax } = config;

  const svgRef = useRef<SVGSVGElement | null>(null);

  const [t1, setT1] = useState(initialT ?? (tMin + tMax) / 2);
  const [t2, setT2] = useState(initialT2 ?? tMax * 0.8);
  const [deltaT, setDeltaT] = useState(
    Math.abs((initialT2 ?? tMax * 0.8) - (initialT ?? (tMin + tMax) / 2)) || 2,
  );
  const [dragging, setDragging] = useState<null | "m1" | "m2">(null);

  // --- coordinate mapping -------------------------------------------------
  const tToPx = useCallback(
    (t: number) => PAD.left + ((t - tMin) / (tMax - tMin)) * PLOT_W,
    [tMin, tMax],
  );
  const xToPx = useCallback(
    (x: number) =>
      PAD.top + PLOT_H - ((x - xMin) / (xMax - xMin)) * PLOT_H,
    [xMin, xMax],
  );
  const pxToT = useCallback(
    (px: number) =>
      clamp(tMin + ((px - PAD.left) / PLOT_W) * (tMax - tMin), tMin, tMax),
    [tMin, tMax],
  );

  const clientToLocalX = useCallback((clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    return (clientX - rect.left) * scaleX;
  }, []);

  // --- curve path ---------------------------------------------------------
  const curvePath = useMemo(() => {
    const N = 120;
    let d = "";
    for (let i = 0; i <= N; i++) {
      const t = tMin + ((tMax - tMin) * i) / N;
      const px = tToPx(t);
      const py = xToPx(curve.x(t));
      d += `${i === 0 ? "M" : "L"}${roundTo(px, 1)},${roundTo(py, 1)} `;
    }
    return d.trim();
  }, [curve, tMin, tMax, tToPx, xToPx]);

  // effective second marker time when using the delta-t control
  const effectiveT2 = showDeltaTControl
    ? clamp(t1 + deltaT, tMin, tMax)
    : t2;

  // --- pointer handling ---------------------------------------------------
  function startDrag(which: "m1" | "m2") {
    return (e: ReactPointerEvent) => {
      if (mode === "static" || mode === "predict") return;
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDragging(which);
    };
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!dragging) return;
    const t = pxToT(clientToLocalX(e.clientX));
    if (dragging === "m1") setT1(t);
    else setT2(t);
  }

  function endDrag() {
    setDragging(null);
  }

  // --- derived readouts ---------------------------------------------------
  const v1 = roundTo(curve.v(t1), 2);
  const avgV = roundTo(averageVelocity(curve, t1, effectiveT2), 2);

  // --- tangent segment around t1 ------------------------------------------
  const tangent = useMemo(() => {
    const half = (tMax - tMin) * 0.18;
    const ta = clamp(t1 - half, tMin, tMax);
    const tb = clamp(t1 + half, tMin, tMax);
    const slope = curve.v(t1);
    const x0 = curve.x(t1);
    return {
      x1: tToPx(ta),
      y1: xToPx(x0 + slope * (ta - t1)),
      x2: tToPx(tb),
      y2: xToPx(x0 + slope * (tb - t1)),
    };
  }, [curve, t1, tMin, tMax, tToPx, xToPx]);

  const showMarker1 = mode === "explore" || mode === "secant";
  const showMarker2 = mode === "secant";

  return (
    <div className="select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none rounded-xl bg-white"
        role="img"
        aria-label={`Position versus time graph (${config.curve})`}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        {/* grid */}
        <Grid tToPx={tToPx} xToPx={xToPx} tMin={tMin} tMax={tMax} xMin={xMin} xMax={xMax} />

        {/* axes */}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + PLOT_H}
          stroke="#94a3b8"
          strokeWidth={1.5}
        />
        <line
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={PAD.left + PLOT_W}
          y2={PAD.top + PLOT_H}
          stroke="#94a3b8"
          strokeWidth={1.5}
        />
        <text x={PAD.left + PLOT_W / 2} y={H - 6} textAnchor="middle" className="fill-slate-500" fontSize={11}>
          {config.xLabel ?? "time (s)"}
        </text>
        <text
          x={12}
          y={PAD.top + PLOT_H / 2}
          textAnchor="middle"
          className="fill-slate-500"
          fontSize={11}
          transform={`rotate(-90 12 ${PAD.top + PLOT_H / 2})`}
        >
          {config.yLabel ?? "position (m)"}
        </text>

        {/* regions (predict mode) */}
        {config.regions?.map((r) => {
          const x = tToPx(r.tStart);
          const w = tToPx(r.tEnd) - tToPx(r.tStart);
          const selected = selectedRegionId === r.id;
          const isCorrect = correctRegionId === r.id;
          let fill = "transparent";
          let stroke = "transparent";
          if (mode === "predict") {
            fill = selected ? "rgba(31,122,255,0.10)" : "rgba(148,163,184,0.06)";
            stroke = "rgba(148,163,184,0.5)";
            if (revealRegions) {
              if (isCorrect) {
                fill = "rgba(34,197,94,0.14)";
                stroke = "rgba(34,197,94,0.8)";
              } else if (selected) {
                fill = "rgba(239,68,68,0.12)";
                stroke = "rgba(239,68,68,0.8)";
              }
            }
          }
          return (
            <g key={r.id}>
              <rect
                x={x}
                y={PAD.top}
                width={w}
                height={PLOT_H}
                fill={fill}
                stroke={stroke}
                strokeDasharray="4 3"
                style={{ cursor: mode === "predict" ? "pointer" : "default" }}
                onClick={() => mode === "predict" && onSelectRegion?.(r.id)}
                role={mode === "predict" ? "button" : undefined}
                aria-label={mode === "predict" ? `Select ${r.label} region` : undefined}
              />
              {mode === "predict" && (
                <text
                  x={x + w / 2}
                  y={PAD.top + 14}
                  textAnchor="middle"
                  fontSize={10}
                  className="fill-slate-500"
                  style={{ pointerEvents: "none" }}
                >
                  {r.label}
                </text>
              )}
            </g>
          );
        })}

        {/* the curve */}
        <path d={curvePath} fill="none" stroke="#1f7aff" strokeWidth={2.5} />

        {/* labeled annotation points (e.g. Point A / B / C) */}
        {config.markers?.map((m) => (
          <PointMarker
            key={m.id}
            cx={tToPx(m.t)}
            cy={xToPx(curve.x(m.t))}
            label={m.label ?? m.id}
            color={m.color ?? "#0f172a"}
          />
        ))}

        {/* secant line */}
        {showSecant && showMarker1 && (
          <line
            x1={tToPx(t1)}
            y1={xToPx(curve.x(t1))}
            x2={tToPx(effectiveT2)}
            y2={xToPx(curve.x(effectiveT2))}
            stroke="#f59e0b"
            strokeWidth={2}
          />
        )}

        {/* tangent line */}
        {showTangent && showMarker1 && (
          <line
            x1={tangent.x1}
            y1={tangent.y1}
            x2={tangent.x2}
            y2={tangent.y2}
            stroke="#10b981"
            strokeWidth={2.5}
          />
        )}

        {/* markers */}
        {showMarker1 && (
          <Marker
            cx={tToPx(t1)}
            cy={xToPx(curve.x(t1))}
            active={dragging === "m1"}
            color="#f59e0b"
            onPointerDown={startDrag("m1")}
            label="Marker 1"
          />
        )}
        {showMarker2 && (
          <Marker
            cx={tToPx(effectiveT2)}
            cy={xToPx(curve.x(effectiveT2))}
            active={dragging === "m2"}
            color="#f59e0b"
            onPointerDown={startDrag("m2")}
            label="Marker 2"
            disabled={showDeltaTControl}
          />
        )}
      </svg>

      {/* readouts */}
      {mode === "explore" && (
        <Readout>
          <span>
            t = <b>{roundTo(t1, 2)} s</b>
          </span>
          <span aria-live="polite">
            velocity v = dx/dt = <b data-testid="velocity-readout">{v1} m/s</b>
          </span>
        </Readout>
      )}
      {mode === "secant" && (
        <div className="mt-3 space-y-3">
          <Readout>
            <span>
              interval Δt = <b>{roundTo(Math.abs(effectiveT2 - t1), 2)} s</b>
            </span>
            <span aria-live="polite">
              average velocity ={" "}
              <b data-testid="avg-velocity-readout">{avgV} m/s</b>
            </span>
          </Readout>
          {showDeltaTControl && (
            <label className="block rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="mb-1 block font-medium text-slate-600">
                Shrink the interval Δt → 0
              </span>
              <input
                type="range"
                min={0.05}
                max={2}
                step={0.05}
                value={deltaT}
                onChange={(e) => setDeltaT(Number(e.target.value))}
                className="w-full accent-brand-600"
                aria-label="Delta t"
              />
              <span className="mt-1 block text-xs text-slate-500">
                As Δt shrinks, average velocity approaches the instantaneous
                velocity v({roundTo(t1, 1)}) = {v1} m/s.
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

function Marker({
  cx,
  cy,
  color,
  active,
  onPointerDown,
  label,
  disabled,
}: {
  cx: number;
  cy: number;
  color: string;
  active: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <g
      onPointerDown={disabled ? undefined : onPointerDown}
      style={{ cursor: disabled ? "default" : "grab", touchAction: "none" }}
      role="slider"
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
    >
      {/* generous invisible hit area for touch */}
      <circle cx={cx} cy={cy} r={18} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={active ? 9 : 7}
        fill="white"
        stroke={color}
        strokeWidth={3}
      />
    </g>
  );
}

function PointMarker({
  cx,
  cy,
  label,
  color,
}: {
  cx: number;
  cy: number;
  label: string;
  color: string;
}) {
  // Keep the label inside the plot: drop it below the dot when near the top.
  const labelAbove = cy - PAD.top > 22;
  const labelY = labelAbove ? cy - 12 : cy + 20;
  return (
    <g aria-label={`Point ${label} at this position on the curve`}>
      <circle cx={cx} cy={cy} r={7} fill="white" stroke={color} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3.5} fill={color} />
      <text
        x={cx}
        y={labelY}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fill={color}
        style={{ pointerEvents: "none" }}
      >
        {label}
      </text>
    </g>
  );
}

function Readout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
      {children}
    </div>
  );
}

function Grid({
  tToPx,
  xToPx,
  tMin,
  tMax,
  xMin,
  xMax,
}: {
  tToPx: (t: number) => number;
  xToPx: (x: number) => number;
  tMin: number;
  tMax: number;
  xMin: number;
  xMax: number;
}) {
  const tTicks = niceTicks(tMin, tMax, 6);
  const xTicks = niceTicks(xMin, xMax, 5);
  return (
    <g>
      {/* horizontal grid + y-axis (position) numbers */}
      {xTicks.map((x) => {
        const py = xToPx(x);
        return (
          <g key={`h${x}`}>
            <line
              x1={PAD.left}
              y1={py}
              x2={PAD.left + PLOT_W}
              y2={py}
              stroke="#eef2f7"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={py + 3}
              textAnchor="end"
              fontSize={9}
              className="fill-slate-400"
            >
              {fmtTick(x)}
            </text>
          </g>
        );
      })}
      {/* vertical grid + x-axis (time) numbers */}
      {tTicks.map((t) => {
        const px = tToPx(t);
        return (
          <g key={`v${t}`}>
            <line
              x1={px}
              y1={PAD.top}
              x2={px}
              y2={PAD.top + PLOT_H}
              stroke="#eef2f7"
              strokeWidth={1}
            />
            <text
              x={px}
              y={PAD.top + PLOT_H + 13}
              textAnchor="middle"
              fontSize={9}
              className="fill-slate-400"
            >
              {fmtTick(t)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function fmtTick(v: number): string {
  return String(roundTo(v, 2));
}
