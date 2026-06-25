import type { Vec2 } from "../types";
import type { Layout } from "./basketballLayout";
import type {
  BballScene,
  Particle,
  FloatText,
  Banner,
} from "./basketballScene";

// ---------------------------------------------------------------------------
// Pure canvas rendering for the FRONT-FACING basketball game. No React, no
// game-state mutation — every pixel is derived from the immutable `BballScene`
// and the geometry `Layout` passed in. The component owns simulation; this
// module only paints. The view looks straight at a hoop mounted on a brick
// arena wall: backboard + rim centered up top, net hanging below, the shot
// clock floating ABOVE the hoop, and the ball launched from a free-throw line
// near the bottom. Aiming is a glowing Madden-kick parabola that the player
// sweeps and locks.
//
// Design lens (game-designer): every frame moves (crowd bob, spotlight sweep,
// trail, net follow-through), key beats punch (swish net-stretch + flash +
// banner), and the silhouette reads at thumbnail size on mobile.
// Motion lens (physics-intuition): the ball arcs, the net has weight and
// overshoots on a swish (squash/stretch + follow-through + slow-out), and the
// aim arc obeys gravity's curve.
// ---------------------------------------------------------------------------

// --- palette ---------------------------------------------------------------

const WALL_TOP = "#2a1640";
const WALL_MID = "#3a1d4d";
const WALL_BOT = "#241433";
const BRICK_LINE = "rgba(0,0,0,0.18)";
const FLOOR_TOP = "#c8843e";
const FLOOR_BOT = "#8f5220";
const RIM = "#ff7a1a";
const RIM_DARK = "#c8500a";
const BALL_LIGHT = "#ff9e42";
const BALL_DARK = "#d2641a";
const SEAM = "#5e2208";
const NET = "rgba(255,255,255,0.82)";

const AIM_SWEEP = "#ffd23f";
const AIM_GOOD = "#22c55e";
const AIM_BAD = "#ef4444";

export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: BballScene,
): void {
  const { w, h } = layout;
  ctx.clearRect(0, 0, w, h);

  // 1. Arena back wall + atmosphere.
  drawArena(ctx, layout);
  if (!scene.reduced) drawSpotlight(ctx, layout, scene);
  drawCrowd(ctx, layout, scene);

  // 2. Floor + shooting line + court paint.
  drawFloor(ctx, layout);

  // 3. Backboard, then 4. the BACK half of the rim (so the net hangs inside).
  drawBackboard(ctx, layout, scene);
  drawRimBack(ctx, layout);

  // 5. Net hanging below the rim (sway + swish stretch).
  drawNet(ctx, layout, scene);

  // 4 (cont). FRONT half of the rim, after the net for depth.
  drawRimFront(ctx, layout);

  // 6. Ball trail then the ball itself.
  if (!scene.reduced) drawTrail(ctx, layout, scene);
  if (scene.showBall) {
    drawBall(ctx, scene.ball, layout.ballR * scene.ballScale, scene.ballSpin);
  }

  // 7. Aim-preview parabola (Madden kick), only while aiming/charging.
  if (
    scene.screen === "play" &&
    (scene.phase === "aim" || scene.phase === "power")
  ) {
    drawAimArc(ctx, layout, scene);
  }

  // 8. Power meter, only while charging.
  if (scene.screen === "play" && scene.phase === "power") {
    drawPowerMeter(ctx, layout, scene);
  }

  // 9. Particles, HUD, floats, banner, flash.
  for (const p of scene.particles) drawParticle(ctx, p);

  if (scene.screen === "play") drawHud(ctx, layout, scene);

  for (const f of scene.floats) drawFloat(ctx, f);
  if (scene.banner) drawBanner(ctx, layout, scene.banner);

  if (scene.flash > 0.001) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, scene.flash)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

// --- background ------------------------------------------------------------

