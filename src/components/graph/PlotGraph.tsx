import {
  useCallback,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { clamp, niceTicks, roundTo } from "../../lib/curves";

const W = 360;
const H = 240;
const PAD = { left: 44, right: 16, top: 14, bottom: 36 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export interface PlotRegion {
  id: string;
  tStart: number;
  tEnd: number;
  label: string;
}

interface Props {
  f: (t: number) => number;
  tMin: number;
  tMax: number;
  yMin: number;
  yMax: number;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  /** Shade the area between the curve and y=0 over [from, to]. */
  area?: { from: number; to: number };
  /** Make the area endpoints draggable. */
  onAreaChange?: (from: number, to: number) => void;
  /** Draw a dot on the curve at this time (for animations). */
  markerT?: number;
  regions?: PlotRegion[];
  height?: number;
  ariaLabel?: string;
}

export function PlotGraph({
  f,
  tMin,
  tMax,
  yMin,
  yMax,
  xLabel = "time (s)",
  yLabel,
  color = "#1f7aff",
  area,
  onAreaChange,
  markerT,
  regions,
  height,
  ariaLabel,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<null | "from" | "to">(null);

  const tToPx = useCallback(
    (t: number) => PAD.left + ((t - tMin) / (tMax - tMin)) * PLOT_W,
    [tMin, tMax],
  );
  const yToPx = useCallback(
    (y: number) => PAD.top + PLOT_H - ((y - yMin) / (yMax - yMin)) * PLOT_H,
    [yMin, yMax],
  );
  const pxToT = useCallback(
    (px: number) =>
      clamp(tMin + ((px - PAD.left) / PLOT_W) * (tMax - tMin), tMin, tMax),
    [tMin, tMax],
  );

  const curvePath = useMemo(() => {
    const N = 120;
    let d = "";
    for (let i = 0; i <= N; i++) {
      const t = tMin + ((tMax - tMin) * i) / N;
      d += `${i === 0 ? "M" : "L"}${roundTo(tToPx(t), 1)},${roundTo(yToPx(f(t)), 1)} `;
    }
    return d.trim();
  }, [f, tMin, tMax, tToPx, yToPx]);

  // Sign-colored area fill between curve and zero.
  const areaQuads = useMemo(() => {
    if (!area) return [];
    const N = 48;
    const from = Math.min(area.from, area.to);
    const to = Math.max(area.from, area.to);
    const quads: { d: string; positive: boolean }[] = [];
    for (let i = 0; i < N; i++) {
      const ta = from + ((to - from) * i) / N;
      const tb = from + ((to - from) * (i + 1)) / N;
      const mid = (ta + tb) / 2;
      const y0 = yToPx(0);
      const d = `M${tToPx(ta)},${y0} L${tToPx(ta)},${yToPx(f(ta))} L${tToPx(tb)},${yToPx(f(tb))} L${tToPx(tb)},${y0} Z`;
      quads.push({ d, positive: f(mid) >= 0 });
    }
    return quads;
  }, [area, f, tToPx, yToPx]);

  function clientToT(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return tMin;
    const rect = svg.getBoundingClientRect();
    return pxToT(((clientX - rect.left) * W) / rect.width);
  }

  function startDrag(which: "from" | "to") {
    return (e: ReactPointerEvent) => {
      if (!onAreaChange) return;
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      dragRef.current = which;
    };
  }
  function onMove(e: ReactPointerEvent) {
    if (!dragRef.current || !onAreaChange || !area) return;
    const t = roundTo(clientToT(e.clientX), 1);
    if (dragRef.current === "from") onAreaChange(t, area.to);
    else onAreaChange(area.from, t);
  }
  function endDrag() {
    dragRef.current = null;
  }

  const zeroPy = yToPx(0);
  const showZero = yMin < 0 && yMax > 0;

  const tTicks = niceTicks(tMin, tMax, 6);
  const yTicks = niceTicks(yMin, yMax, 5);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full touch-none rounded-xl bg-white"
      style={height ? { height } : undefined}
      role="img"
      aria-label={ariaLabel ?? "graph"}
      onPointerMove={onMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      {/* grid + axis numbers */}
      {yTicks.map((y) => {
        const py = yToPx(y);
        return (
          <g key={`gy${y}`}>
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
              {String(roundTo(y, 2))}
            </text>
          </g>
        );
      })}
      {tTicks.map((t) => {
        const px = tToPx(t);
        return (
          <g key={`gx${t}`}>
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
              {String(roundTo(t, 2))}
            </text>
          </g>
        );
      })}

      {/* regions */}
      {regions?.map((r) => (
        <g key={r.id}>
          <rect
            x={tToPx(r.tStart)}
            y={PAD.top}
            width={tToPx(r.tEnd) - tToPx(r.tStart)}
            height={PLOT_H}
            fill="rgba(148,163,184,0.05)"
            stroke="rgba(148,163,184,0.4)"
            strokeDasharray="4 3"
          />
          <text
            x={(tToPx(r.tStart) + tToPx(r.tEnd)) / 2}
            y={PAD.top + 12}
            textAnchor="middle"
            fontSize={10}
            className="fill-slate-500"
          >
            {r.label}
          </text>
        </g>
      ))}

      {/* area fill */}
      {areaQuads.map((q, i) => (
        <path
          key={i}
          d={q.d}
          fill={q.positive ? "rgba(34,197,94,0.22)" : "rgba(239,68,68,0.22)"}
          stroke="none"
        />
      ))}

      {/* axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PLOT_H} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={PAD.left} y1={PAD.top + PLOT_H} x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H} stroke="#94a3b8" strokeWidth={1.5} />
      {showZero && (
        <line
          x1={PAD.left}
          y1={zeroPy}
          x2={PAD.left + PLOT_W}
          y2={zeroPy}
          stroke="#cbd5e1"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}
      <text x={PAD.left + PLOT_W / 2} y={H - 6} textAnchor="middle" className="fill-slate-500" fontSize={11}>
        {xLabel}
      </text>
      {yLabel && (
        <text
          x={12}
          y={PAD.top + PLOT_H / 2}
          textAnchor="middle"
          className="fill-slate-500"
          fontSize={11}
          transform={`rotate(-90 12 ${PAD.top + PLOT_H / 2})`}
        >
          {yLabel}
        </text>
      )}

      {/* curve */}
      <path d={curvePath} fill="none" stroke={color} strokeWidth={2.5} />

      {/* moving marker */}
      {typeof markerT === "number" && (
        <circle cx={tToPx(markerT)} cy={yToPx(f(markerT))} r={6} fill={color} />
      )}

      {/* draggable area endpoints */}
      {area && onAreaChange && (
        <>
          <EndpointHandle cx={tToPx(area.from)} top={PAD.top} bottom={PAD.top + PLOT_H} onPointerDown={startDrag("from")} label="Interval start" />
          <EndpointHandle cx={tToPx(area.to)} top={PAD.top} bottom={PAD.top + PLOT_H} onPointerDown={startDrag("to")} label="Interval end" />
        </>
      )}
    </svg>
  );
}

function EndpointHandle({
  cx,
  top,
  bottom,
  onPointerDown,
  label,
}: {
  cx: number;
  top: number;
  bottom: number;
  onPointerDown: (e: ReactPointerEvent) => void;
  label: string;
}) {
  return (
    <g
      onPointerDown={onPointerDown}
      style={{ cursor: "ew-resize", touchAction: "none" }}
      role="slider"
      aria-label={label}
      tabIndex={0}
    >
      <line x1={cx} y1={top} x2={cx} y2={bottom} stroke="#0f172a" strokeWidth={1.5} />
      <rect x={cx - 12} y={top} width={24} height={bottom - top} fill="transparent" />
      <circle cx={cx} cy={bottom} r={8} fill="white" stroke="#0f172a" strokeWidth={2.5} />
    </g>
  );
}
