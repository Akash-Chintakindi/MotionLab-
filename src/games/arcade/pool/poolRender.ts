import type { AimPrediction, Ball, PoolTable } from "./poolPhysics";
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

/**
 * Aim-Assist overlay: the optimal ghost-ball line for the best makeable shot,
 * drawn in a distinct cyan so it reads as a "suggested" line, separate from the
 * player's own amber aim. All points are in table units.
 */
export interface AssistGuide {
  cue: Vec2;
  ghostBall: Vec2;
  objectPos: Vec2;
  objectDir: Vec2;
  pocket: Vec2;
}

export interface SceneState {
  table: PoolTable;
  balls: Ball[];
  targetPocketId: string | null;
  aim: { angleDeg: number; speed: number } | null;
  /** Live aim guide: where the aim ray first lands and how it rebounds. */
  aimPredict?: AimPrediction | null;
  /** Aim committed by the player: render the guide as locked-in, not live. */
  aimLocked?: boolean;
  /** Aim-Assist perk: the revealed optimal line (null when inactive). */
  assist?: AssistGuide | null;
  /** Ball-in-Hand perk: the player is dragging the cue ball into position. */
  placingCue?: boolean;
  /** Whether the current ball-in-hand drag position is a legal spot. */
  placementLegal?: boolean;
  /** Spin perk: chosen cue-ball english (x = side, y = follow+/draw−), or null. */
  cueSpin?: Vec2 | null;
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

  // Aim guide: the player's aim direction plus a prediction of the first
  // contact (ghost ball + carom, or a cushion bank).
  if (s.aim) {
    const cueBall = s.balls.find((b) => b.isCue && !b.pocketed);
    if (cueBall) {
      drawAimLine(
        ctx,
        tx,
        ty,
        u,
        cueBall,
        s.aim,
        s.balls,
        s.aimPredict ?? null,
        s.time,
        !!s.aimLocked,
      );
    }
  }

  // Aim-Assist perk: the suggested optimal line, under the live aim guide so
  // the player's own amber aim stays visually dominant.
  if (s.assist) drawAssistGuide(ctx, tx, ty, u, s.assist, s.time);

  // Pocket-drop effects sit under the balls.
  for (const fx of s.pocketFx) drawPocketFx(ctx, tx, ty, u, fx);

  for (const b of s.balls) {
    if (b.pocketed) continue;
    const reveal = b.id === s.revealObjectId ? s.revealPulse : 0;
    drawBall(ctx, tx, ty, u, b, reveal);
  }

  // Spin perk: a small marker on the cue ball showing the chosen english.
  if (s.cueSpin && (s.cueSpin.x !== 0 || s.cueSpin.y !== 0)) {
    drawSpinIndicator(ctx, tx, ty, u, s, s.cueSpin);
  }

  // Ball-in-Hand perk: a clear placement ring around the draggable cue ball.
  if (s.placingCue) drawPlacementAffordance(ctx, tx, ty, u, s);

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

  // Rolling: a sphere rolling in screen-direction `sdir` carries its surface
  // markings across the visible face (forward over the leading edge, back in at
  // the trailing one). `roll` is the accumulated angle; `sdir` flips y because
  // the table y-axis is drawn inverted. With no travel the markings sit still.
  const roll = b.roll ?? 0;
  let sdx = 0;
  let sdy = 0;
  if (b.rollDir) {
    sdx = b.rollDir.x;
    sdy = -b.rollDir.y;
  } else if (b.vel.x !== 0 || b.vel.y !== 0) {
    const vl = Math.hypot(b.vel.x, b.vel.y);
    sdx = b.vel.x / vl;
    sdy = -b.vel.y / vl;
  }
  const rolling = sdx !== 0 || sdy !== 0;
  // Perpendicular to travel, for placing markings off the roll axis.
  const spx = -sdy;
  const spy = sdx;
  // A fast break spins many radians per frame; render at a fraction of the true
  // roll so the surface reads as turning without strobing (tasteful > literal).
  const mroll = roll * 0.3;

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

