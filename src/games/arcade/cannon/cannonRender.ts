import type { Vec2 } from "../types";
import {
  cannonBodyCenter,
  terrainYAt,
  type Layout,
} from "./cannonLayout";
import type {
  CannonScene,
  CannonView,
  Explosion,
  FloatText,
  Particle,
  Banner,
} from "./cannonScene";

// ---------------------------------------------------------------------------
// Pure canvas rendering for the cannon duel. No React, no state mutation — the
// component owns simulation; this module only paints from the immutable
// CannonScene + the geometry Layout.
//
// Design lens (frontend-design + game-designer): a dusk battlefield with two
// CHARACTER cannons that read instantly at thumbnail size — a warm bronze
// "Old Reliable" on the player's blue side, a cold gunmetal "Iron Major" on the
// AI's red side. Every frame breathes (drifting clouds, dusk glow, idle barrel
// bob), key beats punch (muzzle flash, blooming explosions, screen flash), and
// the SHORT dotted aim arc charges as you pull back.
// Motion lens (physics-intuition): the ball arcs under gravity with a trail,
// barrels recoil and settle, and explosion debris falls back to earth.
// ---------------------------------------------------------------------------

// --- palette ---------------------------------------------------------------

const SKY_TOP = "#241a44";
const SKY_MID = "#5a3d77";
const SKY_LOW = "#e8825a";
const SUN = "#ffd98a";

const HILL_FAR = "#3b2e63";
const HILL_NEAR = "#2c2350";

const TERRAIN_TOP = "#6f9b54";
const TERRAIN_GRASS = "#8fc16a";
const TERRAIN_BODY = "#3f5c34";
const TERRAIN_DEEP = "#2a3f24";

const BLUE = "#38bdf8";
const BLUE_DEEP = "#0e7490";
const BRONZE = "#caa15a";
const BRONZE_DARK = "#7a5a24";
const WOOD = "#8a5a32";
const WOOD_DARK = "#5a3818";

const RED = "#f4554b";
const RED_DEEP = "#8f1a14";
const STEEL = "#9aa6b4";
const STEEL_DARK = "#3a4350";

const HEART = "#ff5d73";
const HEART_EMPTY = "rgba(255,255,255,0.16)";