function drawArena(ctx: CanvasRenderingContext2D, layout: Layout): void {
  const { w, h } = layout;
  const floorTop = h * 0.74;

  const wall = ctx.createLinearGradient(0, 0, 0, floorTop);
  wall.addColorStop(0, WALL_TOP);
  wall.addColorStop(0.55, WALL_MID);
  wall.addColorStop(1, WALL_BOT);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, floorTop);

  // Brick courses — running-bond pattern, cheap and only on the wall band.
  ctx.save();
  ctx.strokeStyle = BRICK_LINE;
  ctx.lineWidth = 1;
  const brickH = Math.max(10, h * 0.028);
  const brickW = Math.max(28, w * 0.16);
  let row = 0;
  for (let y = 0; y < floorTop; y += brickH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    const offset = row % 2 === 0 ? 0 : brickW * 0.5;
    for (let x = offset; x < w; x += brickW) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + brickH);
      ctx.stroke();
    }
    row++;
  }
  ctx.restore();

  // Arena banner stripes high on the wall for color + brand energy.
  ctx.save();
  ctx.globalAlpha = 0.16;
  const stripes = ["#ff7a1a", "#5cc8ff", "#ffd23f"];
  for (let i = 0; i < stripes.length; i++) {
    ctx.fillStyle = stripes[i];
    ctx.fillRect(0, h * (0.045 + i * 0.05), w, h * 0.02);
  }
  ctx.restore();
}

function drawSpotlight(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: BballScene,
): void {
  const { w, h } = layout;
  // Two offset sweeping cones for a stadium feel; deterministic from phase.
  drawCone(ctx, w * (0.5 + 0.34 * Math.sin(scene.lightPhase)), w, h);
  drawCone(
    ctx,
    w * (0.5 + 0.34 * Math.sin(scene.lightPhase * 0.7 + 2.1)),
    w,
    h,
  );
}

