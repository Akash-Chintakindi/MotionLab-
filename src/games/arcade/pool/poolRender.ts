import type { Ball, PoolTable } from "./poolPhysics";
import type { Vec2 } from "../types";

// ---------------------------------------------------------------------------
// All canvas drawing for the pool game. Everything is procedural (gradients,
// shapes, particles) — no image assets. Table units map to CSS pixels through
// a single scale; the y-axis is flipped so the learner sees a math plane.
// ---------------------------------------------------------------------------

/** Rail thickness, in table units, drawn around the playable felt. */
export const MARGIN = 7;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface PocketFx {
  pos: Vec2;
  t: number;
  color: string;
}

export interface CueAnim {
  angleDeg: number;
  /** 0..1 windup→strike progress; null when no stick is shown. */
  progress: number;
  struck: boolean;
  /** Seconds since the strike, for the recoil fade. */
  recoil: number;
}

export interface SceneState {
  table: PoolTable;
  balls: Ball[];
  targetPocketId: string | null;
  aim: { angleDeg: number; speed: number } | null;
  cue: CueAnim | null;
  particles: Particle[];
  pocketFx: PocketFx[];
  revealObjectId: string | null;
  revealPulse: number;
  time: number;
  reduced: boolean;
}

export function totalUnits(table: PoolTable): { w: number; h: number } {
  return { w: table.width + 2 * MARGIN, h: table.height + 2 * MARGIN };
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
function easeIn(t: number): number {
  return t * t;
}

/** Converts a canvas-pixel point to table coordinates (origin bottom-left). */
export function canvasToTable(
  cssX: number,
  cssY: number,
  cssW: number,
  table: PoolTable,
): Vec2 {
  const scale = cssW / totalUnits(table).w;
  return {
    x: cssX / scale - MARGIN,
    y: table.height - (cssY / scale - MARGIN),
  };
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  s: SceneState,
): void {
  const { table } = s;
  const scale = cssW / totalUnits(table).w;
  const tx = (x: number) => (MARGIN + x) * scale;
  const ty = (y: number) => (MARGIN + (table.height - y)) * scale;
  const u = (v: number) => v * scale; // table-unit length → px

  ctx.clearRect(0, 0, cssW, cssH);

  drawRail(ctx, cssW, cssH, scale);
  drawFelt(ctx, tx, ty, u, table);
  drawGrid(ctx, tx, ty, u, table, scale);
  drawPockets(ctx, tx, ty, u, table, s);

  // Aim confirmation line (the player's input direction — NOT the solution).
  if (s.aim) {
    const cueBall = s.balls.find((b) => b.isCue && !b.pocketed);
    if (cueBall) drawAimLine(ctx, tx, ty, u, cueBall, s.aim, s.time);
  }

  // Pocket-drop effects sit under the balls.
  for (const fx of s.pocketFx) drawPocketFx(ctx, tx, ty, u, fx);

  for (const b of s.balls) {
    if (b.pocketed) continue;
    const reveal = b.id === s.revealObjectId ? s.revealPulse : 0;
    drawBall(ctx, tx, ty, u, b, reveal);
  }

  if (s.cue) drawCueStick(ctx, tx, ty, u, s);

  for (const p of s.particles) drawParticle(ctx, tx, ty, u, p);
}

function drawRail(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
): void {
  const r = scale * 2.4;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#6b4423");
  grad.addColorStop(0.5, "#4e2f17");
  grad.addColorStop(1, "#3a2210");
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, w, h, r);
  ctx.fill();
  // Bevel highlight along the top inner edge.
  ctx.strokeStyle = "rgba(255,220,170,0.18)";
  ctx.lineWidth = Math.max(1, scale * 0.4);
  roundRect(ctx, scale * 1.2, scale * 1.2, w - scale * 2.4, h - scale * 2.4, r * 0.7);
  ctx.stroke();
}