export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: CannonScene,
): void {
  const { w, h } = layout;
  ctx.clearRect(0, 0, w, h);

  drawSky(ctx, layout, scene);
  drawFarHills(ctx, layout, scene);

  // Entrance reveal: the battlefield draws in from the left on game start.
  const reveal = scene.reduced ? 1 : Math.max(0, Math.min(1, scene.intro));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w * reveal, h);
  ctx.clip();
  drawTerrain(ctx, layout, scene);
  drawCannon(ctx, layout, scene, scene.player, "player");
  drawCannon(ctx, layout, scene, scene.ai, "ai");
  ctx.restore();

  if (scene.showBall) {
    if (!scene.reduced) drawTrail(ctx, layout, scene);
    drawBall(ctx, scene.ball, layout.ballR, scene.ballColor);
  }

  if (
    scene.screen === "play" &&
    scene.phase === "playerAim" &&
    scene.aiming &&
    scene.aimPreview.length > 1
  ) {
    drawAimArc(ctx, layout, scene);
  }

  for (const ex of scene.explosions) drawExplosion(ctx, ex);
  for (const p of scene.particles) drawParticle(ctx, p);

  if (scene.screen === "play") drawHud(ctx, layout, scene);

  for (const f of scene.floats) drawFloat(ctx, f);
  if (scene.banner) drawBanner(ctx, layout, scene.banner);

  if (scene.flash > 0.001) {
    ctx.fillStyle = `rgba(255,240,210,${Math.min(0.85, scene.flash)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

// --- sky -------------------------------------------------------------------

function drawSky(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: CannonScene,
): void {
  const { w, h } = layout;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(0.5, SKY_MID);
  grad.addColorStop(1, SKY_LOW);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Setting sun low on the AI's side — a warm focal glow.
  const sx = w * 0.74;
  const sy = h * 0.42;
  const pulse = scene.reduced ? 0.5 : 0.5 + 0.12 * Math.sin(scene.skyPulse);
  const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.4);
  halo.addColorStop(0, `rgba(255,217,138,${0.5 + pulse * 0.2})`);
  halo.addColorStop(0.4, "rgba(255,170,110,0.18)");
  halo.addColorStop(1, "rgba(255,170,110,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = SUN;
  ctx.beginPath();
  ctx.arc(sx, sy, w * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Drifting clouds.
  for (const c of scene.clouds) {
    drawCloud(ctx, c.x * w, c.y * h, c.scale * w);
  }
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
): void {
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = "#f7e6d6";
  for (const [dx, dy, r] of [
    [0, 0, 0.5],
    [0.45, 0.08, 0.38],
    [-0.42, 0.1, 0.34],
    [0.18, -0.18, 0.34],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y + dy * s, r * s, r * s * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFarHills(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: CannonScene,
): void {
  const { w, h } = layout;
  // Two parallax silhouettes behind the playfield for depth.
  drawHillBand(ctx, w, h, h * 0.52, h * 0.06, 3.2, 0.6, HILL_FAR, scene);
  drawHillBand(ctx, w, h, h * 0.6, h * 0.05, 2.1, 1.7, HILL_NEAR, scene);
}

function drawHillBand(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  baseY: number,
  amp: number,
  freq: number,
  phase: number,
  color: string,
  scene: CannonScene,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  const drift = scene.reduced ? 0 : scene.time * 4;
  for (let x = 0; x <= w; x += w / 40) {
    const y =
      baseY +
      Math.sin((x / w) * Math.PI * 2 * freq + phase) * amp +
      Math.sin((x + drift) / w * Math.PI * 5) * amp * 0.25;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

// --- terrain ---------------------------------------------------------------

function drawTerrain(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: CannonScene,
): void {
  const { w, h } = layout;
  const n = scene.terrain.heights.length - 1;

  const body = ctx.createLinearGradient(0, h * 0.4, 0, h);
  body.addColorStop(0, TERRAIN_BODY);
  body.addColorStop(1, TERRAIN_DEEP);

  // Filled ground mass.
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    ctx.lineTo(x, scene.terrain.heights[i] * h);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();

  // Grass cap — a brighter ribbon riding the surface.
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, h * 0.012);
  ctx.strokeStyle = TERRAIN_TOP;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    const y = scene.terrain.heights[i] * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.lineWidth = Math.max(1.5, h * 0.005);
  ctx.strokeStyle = TERRAIN_GRASS;
  ctx.stroke();

  // Soft top-light scanline for a little texture.
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < n; i += 2) {
    const x = (i / n) * w;
    const y = scene.terrain.heights[i] * h;
    ctx.fillRect(x, y + h * 0.012, w / n, h * 0.01);
  }
  ctx.restore();
}

// --- cannons ---------------------------------------------------------------

function drawCannon(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: CannonScene,
  view: CannonView,
  side: "player" | "ai",
): void {
  const pivot = view.pivot;
  const r = layout.cannonR;
  const isPlayer = side === "player";
  const accent = isPlayer ? BLUE : RED;
  const accentDeep = isPlayer ? BLUE_DEEP : RED_DEEP;
  const metal = isPlayer ? BRONZE : STEEL;
  const metalDark = isPlayer ? BRONZE_DARK : STEEL_DARK;

  const groundY = terrainYAt(layout, scene.terrain, pivot.x);

  // Contact shadow on the ground.
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(pivot.x, groundY + r * 0.2, r * 1.5, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- carriage / chassis ---
  if (isPlayer) {
    // Wooden field carriage with spoked wheels.
    drawWheel(ctx, pivot.x - r * 0.5, groundY - r * 0.1, r * 0.62, WOOD, WOOD_DARK);
    drawWheel(ctx, pivot.x + r * 0.6, groundY - r * 0.1, r * 0.62, WOOD, WOOD_DARK);
    ctx.fillStyle = WOOD;
    roundRect(ctx, pivot.x - r * 0.9, pivot.y - r * 0.1, r * 1.8, r * 0.7, r * 0.2);
    ctx.fill();
    ctx.fillStyle = WOOD_DARK;
    roundRect(ctx, pivot.x - r * 0.9, pivot.y + r * 0.25, r * 1.8, r * 0.3, r * 0.15);
    ctx.fill();
  } else {
    // Bolted steel tank-tread base.
    ctx.fillStyle = STEEL_DARK;
    roundRect(ctx, pivot.x - r * 1.1, groundY - r * 0.55, r * 2.2, r * 0.6, r * 0.18);
    ctx.fill();
    ctx.fillStyle = "#23282f";
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(pivot.x + i * r * 0.42, groundY - r * 0.25, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = STEEL;
    roundRect(ctx, pivot.x - r * 0.85, pivot.y - r * 0.05, r * 1.7, r * 0.6, r * 0.16);
    ctx.fill();
  }

  // --- barrel (rotates with aim, kicks back on recoil) ---
  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  const recoilK = view.recoil * r * 0.5;
  // Screen angle: y-up launch angle → screen rotation (negative for up).
  ctx.rotate(-view.angle);
  ctx.translate(-recoilK, 0);

  const len = layout.muzzleLen;
  const bw = r * 0.7;
  const barrel = ctx.createLinearGradient(0, -bw / 2, 0, bw / 2);
  barrel.addColorStop(0, metal);
  barrel.addColorStop(0.5, isPlayer ? "#f0d49a" : "#cfd8e2");
  barrel.addColorStop(1, metalDark);
  ctx.fillStyle = barrel;
  roundRect(ctx, -r * 0.2, -bw / 2, len + r * 0.2, bw, bw * 0.35);
  ctx.fill();

  // Muzzle band + bore.
  ctx.fillStyle = accentDeep;
  roundRect(ctx, len - r * 0.18, -bw * 0.62, r * 0.3, bw * 1.24, bw * 0.2);
  ctx.fill();
  ctx.fillStyle = "#140d08";
  ctx.beginPath();
  ctx.ellipse(len, 0, bw * 0.26, bw * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Muzzle flash on fire.
  if (view.muzzleFlash > 0.01 && !scene.reduced) {
    const mf = view.muzzleFlash;
    ctx.save();
    ctx.globalAlpha = mf;
    const fg = ctx.createRadialGradient(len + r * 0.2, 0, 0, len + r * 0.2, 0, r * 1.3 * mf);
    fg.addColorStop(0, "#fff3c4");
    fg.addColorStop(0.5, "#ffb13a");
    fg.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(len + r * 0.4, 0, r * 1.3 * mf, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // --- hub / turret cap ---
  ctx.fillStyle = metalDark;
  ctx.beginPath();
  ctx.arc(pivot.x, pivot.y, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(pivot.x, pivot.y, r * 0.26, 0, Math.PI * 2);
  ctx.fill();

  // --- team pennant on a little mast ---
  const flagX = pivot.x + (isPlayer ? -r * 0.95 : r * 0.95);
  const flagTop = pivot.y - r * 1.5;
  ctx.strokeStyle = "#2a2330";
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.beginPath();
  ctx.moveTo(flagX, groundY - r * 0.2);
  ctx.lineTo(flagX, flagTop);
  ctx.stroke();
  const wave = scene.reduced ? 0 : Math.sin(scene.time * 4 + (isPlayer ? 0 : 1.5)) * r * 0.12;
  ctx.fillStyle = accent;
  ctx.beginPath();
  const dir = isPlayer ? 1 : -1;
  ctx.moveTo(flagX, flagTop);
  ctx.lineTo(flagX + dir * r * 0.9, flagTop + r * 0.22 + wave);
  ctx.lineTo(flagX, flagTop + r * 0.5);
  ctx.closePath();
  ctx.fill();

  // --- shields (stacked translucent domes over the body) ---
  if (view.shields > 0) {
    drawShield(ctx, layout, scene, view, accent);
  }
}

function drawWheel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rim: string,
  spoke: string,
): void {
  ctx.fillStyle = spoke;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = spoke;
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72);
    ctx.stroke();
  }
  ctx.fillStyle = spoke;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawShield(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: CannonScene,
  view: CannonView,
  accent: string,
): void {
  const c = cannonBodyCenter(layout, scene.terrain, view.pivot.x);
  const r = layout.hitR * 1.15;
  const shimmer = scene.reduced ? 0.5 : 0.5 + 0.18 * Math.sin(scene.time * 6);
  ctx.save();
  for (let s = 0; s < view.shields; s++) {
    const rr = r + s * layout.cannonR * 0.18;
    ctx.globalAlpha = (0.12 + 0.14 * shimmer) * (1 - s * 0.18);
    const g = ctx.createRadialGradient(c.x, c.y, rr * 0.5, c.x, c.y, rr);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.7, accent);
    g.addColorStop(1, "rgba(255,255,255,0.9)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 * (1 - s * 0.2);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1.5, layout.cannonR * 0.08);
    ctx.beginPath();
    ctx.arc(c.x, c.y, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// --- ball + trail ----------------------------------------------------------

function drawTrail(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: CannonScene,
): void {
  const pts = scene.trail;
  if (pts.length < 2) return;
  for (let i = 1; i < pts.length; i++) {
    const a = i / pts.length;
    ctx.strokeStyle = `rgba(255,180,90,${a * 0.55})`;
    ctx.lineWidth = layout.ballR * 1.6 * a;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
  r: number,
  color: string,
): void {
  // Hot glow so it reads at thumbnail size.
  ctx.save();
  ctx.globalAlpha = 0.55;
  const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 2.4);
  glow.addColorStop(0, color);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const grad = ctx.createRadialGradient(
    pos.x - r * 0.35,
    pos.y - r * 0.35,
    r * 0.2,
    pos.x,
    pos.y,
    r,
  );
  grad.addColorStop(0, "#2b2b33");
  grad.addColorStop(1, "#08080c");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pos.x - r * 0.35, pos.y - r * 0.35, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// --- aim arc ---------------------------------------------------------------

function drawAimArc(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: CannonScene,
): void {
  const pts = scene.aimPreview;
  // Color charges from cool → hot as power climbs.
  const p = scene.power;
  const color =
    p < 0.5 ? "#7dd3fc" : p < 0.8 ? "#fcd34d" : "#fb7185";

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(5, layout.w * 0.02);
  ctx.lineWidth = Math.max(2.5, layout.ballR * 1.1);
  ctx.setLineDash([layout.ballR * 1.4, layout.ballR * 1.6]);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrowhead at the tip.
  const tip = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  const ah = layout.ballR * 2.1;
  ctx.fillStyle = color;
  ctx.translate(tip.x, tip.y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(ah, 0);
  ctx.lineTo(-ah * 0.5, ah * 0.55);
  ctx.lineTo(-ah * 0.5, -ah * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// --- explosions + particles ------------------------------------------------

function drawExplosion(ctx: CanvasRenderingContext2D, ex: Explosion): void {
  const u = ex.t / ex.life;
  if (u >= 1) return;
  const r = ex.r * (0.3 + u * 1.1);
  // Shockwave ring.
  ctx.save();
  ctx.globalAlpha = (1 - u) * 0.8;
  ctx.strokeStyle = ex.big ? "#ffe08a" : "#ffd2a0";
  ctx.lineWidth = ex.r * 0.16 * (1 - u);
  ctx.beginPath();
  ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Hot core.
  ctx.globalAlpha = (1 - u) * 0.95;
  const core = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, r * 0.85);
  core.addColorStop(0, "#fff6d5");
  core.addColorStop(0.4, ex.big ? "#ff9b2f" : "#ffb866");
  core.addColorStop(1, "rgba(120,40,10,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(ex.x, ex.y, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

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

// --- HUD -------------------------------------------------------------------

function drawHud(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: CannonScene,
): void {
  const { w, h } = layout;
  const hr = Math.max(9, w * 0.018);

  // Player hearts (top-left), AI hearts (top-right).
  drawHeartRow(ctx, w * 0.04, h * 0.06, hr, scene.player.hearts, 3, false);
  drawLabel(ctx, w * 0.04, h * 0.06 - hr * 1.9, "YOU", BLUE, w, false);

  drawHeartRow(ctx, w * 0.96, h * 0.06, hr, scene.ai.hearts, 3, true);
  drawLabel(ctx, w * 0.96, h * 0.06 - hr * 1.9, "RIVAL", RED, w, true);

  // Ammo chip + difficulty, centered up top.
  const turnText =
    scene.turn === "player" ? "YOUR SHOT" : "RIVAL FIRING…";
  const turnColor = scene.turn === "player" ? BLUE : RED;
  drawCenterChip(
    ctx,
    w * 0.5,
    h * 0.05,
    turnText,
    turnColor,
    w,
  );

  // Ammo readout near the player.
  drawAmmo(ctx, layout, scene);

  // Power gauge while aiming.
  if (scene.phase === "playerAim" && scene.aiming) {
    drawPowerGauge(ctx, layout, scene);
  }
}

function drawAmmo(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: CannonScene,
): void {
  const { w, h } = layout;
  const x = w * 0.04;
  const y = h * 0.13;
  const fs = Math.round(w * 0.026);
  ctx.font = `800 ${fs}px system-ui, sans-serif`;
  const label = scene.ammo > 0 ? `🎯 AMMO ${scene.ammo}` : "🎯 OUT OF AMMO";
  const tw = ctx.measureText(label).width;
  const padX = w * 0.018;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  roundRect(ctx, x, y, tw + padX * 2, fs * 1.7, fs * 0.4);
  ctx.fill();
  ctx.fillStyle = scene.ammo > 0 ? "#ffe08a" : "#fca5a5";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + padX, y + fs * 0.85);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawHeartRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hearts: number,
  max: number,
  rightAlign: boolean,
): void {
  const gap = r * 2.4;
  for (let i = 0; i < max; i++) {
    const idx = rightAlign ? max - 1 - i : i;
    const cx = rightAlign ? x - idx * gap : x + i * gap;
    drawHeart(ctx, cx, y, r, i < hearts);
  }
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  filled: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.35);
  ctx.bezierCurveTo(r, -r * 0.55, r * 1.1, r * 0.55, 0, r);
  ctx.bezierCurveTo(-r * 1.1, r * 0.55, -r, -r * 0.55, 0, r * 0.35);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = HEART;
    ctx.shadowColor = HEART;
    ctx.shadowBlur = r * 0.8;
    ctx.fill();
  } else {
    ctx.fillStyle = HEART_EMPTY;
    ctx.fill();
  }
  ctx.restore();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  w: number,
  rightAlign: boolean,
): void {
  const fs = Math.round(w * 0.026);
  ctx.font = `800 ${fs}px system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = rightAlign ? "right" : "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
  ctx.textAlign = "start";
}