function drawCone(
  ctx: CanvasRenderingContext2D,
  cx: number,
  w: number,
  h: number,
): void {
  const grad = ctx.createRadialGradient(cx, -h * 0.05, 0, cx, -h * 0.05, h * 0.7);
  grad.addColorStop(0, "rgba(255,246,214,0.20)");
  grad.addColorStop(1, "rgba(255,246,214,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h * 0.74);
}

function drawCrowd(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: BballScene,
): void {
  const { w } = layout;
  const r = Math.max(2, w * 0.013);
  ctx.save();
  ctx.globalAlpha = 0.85;
  for (const c of scene.crowd) {
    const bob = scene.reduced ? 0 : Math.sin(c.phase) * c.amp;
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(c.x, c.y + bob, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFloor(ctx: CanvasRenderingContext2D, layout: Layout): void {
  const { w, h } = layout;
  const top = h * 0.74;

  const floor = ctx.createLinearGradient(0, top, 0, h);
  floor.addColorStop(0, FLOOR_TOP);
  floor.addColorStop(1, FLOOR_BOT);
  ctx.fillStyle = floor;
  ctx.fillRect(0, top, w, h - top);

  // Floorboard seams.
  ctx.strokeStyle = "rgba(70,35,8,0.35)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 7; i++) {
    const y = top + ((h - top) * i) / 7;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Free-throw key (perspective trapezoid) for court flavor.
  ctx.fillStyle = "rgba(255,120,26,0.14)";
  ctx.beginPath();
  ctx.moveTo(w * 0.16, h);
  ctx.lineTo(w * 0.84, h);
  ctx.lineTo(w * 0.64, top + (h - top) * 0.2);
  ctx.lineTo(w * 0.36, top + (h - top) * 0.2);
  ctx.closePath();
  ctx.fill();

  // The shooting / free-throw LINE the ball launches from.
  const lineY = layout.spawnY;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(3, h * 0.006);
  ctx.beginPath();
  ctx.moveTo(layout.spawnXMin - w * 0.02, lineY);
  ctx.lineTo(layout.spawnXMax + w * 0.02, lineY);
  ctx.stroke();

  // Soft glow under the line so it reads at thumbnail size.
  ctx.save();
  ctx.globalAlpha = 0.5;
  const g = ctx.createLinearGradient(0, lineY, 0, lineY + h * 0.04);
  g.addColorStop(0, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(layout.spawnXMin, lineY, layout.spawnXMax - layout.spawnXMin, h * 0.04);
  ctx.restore();
}

// --- hoop ------------------------------------------------------------------

function drawBackboard(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: BballScene,
): void {
  const { board, w } = layout;

  // Mounting pole + arm behind the board.
  ctx.strokeStyle = "#1f1a2b";
  ctx.lineWidth = Math.max(4, w * 0.014);
  ctx.beginPath();
  ctx.moveTo(board.x + board.w * 0.5, board.y - layout.h * 0.04);
  ctx.lineTo(board.x + board.w * 0.5, board.y);
  ctx.stroke();

  // Board face.
  ctx.fillStyle = "rgba(247,251,255,0.94)";
  roundRect(ctx, board.x, board.y, board.w, board.h, 6);
  ctx.fill();

  // Orange frame.
  ctx.strokeStyle = RIM_DARK;
  ctx.lineWidth = Math.max(3, w * 0.01);
  roundRect(ctx, board.x, board.y, board.w, board.h, 6);
  ctx.stroke();

  // Inner target square — flashes warm on a make for satisfying feedback.
  const sq = {
    x: board.x + board.w * 0.3,
    y: board.y + board.h * 0.32,
    w: board.w * 0.4,
    h: board.h * 0.46,
  };
  const hit = Math.max(0, Math.min(1, scene.netStretch));
  if (hit > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.5 * hit;
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(sq.x, sq.y, sq.w, sq.h);
    ctx.restore();
  }
  ctx.strokeStyle = RIM;
  ctx.lineWidth = Math.max(2.5, w * 0.008);
  ctx.strokeRect(sq.x, sq.y, sq.w, sq.h);
}

function drawRimBack(ctx: CanvasRenderingContext2D, layout: Layout): void {
  const { hoop, rimRx, rimRy, w } = layout;
  ctx.strokeStyle = RIM_DARK;
  ctx.lineWidth = Math.max(3, w * 0.016);
  ctx.beginPath();
  ctx.ellipse(hoop.x, hoop.y, rimRx, rimRy, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
}

function drawRimFront(ctx: CanvasRenderingContext2D, layout: Layout): void {
  const { hoop, rimRx, rimRy, w } = layout;
  ctx.strokeStyle = RIM;
  ctx.lineWidth = Math.max(3, w * 0.018);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.ellipse(hoop.x, hoop.y, rimRx, rimRy, 0, 0, Math.PI);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function drawNet(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: BballScene,
): void {
  const { hoop, rimRx, rimRy, netDrop } = layout;
  const sway = scene.reduced ? 0 : scene.netSway;
  // Swish follow-through: the bag of the net bulges DOWN then snaps back.
  // physics-intuition — mass conserved (volume goes somewhere), with
  // overshoot/slow-out handled by the spring that feeds netStretch.
  const stretch = scene.reduced ? 0 : Math.max(0, scene.netStretch);
  const drop = netDrop * (1 + stretch * 0.7);
  // Bottom pinch tightens as the ball punches through (squash inward).
  const pinch = 0.42 - stretch * 0.16;
  const strands = 9;

  const topPts: Vec2[] = [];
  const botPts: Vec2[] = [];
  for (let i = 0; i <= strands; i++) {
    const a = Math.PI * (i / strands); // front arc 0..PI
    const tx = hoop.x + Math.cos(a) * rimRx;
    const ty = hoop.y + Math.sin(a) * rimRy;
    const bx = hoop.x + Math.cos(a) * rimRx * pinch + sway;
    const by = hoop.y + drop;
    topPts.push({ x: tx, y: ty });
    botPts.push({ x: bx, y: by });
  }

  ctx.strokeStyle = NET;
  ctx.lineWidth = 1.4;

  // Vertical strands. The mid control point lags the sway (secondary action)
  // and sags more on a swish (overlapping action / follow-through).
  const midSag = drop * 0.12 + stretch * netDrop * 0.25;
  for (let i = 0; i <= strands; i++) {
    const mx = (topPts[i].x + botPts[i].x) / 2 + sway * 0.55;
    const my = (topPts[i].y + botPts[i].y) / 2 + midSag;
    ctx.beginPath();
    ctx.moveTo(topPts[i].x, topPts[i].y);
    ctx.quadraticCurveTo(mx, my, botPts[i].x, botPts[i].y);
    ctx.stroke();
  }

  // Cross-weave rows woven between the strands.
  for (let row = 1; row <= 2; row++) {
    const f = row / 3;
    ctx.beginPath();
    for (let i = 0; i <= strands; i++) {
      const x = topPts[i].x + (botPts[i].x - topPts[i].x) * f;
      const y = topPts[i].y + (botPts[i].y - topPts[i].y) * f + midSag * f;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// --- ball ------------------------------------------------------------------

function drawTrail(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: BballScene,
): void {
  const pts = scene.trail;
  if (pts.length < 2) return;
  for (let i = 1; i < pts.length; i++) {
    const a = i / pts.length;
    ctx.strokeStyle = `rgba(255,150,60,${a * 0.5})`;
    ctx.lineWidth = layout.ballR * a;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
  r: number,
  spin: number,
): void {
  // Contact shadow grounds the ball; shrinks/fades with the faux-depth radius.
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y + r * 0.95, r * 0.85, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(spin);

  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.2, 0, 0, r);
  grad.addColorStop(0, BALL_LIGHT);
  grad.addColorStop(1, BALL_DARK);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = SEAM;
  ctx.lineWidth = Math.max(1.2, r * 0.07);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.55, r, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// --- aim arc (Madden kick) -------------------------------------------------

function drawAimArc(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: BballScene,
): void {
  const pts = scene.aimPreview;
  if (pts.length < 2) return;

  const color = !scene.aimLocked
    ? AIM_SWEEP
    : scene.aimGood
      ? AIM_GOOD
      : AIM_BAD;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(6, layout.w * 0.03);
  ctx.lineWidth = Math.max(2.5, layout.ballR * 0.26);
  ctx.setLineDash([layout.ballR * 0.55, layout.ballR * 0.5]);

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrowhead at the last point, oriented along the final segment.
  const tip = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  const ah = layout.ballR * 0.7;
  ctx.fillStyle = color;
  ctx.translate(tip.x, tip.y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(ah, 0);
  ctx.lineTo(-ah * 0.55, ah * 0.55);
  ctx.lineTo(-ah * 0.55, -ah * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// --- power meter -----------------------------------------------------------

interface Band {
  from: number;
  to: number;
  color: string;
}

function buildPowerBands(green: number, half: number): Band[] {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const g = Math.max(0.02, half);
  const l = g * 2.2; // light-yellow reaches a bit past green
  const d = g * 3.4; // dark-yellow further out
  const bands: Band[] = [
    { from: 0, to: clamp(green - d), color: "#ef4444" },
    { from: clamp(green - d), to: clamp(green - l), color: "#a16207" },
    { from: clamp(green - l), to: clamp(green - g), color: "#fde047" },
    { from: clamp(green - g), to: clamp(green + g), color: "#22c55e" },
    { from: clamp(green + g), to: clamp(green + l), color: "#fde047" },
    { from: clamp(green + l), to: clamp(green + d), color: "#a16207" },
    { from: clamp(green + d), to: 1, color: "#ef4444" },
  ];
  return bands;
}

function drawPowerMeter(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: BballScene,
): void {
  const { power, w } = layout;

  // Frame.
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(ctx, power.x - 4, power.y - 4, power.w + 8, power.h + 8, 8);
  ctx.fill();

  // Bands — green sweet-spot is DYNAMIC from scene.powerGreen/powerHalf.
  const bands = buildPowerBands(scene.powerGreen, scene.powerHalf);
  for (const b of bands) {
    if (b.to <= b.from) continue;
    const yTop = power.y + (1 - b.to) * power.h;
    const yBot = power.y + (1 - b.from) * power.h;
    ctx.fillStyle = b.color;
    ctx.fillRect(power.x, yTop, power.w, yBot - yTop);
  }

  // Subtle glow on the green band so the target pops.
  const gTop = power.y + (1 - Math.min(1, scene.powerGreen + scene.powerHalf)) * power.h;
  const gBot = power.y + (1 - Math.max(0, scene.powerGreen - scene.powerHalf)) * power.h;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#bbf7d0";
  ctx.lineWidth = 2;
  ctx.strokeRect(power.x, gTop, power.w, gBot - gTop);
  ctx.restore();

  // Moving indicator at scene.power.
  const iy = power.y + (1 - Math.max(0, Math.min(1, scene.power))) * power.h;
  ctx.fillStyle = "#fff";
  ctx.fillRect(power.x - 6, iy - 2.5, power.w + 12, 5);
  ctx.beginPath();
  ctx.moveTo(power.x - 6, iy);
  ctx.lineTo(power.x - 15, iy - 7);
  ctx.lineTo(power.x - 15, iy + 7);
  ctx.closePath();
  ctx.fill();

  // Label.
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${Math.round(w * 0.032)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("PWR", power.x + power.w * 0.5, power.y - 10);
  ctx.textAlign = "start";
}

// --- HUD -------------------------------------------------------------------

function drawHud(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: BballScene,
): void {
  const { w, h, board, hoop } = layout;

  // Shot clock — ABOVE the hoop (GamePigeon reference), big monospace 0:SS,
  // pulsing red in the final 10 seconds.
  const low = scene.remaining <= 10;
  const pulse = low && !scene.reduced ? 1 + 0.1 * Math.sin(scene.time * 10) : 1;
  const secs = Math.max(0, Math.ceil(scene.remaining));
  const clockSize = Math.round(w * 0.11 * pulse);
  const cx = hoop.x;
  const cy = Math.max(clockSize * 0.7, board.y - h * 0.05);

  ctx.save();
  ctx.font = `800 ${clockSize}px "Courier New", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Backing pill for legibility against the wall.
  const label = `0:${secs.toString().padStart(2, "0")}`;
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  roundRect(ctx, cx - tw * 0.5 - w * 0.03, cy - clockSize * 0.62, tw + w * 0.06, clockSize * 1.24, clockSize * 0.3);
  ctx.fill();
  ctx.lineWidth = Math.max(3, w * 0.011);
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.fillStyle = low ? "#ff4444" : "#ffffff";
  ctx.strokeText(label, cx, cy);
  ctx.fillText(label, cx, cy);
  ctx.restore();

  // Score chip (top-left).
  drawChip(ctx, w * 0.04, h * 0.03, `SCORE ${scene.score}`, "#ffd23f", w);

  // High-score chip just below the score, if it fits.
  drawChip(ctx, w * 0.04, h * 0.03 + Math.round(w * 0.038) * 1.7 + h * 0.012, `BEST ${scene.highScore}`, "#9fb4ff", w);

  // Combo chip (top-right) when hot.
  if (scene.combo >= 2) {
    drawChip(ctx, w * 0.96, h * 0.03, `${scene.combo}x COMBO`, "#ff7a1a", w, true);
  }
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  w: number,
  rightAlign = false,
): void {
  const fs = Math.round(w * 0.038);
  ctx.font = `800 ${fs}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  const padX = w * 0.025;
  const boxW = tw + padX * 2;
  const boxH = fs * 1.7;
  const bx = rightAlign ? x - boxW : x;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(ctx, bx, y, boxW, boxH, boxH * 0.4);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx + padX, y + boxH * 0.5);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "start";
}

// --- fx --------------------------------------------------------------------

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const a = Math.max(0, p.life / p.maxLife);
  if (a <= 0) return;
  ctx.globalAlpha = a;
  ctx.fillStyle = p.color;
  if (p.spin != null) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);
    ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloat(ctx: CanvasRenderingContext2D, f: FloatText): void {
  const a = Math.max(0, 1 - f.t / f.life);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `800 ${f.size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.lineWidth = Math.max(2, f.size * 0.12);
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.strokeText(f.text, f.x, f.y);
  ctx.fillStyle = f.color;
  ctx.fillText(f.text, f.x, f.y);
  ctx.restore();
  ctx.textAlign = "start";
}

function drawBanner(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  banner: Banner,
): void {
  const { w, h } = layout;
  const p = banner.t / banner.life;
  // Pop in with overshoot (anticipation→release), hold, fade at the tail.
  const scale = p < 0.25 ? easeBack(p / 0.25) : 1;
  const alpha = p > 0.8 ? Math.max(0, 1 - (p - 0.8) / 0.2) : 1;
  const size = Math.round(w * 0.13 * scale);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(4, w * 0.02);
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.strokeText(banner.text, w * 0.5, h * 0.46);
  ctx.fillStyle = banner.color;
  ctx.fillText(banner.text, w * 0.5, h * 0.46);
  ctx.restore();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "start";
}

// --- helpers ---------------------------------------------------------------

function easeBack(t: number): number {
  const c = 1.70158 + 1;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