  // Subtle surface freckles that orbit as the ball rolls — a cheap, clear cue
  // of motion. Each sits on the near hemisphere only (depth = cos of its phase).
  if (rolling) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.clip();
    const perp = [-0.4, 0.12, 0.46];
    for (let i = 0; i < perp.length; i++) {
      const phase = mroll + i * 2.0944;
      const depth = Math.cos(phase);
      if (depth <= 0.12) continue;
      const along = Math.sin(phase) * r * 0.62;
      const sx = px + sdx * along + spx * perp[i] * r * depth;
      const sy = py + sdy * along + spy * perp[i] * r * depth;
      ctx.globalAlpha = 0.3 * depth;
      ctx.fillStyle = darken(b.color, 0.35);
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.16 * depth, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Striped balls (9–15) wear a white equator band, clipped to the sphere. When
  // rolling it lies across the travel axis and slides over the face.
  if (b.stripe) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.93)";
    if (rolling) {
      const off = Math.sin(mroll) * r;
      ctx.translate(px + sdx * off, py + sdy * off);
      ctx.rotate(Math.atan2(sdy, sdx));
      ctx.fillRect(-r * 0.46, -r * 1.2, r * 0.92, r * 2.4);
    } else {
      ctx.fillRect(px - r, py - r * 0.46, r * 2, r * 0.92);
    }
    ctx.restore();
  }

  // Number circle for object balls. It bobs gently along the roll so it feels
  // anchored to the surface, but never spins (legibility first).
  if (b.number != null) {
    const nbx = rolling ? px + sdx * Math.sin(mroll) * r * 0.12 : px;
    const nby = rolling ? py + sdy * Math.sin(mroll) * r * 0.12 : py;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(nbx, nby, r * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#15212e";
    ctx.font = `bold ${r * 0.7}px "Space Grotesk", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(b.number), nbx, nby + r * 0.04);
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
  balls: Ball[],
  predict: AimPrediction | null,
  time: number,
  locked: boolean,
): void {
  const rad = (aim.angleDeg * Math.PI) / 180;
  const dir = { x: Math.cos(rad), y: Math.sin(rad) };
  const start = {
    x: cue.pos.x + dir.x * cue.radius,
    y: cue.pos.y + dir.y * cue.radius,
  };

  // Where the dotted travel line ends: the predicted contact, or a plain reach.
  const contact =
    predict && predict.kind !== "none"
      ? predict.contact
      : {
          x: start.x + dir.x * Math.min(28, 5 + aim.speed * 0.5),
          y: start.y + dir.y * Math.min(28, 5 + aim.speed * 0.5),
        };

  ctx.save();
  ctx.lineCap = "round";

  // Cue travel line up to the contact point. Live aim reads as a faint animated
  // dashed line (inviting adjustment); a locked aim reads as committed — a solid,
  // brighter amber beam with a soft glow.
  if (locked) {
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,214,90,0.95)";
    ctx.lineWidth = u(0.5);
    ctx.shadowColor = "rgba(255,200,60,0.8)";
    ctx.shadowBlur = u(1.6);
  } else {
    ctx.setLineDash([u(1.4), u(1)]);
    ctx.lineDashOffset = -time * u(6);
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.lineWidth = u(0.35);
  }
  ctx.beginPath();
  ctx.moveTo(tx(start.x), ty(start.y));
  ctx.lineTo(tx(contact.x), ty(contact.y));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  if (predict && predict.kind === "ball" && predict.objectDir) {
    // Faint ghost ball: the cue's footprint at the moment of contact.
    ctx.beginPath();
    ctx.arc(tx(contact.x), ty(contact.y), u(cue.radius), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = u(0.22);
    ctx.stroke();

    // Object-ball predicted path (coloured to match the struck ball).
    const objCenter = {
      x: contact.x + predict.objectDir.x * cue.radius * 2,
      y: contact.y + predict.objectDir.y * cue.radius * 2,
    };
    const struck = predict.ballId ? balls.find((b) => b.id === predict.ballId) : null;
    const objColor = struck ? lighten(struck.color, 0.35) : "rgba(255,210,120,0.95)";
    drawGuideRay(ctx, tx, ty, u, objCenter, predict.objectDir, 11, objColor, 0.45);

    // Cue carom path (white). Skipped when the cue effectively stops (head-on).
    if (predict.cueDir && Math.hypot(predict.cueDir.x, predict.cueDir.y) > 0.05) {
      drawGuideRay(
        ctx,
        tx,
        ty,
        u,
        contact,
        predict.cueDir,
        7.5,
        "rgba(235,245,255,0.92)",
        0.35,
      );
    }
  } else if (predict && predict.kind === "cushion" && predict.cueDir) {
    // Bank: a short reflected segment off the rail so the rebound reads.
    drawGuideRay(
      ctx,
      tx,
      ty,
      u,
      contact,
      predict.cueDir,
      9,
      "rgba(235,245,255,0.82)",
      0.32,
    );
    ctx.beginPath();
    ctx.arc(tx(contact.x), ty(contact.y), u(0.7), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Aim-Assist guide: a distinct cyan ghost-ball line revealing the optimal shot
 * — cue→ghost, a ghost-ball footprint, and the object→pocket lane into a
 * highlighted pocket. Kept visually separate from the player's amber aim.
 */
function drawAssistGuide(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  u: (v: number) => number,
  a: AssistGuide,
  time: number,
): void {
  const cyan = "rgba(94,231,223,0.95)";
  ctx.save();
  ctx.lineCap = "round";

  // Cue → ghost-ball line (animated dashes so it reads as a suggestion).
  ctx.setLineDash([u(1.6), u(1.1)]);
  ctx.lineDashOffset = -time * u(7);
  ctx.strokeStyle = cyan;
  ctx.lineWidth = u(0.4);
  ctx.shadowColor = "rgba(94,231,223,0.7)";
  ctx.shadowBlur = u(1.4);
  ctx.beginPath();
  ctx.moveTo(tx(a.cue.x), ty(a.cue.y));
  ctx.lineTo(tx(a.ghostBall.x), ty(a.ghostBall.y));
  ctx.stroke();
  ctx.setLineDash([]);

  // Ghost-ball footprint at contact.
  ctx.beginPath();
  ctx.arc(tx(a.ghostBall.x), ty(a.ghostBall.y), u(1.4), 0, Math.PI * 2);
  ctx.fillStyle = "rgba(94,231,223,0.12)";
  ctx.fill();
  ctx.strokeStyle = cyan;
  ctx.lineWidth = u(0.22);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Object → pocket lane.
  drawGuideRay(
    ctx,
    tx,
    ty,
    u,
    a.objectPos,
    a.objectDir,
    Math.max(6, len2(a.pocket, a.objectPos)),
    cyan,
    0.42,
  );

  // Pulsing ring on the suggested pocket.
  const pulse = 0.5 + 0.5 * Math.sin(time * 4);
  ctx.beginPath();
  ctx.arc(tx(a.pocket.x), ty(a.pocket.y), u(3.2) + pulse * u(0.8), 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(94,231,223,${0.5 + pulse * 0.4})`;
  ctx.lineWidth = u(0.6);
  ctx.shadowColor = "rgba(94,231,223,0.9)";
  ctx.shadowBlur = u(2);
  ctx.stroke();
  ctx.restore();
}

/** Straight-line table-unit distance between two points. */
function len2(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Ball-in-Hand affordance: a dashed ring + crosshair around the cue ball while
 * the player drags it, tinted green for a legal spot and red for an illegal one.
 */
function drawPlacementAffordance(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  u: (v: number) => number,
  s: SceneState,
): void {
  const cue = s.balls.find((b) => b.isCue && !b.pocketed);
  if (!cue) return;
  const px = tx(cue.pos.x);
  const py = ty(cue.pos.y);
  const legal = s.placementLegal !== false;
  const color = legal ? "rgba(74,222,128,0.95)" : "rgba(248,113,113,0.95)";
  const pulse = 0.5 + 0.5 * Math.sin(s.time * 5);

  ctx.save();
  ctx.lineCap = "round";
  ctx.setLineDash([u(1), u(0.8)]);
  ctx.lineDashOffset = -s.time * u(6);
  ctx.strokeStyle = color;
  ctx.lineWidth = u(0.45);
  ctx.shadowColor = color;
  ctx.shadowBlur = u(1.5) + pulse * u(1.5);
  ctx.beginPath();
  ctx.arc(px, py, u(cue.radius) + u(1.6), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Crosshair through the ball center.
  const reach = u(cue.radius) + u(2.6);
  ctx.lineWidth = u(0.25);
  ctx.beginPath();
  ctx.moveTo(px - reach, py);
  ctx.lineTo(px + reach, py);
  ctx.moveTo(px, py - reach);
  ctx.lineTo(px, py + reach);
  ctx.stroke();
  ctx.restore();
}

/**
 * Spin indicator: a small contact dot on the cue-ball face at the chosen
 * english offset, so the player sees where they're striking. Subtle so it
 * never competes with the aim line.
 */
function drawSpinIndicator(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  u: (v: number) => number,
  s: SceneState,
  spin: Vec2,
): void {
  const cue = s.balls.find((b) => b.isCue && !b.pocketed);
  if (!cue) return;
  const px = tx(cue.pos.x);
  const py = ty(cue.pos.y);
  const r = u(cue.radius);
  // Offset within the ball face; y flips because the canvas y-axis is inverted.
  const dx = spin.x * r * 0.62;
  const dy = -spin.y * r * 0.62;

  ctx.save();
  // Faint guide ring on the ball so the contact dot reads against any colour.
  ctx.beginPath();
  ctx.arc(px, py, r * 0.7, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(20,33,46,0.35)";
  ctx.lineWidth = u(0.18);
  ctx.stroke();
  // Contact dot.
  ctx.beginPath();
  ctx.arc(px + dx, py + dy, r * 0.26, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(244,63,94,0.95)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = u(0.16);
  ctx.stroke();
  ctx.restore();
}

/** A short solid guide ray with an arrowhead, used for predicted travel. */
function drawGuideRay(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  u: (v: number) => number,
  from: Vec2,
  dir: Vec2,
  length: number,
  color: string,
  width: number,
): void {
  const end = { x: from.x + dir.x * length, y: from.y + dir.y * length };
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = u(width);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(tx(from.x), ty(from.y));
  ctx.lineTo(tx(end.x), ty(end.y));
  ctx.stroke();

  const ang = Math.atan2(ty(end.y) - ty(from.y), tx(end.x) - tx(from.x));
  const ah = u(1.5);
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