function drawCenterChip(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  text: string,
  color: string,
  w: number,
): void {
  const fs = Math.round(w * 0.03);
  ctx.font = `900 ${fs}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  const padX = w * 0.025;
  const boxW = tw + padX * 2;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(ctx, cx - boxW / 2, y, boxW, fs * 1.7, fs * 0.5);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, y + fs * 0.85);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawPowerGauge(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  scene: CannonScene,
): void {
  const { w, h } = layout;
  const bw = w * 0.32;
  const bh = h * 0.03;
  const x = w * 0.5 - bw / 2;
  const y = h * 0.92;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(ctx, x - 3, y - 3, bw + 6, bh + 6, bh * 0.6);
  ctx.fill();

  const grad = ctx.createLinearGradient(x, 0, x + bw, 0);
  grad.addColorStop(0, "#38bdf8");
  grad.addColorStop(0.5, "#fcd34d");
  grad.addColorStop(1, "#fb7185");
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, bw * scene.power, bh, bh * 0.5);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = `800 ${Math.round(w * 0.024)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(
    `POWER ${Math.round(scene.power * 100)}  ·  ${Math.round((scene.aimAngle * 180) / Math.PI)}°`,
    w * 0.5,
    y - h * 0.012,
  );
  ctx.textAlign = "start";
}

// --- floats + banner -------------------------------------------------------

function drawFloat(ctx: CanvasRenderingContext2D, f: FloatText): void {
  const a = Math.max(0, 1 - f.t / f.life);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `800 ${f.size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.lineWidth = Math.max(2, f.size * 0.12);
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
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
  const scale = p < 0.25 ? easeBack(p / 0.25) : 1;
  const alpha = p > 0.8 ? Math.max(0, 1 - (p - 0.8) / 0.2) : 1;
  const size = Math.round(w * 0.085 * scale);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(4, w * 0.014);
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.strokeText(banner.text, w * 0.5, h * 0.34);
  ctx.fillStyle = banner.color;
  ctx.fillText(banner.text, w * 0.5, h * 0.34);
  if (banner.sub) {
    const ss = Math.round(w * 0.034);
    ctx.font = `700 ${ss}px system-ui, sans-serif`;
    ctx.lineWidth = Math.max(2, w * 0.008);
    ctx.strokeText(banner.sub, w * 0.5, h * 0.34 + size * 0.85);
    ctx.fillStyle = "#fde9c8";
    ctx.fillText(banner.sub, w * 0.5, h * 0.34 + size * 0.85);
  }
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
