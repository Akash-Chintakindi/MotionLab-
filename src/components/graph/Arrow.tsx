/** A simple SVG vector arrow in pixel space, with an arrowhead. */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color,
  width = 2.5,
  label,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width?: number;
  label?: string;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return null;
  const ux = dx / len;
  const uy = dy / len;
  const head = 8;
  // base points of the arrowhead triangle
  const bx = x2 - ux * head;
  const by = y2 - uy * head;
  const perpX = -uy;
  const perpY = ux;
  const w = head * 0.6;
  return (
    <g aria-label={label}>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} />
      <polygon
        points={`${x2},${y2} ${bx + perpX * w},${by + perpY * w} ${bx - perpX * w},${by - perpY * w}`}
        fill={color}
      />
    </g>
  );
}