function drawFelt(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  u: (v: number) => number,
  table: PoolTable,
): void {
  const x0 = tx(0);
  const y0 = ty(table.height);
  const w = u(table.width);
  const h = u(table.height);
  const base = ctx.createLinearGradient(0, y0, 0, y0 + h);
  base.addColorStop(0, "#1f8a4c");
  base.addColorStop(1, "#0f6b39");
  ctx.fillStyle = base;
  ctx.fillRect(x0, y0, w, h);

  // Soft central sheen + vignette so a still frame already looks alive.
  const cx = tx(table.width / 2);
  const cy = ty(table.height / 2);
  const sheen = ctx.createRadialGradient(cx, cy, u(4), cx, cy, u(table.width * 0.62));
  sheen.addColorStop(0, "rgba(255,255,255,0.10)");
  sheen.addColorStop(0.6, "rgba(255,255,255,0.0)");
  sheen.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = sheen;
  ctx.fillRect(x0, y0, w, h);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  u: (v: number) => number,
  table: PoolTable,
  scale: number,
): void {
  ctx.save();
  ctx.lineWidth = Math.max(0.5, scale * 0.08);
  ctx.font = `${Math.max(7, scale * 1.7)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = "rgba(235,255,240,0.55)";
  ctx.strokeStyle = "rgba(255,255,255,0.09)";

  for (let x = 0; x <= table.width; x += 10) {
    ctx.beginPath();
    ctx.moveTo(tx(x), ty(0));
    ctx.lineTo(tx(x), ty(table.height));
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(String(x), tx(x), ty(0) + u(0.5));
  }
  for (let y = 0; y <= table.height; y += 10) {
    ctx.beginPath();
    ctx.moveTo(tx(0), ty(y));
    ctx.lineTo(tx(table.width), ty(y));
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(String(y), tx(0) + u(0.6), ty(y));
  }
  ctx.restore();
}

function drawPockets(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  u: (v: number) => number,
  table: PoolTable,
  s: SceneState,
): void {
  for (const p of table.pockets) {
    const px = tx(p.pos.x);
    const py = ty(p.pos.y);
    const r = u(p.radius);

    if (p.id === s.targetPocketId) {
      const pulse = 0.5 + 0.5 * Math.sin(s.time * 4);
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, r + u(1.4) + pulse * u(0.8), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,214,90,${0.55 + pulse * 0.4})`;
      ctx.lineWidth = u(0.7);
      ctx.shadowColor = "rgba(255,200,60,0.9)";
      ctx.shadowBlur = u(2) + pulse * u(2.5);
      ctx.stroke();
      ctx.restore();
    }

    const hole = ctx.createRadialGradient(px, py, r * 0.2, px, py, r);
    hole.addColorStop(0, "#000");
    hole.addColorStop(0.7, "#0a0a0a");
    hole.addColorStop(1, "#241204");
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  u: (v: number) => number,
  b: Ball,
  reveal: number,
): void {
  const px = tx(b.pos.x);
  const py = ty(b.pos.y);
  const r = u(b.radius);

  // Contact shadow.
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(px + r * 0.25, py + r * 0.4, r * 1.05, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Emphasis ring when the object ball is "revealed" by a tap.
  if (reveal > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, r + u(0.6) + reveal * u(1.2), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(125,226,255,${0.85 * reveal})`;
    ctx.lineWidth = u(0.5);
    ctx.stroke();
    ctx.restore();
  }

  // Glossy sphere body.
  const grad = ctx.createRadialGradient(
    px - r * 0.35,
    py - r * 0.4,
    r * 0.1,
    px,
    py,
    r,
  );
  grad.addColorStop(0, lighten(b.color, 0.55));
  grad.addColorStop(0.55, b.color);
  grad.addColorStop(1, darken(b.color, 0.45));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();

  // Number circle for object balls.
  if (b.number != null) {
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(px, py, r * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#15212e";
    ctx.font = `bold ${r * 0.7}px "Space Grotesk", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(b.number), px, py + r * 0.04);
  }

  // Specular highlight.
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(px - r * 0.34, py - r * 0.42, r * 0.26, r * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAimLine(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  u: (v: number) => number,
  cue: Ball,
  aim: { angleDeg: number; speed: number },
  time: number,
): void {
  const rad = (aim.angleDeg * Math.PI) / 180;
  const dir = { x: Math.cos(rad), y: Math.sin(rad) };
  const start = {
    x: cue.pos.x + dir.x * cue.radius,
    y: cue.pos.y + dir.y * cue.radius,
  };
  const reach = Math.min(28, 5 + aim.speed * 0.5);
  const end = { x: start.x + dir.x * reach, y: start.y + dir.y * reach };

  ctx.save();
  ctx.setLineDash([u(1.4), u(1)]);
  ctx.lineDashOffset = -time * u(6);
  ctx.strokeStyle = "rgba(255,255,255,0.78)";
  ctx.lineWidth = u(0.35);
  ctx.beginPath();
  ctx.moveTo(tx(start.x), ty(start.y));
  ctx.lineTo(tx(end.x), ty(end.y));
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrowhead.
  const ang = Math.atan2(ty(end.y) - ty(start.y), tx(end.x) - tx(start.x));
  const ah = u(1.6);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.moveTo(tx(end.x), ty(end.y));
  ctx.lineTo(tx(end.x) - ah * Math.cos(ang - 0.4), ty(end.y) - ah * Math.sin(ang - 0.4));
  ctx.lineTo(tx(end.x) - ah * Math.cos(ang + 0.4), ty(end.y) - ah * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCueStick(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  u: (v: number) => number,
  s: SceneState,
): void {
  const cueBall = s.balls.find((b) => b.isCue && !b.pocketed);
  const anim = s.cue;
  if (!cueBall || !anim) return;

  // After the strike, the stick recoils back and fades out quickly.
  let opacity = 1;
  if (anim.struck) {
    opacity = Math.max(0, 1 - anim.recoil / 0.22);
    if (opacity <= 0) return;
  }

  // Gap (table units) between the cue-ball edge and the stick tip.
  let gap: number;
  if (!anim.struck) {
    const p = anim.progress;
    if (p < 0.55) gap = 2 + easeOut(p / 0.55) * 7;
    else gap = 9 - easeIn((p - 0.55) / 0.45) * 9;
  } else {
    gap = -anim.recoil * 6; // follow-through past contact, then it fades
  }

  const rad = (anim.angleDeg * Math.PI) / 180;
  const back = { x: -Math.cos(rad), y: -Math.sin(rad) };
  const tip = {
    x: cueBall.pos.x + back.x * (cueBall.radius + gap),
    y: cueBall.pos.y + back.y * (cueBall.radius + gap),
  };
  const length = 60;
  const butt = { x: tip.x + back.x * length, y: tip.y + back.y * length };

  const tipPx = { x: tx(tip.x), y: ty(tip.y) };
  const buttPx = { x: tx(butt.x), y: ty(butt.y) };

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.lineCap = "round";

  // Wooden shaft.
  const wood = ctx.createLinearGradient(tipPx.x, tipPx.y, buttPx.x, buttPx.y);
  wood.addColorStop(0, "#e8d2a6");
  wood.addColorStop(0.15, "#caa063");
  wood.addColorStop(1, "#6e4321");
  ctx.strokeStyle = wood;
  ctx.lineWidth = u(1.1);
  ctx.beginPath();
  ctx.moveTo(tipPx.x, tipPx.y);
  ctx.lineTo(buttPx.x, buttPx.y);
  ctx.stroke();

  // Leather tip + ferrule.
  ctx.strokeStyle = "#23445f";
  ctx.lineWidth = u(1.15);
  const f = { x: tip.x + back.x * 1.4, y: tip.y + back.y * 1.4 };
  ctx.beginPath();
  ctx.moveTo(tipPx.x, tipPx.y);
  ctx.lineTo(tx(f.x), ty(f.y));
  ctx.stroke();
  ctx.restore();
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  u: (v: number) => number,
  p: Particle,
): void {
  const a = Math.max(0, p.life / p.maxLife);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(tx(p.x), ty(p.y), u(p.size), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPocketFx(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  u: (v: number) => number,
  fx: PocketFx,
): void {
  const t = Math.min(1, fx.t / 0.45);
  const px = tx(fx.pos.x);
  const py = ty(fx.pos.y);
  // Shrinking ball dropping into the hole.
  const r = u(1.4) * (1 - t);
  if (r > 0.3) {
    ctx.save();
    ctx.fillStyle = fx.color;
    ctx.globalAlpha = 1 - t * 0.4;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Expanding ring flash.
  ctx.save();
  ctx.globalAlpha = (1 - t) * 0.8;
  ctx.strokeStyle = "rgba(255,224,130,0.9)";
  ctx.lineWidth = u(0.5);
  ctx.beginPath();
  ctx.arc(px, py, u(2.4) + t * u(3), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---- colour helpers -------------------------------------------------------

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}
function lighten(hex: string, amt: number): string {
  const [r, g, b] = parse(hex);
  return `rgb(${clamp(r + (255 - r) * amt)},${clamp(g + (255 - g) * amt)},${clamp(
    b + (255 - b) * amt,
  )})`;
}
function darken(hex: string, amt: number): string {
  const [r, g, b] = parse(hex);
  return `rgb(${clamp(r * (1 - amt))},${clamp(g * (1 - amt))},${clamp(b * (1 - amt))})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
