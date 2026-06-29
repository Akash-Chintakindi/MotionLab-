import type { BossScene, BossSceneParticle, FighterPose } from "./bossScene";
import type { BossShape, HitSpark } from "./bossTypes";

// ---------------------------------------------------------------------------
// Pure Canvas 2D renderer for Boss Fight Mode — a Shadow Fight 2-style 2D
// silhouette brawler. The React shell scales the context for devicePixelRatio,
// then calls drawScene(ctx, scene) once per frame; this module fully paints the
// frame from the immutable BossScene only (cosmic arena + two articulated
// fighters + HUD + FX + screen backdrops). It never touches the engine, never
// reads the DOM, and never sizes the canvas. All art is programmatic vector
// work — no external image assets.
//
// IDENTITY (frontend-design / game-designer): every boss is driven by a
// `BossSkin` keyed off `scene.bossShape`, so all 11 read as distinct
// characters, not one recolored stick figure. Each skin varies BUILD (lean /
// bulky / towering / wispy — limb thickness, torso width, height), HEAD +
// headgear (wraith hood, blocky crown, haloed orb, anvil, serpent crest,
// faceted prism, dark Vektor echo, void head with lensing, …), a SIGNATURE
// color treatment off the palette, an integral MOTIF/aura, and a personal
// IDLE behaviour (hover, sway, twitch, loom, sink, metronome pulse).
//
// LIFE (physics-intuition / motion-graphics): both fighters breathe and shift
// weight at rest; strikes anticipate on startup, extend with weight on the
// active frame, and recoil on recovery; fast/heavy swings leave motion smears;
// hits jolt with follow-through jitter; feet scuff dust. Heavy motion is killed
// when `scene.reduced` is set. Allocation-light, ~60fps.
// ---------------------------------------------------------------------------

const TOP_SAFE = 0.1; // top 10% reserved for the platform widget bar.
const TAU = Math.PI * 2;

const FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

const PLAYER_GLOW = "#5cc8ff";
const PLAYER_EDGE = "#bff0ff";
const PLAYER_BODY_HI = "#7fe0ff";
const PLAYER_BODY_LO = "#1c4f7a";

const HP_BACK = "rgba(8,6,18,0.72)";
const HP_FRAME = "rgba(255,255,255,0.24)";
const PLAYER_HP = "#46e0a0";
const HP_LOW = "#ff5b6b";
const BOSS_HP = "#ff5b6b";
const TEXT = "#f4f1ff";

// --- per-boss identity ------------------------------------------------------

type HeadType =
  | "visor" // Vektor: clean vector head with a forward visor
  | "wraithHood" // slopeWraith: angular hooded specter
  | "arrowhead" // accelArrow: forward chevron of light
  | "crown" // riemannTower: blocky crowned monolith
  | "halo" // ringCore: orb head ringed by a halo
  | "crossCrest" // componentCross: plus-crest two-axis head
  | "comet" // arcComet: round core trailing a tail
  | "anvil" // gravityOrb: heavy anvil skull
  | "prism" // framePrism: faceted iridescent gem
  | "serpentCrest" // sineSerpent: swept-back wave fins
  | "echo" // mirror: a dark reflection of Vektor
  | "void"; // singularity: black head with a lensing rim

type AuraKind =
  | "vector" // Vektor: subtle motion ticks
  | "slope"
  | "speed"
  | "tower"
  | "rings"
  | "cross"
  | "comet"
  | "gravity"
  | "prism"
  | "serpent"
  | "mirror"
  | "singularity";

type IdleKind = "steady" | "sway" | "twitch" | "loom" | "hover" | "pulse" | "sink";

interface BossSkin {
  head: HeadType;
  aura: AuraKind;
  idle: IdleKind;
  /** Body height scale (torso + legs + hip). */
  heightMult: number;
  /** Limb stroke-width multiplier. */
  limbThickness: number;
  /** Torso half-width multiplier (build silhouette). */
  torsoWidth: number;
  /** Head radius multiplier. */
  headScale: number;
  /** Breathing speed + depth (idle weight). */
  breatheRate: number;
  breatheDepth: number;
  /** Float amplitude in units (0 = grounded). */
  hover: number;
  /** Idle tilt amplitude in radians. */
  sway: number;
  /** Edge-glow blur. */
  glowBlur: number;
}

const VEKTOR_SKIN: BossSkin = {
  head: "visor",
  aura: "vector",
  idle: "steady",
  heightMult: 1,
  limbThickness: 1,
  torsoWidth: 1,
  headScale: 1,
  breatheRate: 2.2,
  breatheDepth: 1,
  hover: 0,
  sway: 0.014,
  glowBlur: 16,
};

// Built once at module load — no per-frame allocation.
const SKINS: Record<BossShape, BossSkin> = {
  // Tall, lean, hooded specter that tilts like a tangent line.
  slopeWraith: {
    head: "wraithHood",
    aura: "slope",
    idle: "sway",
    heightMult: 1.2,
    limbThickness: 0.8,
    torsoWidth: 0.8,
    headScale: 1.05,
    breatheRate: 1.5,
    breatheDepth: 1.2,
    hover: 0,
    sway: 0.07,
    glowBlur: 18,
  },
  // Lean, forward-leaning arrow that twitches as it charges.
  accelArrow: {
    head: "arrowhead",
    aura: "speed",
    idle: "twitch",
    heightMult: 1.02,
    limbThickness: 0.84,
    torsoWidth: 0.86,
    headScale: 0.95,
    breatheRate: 3.8,
    breatheDepth: 0.8,
    hover: 0,
    sway: 0.02,
    glowBlur: 20,
  },
  // Towering, blocky monolith that looms upward.
  riemannTower: {
    head: "crown",
    aura: "tower",
    idle: "loom",
    heightMult: 1.28,
    limbThickness: 1.22,
    torsoWidth: 1.28,
    headScale: 1.0,
    breatheRate: 1.15,
    breatheDepth: 1.4,
    hover: 0,
    sway: 0.012,
    glowBlur: 14,
  },
  // Hovering haloed orb wrapped in nested rotating rings.
  ringCore: {
    head: "halo",
    aura: "rings",
    idle: "hover",
    heightMult: 1.0,
    limbThickness: 0.95,
    torsoWidth: 1.0,
    headScale: 1.05,
    breatheRate: 2.0,
    breatheDepth: 1.0,
    hover: 0.2,
    sway: 0.02,
    glowBlur: 18,
  },
  // Broad, cross-built twin with perpendicular axis arms.
  componentCross: {
    head: "crossCrest",
    aura: "cross",
    idle: "twitch",
    heightMult: 1.05,
    limbThickness: 1.02,
    torsoWidth: 1.22,
    headScale: 1.0,
    breatheRate: 2.4,
    breatheDepth: 1.0,
    hover: 0,
    sway: 0.03,
    glowBlur: 16,
  },
  // Lean, drifting comet trailing a fiery tail.
  arcComet: {
    head: "comet",
    aura: "comet",
    idle: "hover",
    heightMult: 1.0,
    limbThickness: 0.84,
    torsoWidth: 0.9,
    headScale: 1.0,
    breatheRate: 2.2,
    breatheDepth: 1.0,
    hover: 0.13,
    sway: 0.03,
    glowBlur: 20,
  },
  // Massive, dense, heavy bruiser with an anvil head that sinks.
  gravityOrb: {
    head: "anvil",
    aura: "gravity",
    idle: "sink",
    heightMult: 0.96,
    limbThickness: 1.5,
    torsoWidth: 1.42,
    headScale: 1.18,
    breatheRate: 1.0,
    breatheDepth: 1.5,
    hover: 0,
    sway: 0.01,
    glowBlur: 16,
  },
  // Iridescent prism that drags ghost echoes of itself.
  framePrism: {
    head: "prism",
    aura: "prism",
    idle: "hover",
    heightMult: 1.06,
    limbThickness: 0.92,
    torsoWidth: 0.96,
    headScale: 1.0,
    breatheRate: 2.0,
    breatheDepth: 1.0,
    hover: 0.09,
    sway: 0.045,
    glowBlur: 18,
  },
  // Wispy serpent that sways like x = A·cos(ωt) on a metronome.
  sineSerpent: {
    head: "serpentCrest",
    aura: "serpent",
    idle: "pulse",
    heightMult: 1.14,
    limbThickness: 0.78,
    torsoWidth: 0.8,
    headScale: 0.98,
    breatheRate: 2.0,
    breatheDepth: 1.1,
    hover: 0.07,
    sway: 0.08,
    glowBlur: 18,
  },
  // A dark echo of Vektor — same build, inverted treatment.
  mirror: {
    head: "echo",
    aura: "mirror",
    idle: "steady",
    heightMult: 1.0,
    limbThickness: 1.0,
    torsoWidth: 1.0,
    headScale: 1.0,
    breatheRate: 2.2,
    breatheDepth: 1.0,
    hover: 0,
    sway: 0.016,
    glowBlur: 18,
  },
  // Floating void with a lensed event-horizon head + accretion disk.
  singularity: {
    head: "void",
    aura: "singularity",
    idle: "hover",
    heightMult: 1.12,
    limbThickness: 1.06,
    torsoWidth: 1.06,
    headScale: 1.12,
    breatheRate: 1.4,
    breatheDepth: 1.1,
    hover: 0.17,
    sway: 0.025,
    glowBlur: 24,
  },
};

export function drawScene(ctx: CanvasRenderingContext2D, scene: BossScene): void {
  const { width, height } = scene.layout;
  const skin = SKINS[scene.bossShape] ?? VEKTOR_SKIN;

  ctx.fillStyle = "#04030a";
  ctx.fillRect(0, 0, width, height);

  const shake = scene.reduced ? 0 : scene.shake;
  const amp = shake * scene.layout.scale * 13;
  const sx = amp ? Math.sin(scene.time * 97) * amp : 0;
  const sy = amp ? Math.cos(scene.time * 113) * amp : 0;

  ctx.save();
  if (amp) ctx.translate(sx, sy);

  drawArena(ctx, scene);

  // Back fighter (boss) first, player in front, with grounding shadows.
  drawShadow(ctx, scene, scene.boss, skin);
  drawShadow(ctx, scene, scene.player, VEKTOR_SKIN);
  drawFighter(ctx, scene, scene.boss, true, skin);
  drawFighter(ctx, scene, scene.player, false, VEKTOR_SKIN);

  for (const p of scene.particles) drawParticle(ctx, p);
  for (const s of scene.hitSparks) drawSpark(ctx, scene, s);

  ctx.restore();

  // HUD + overlays ride above the shake so they stay legible.
  if (scene.screen === "fighting" || scene.screen === "intro") {
    drawHud(ctx, scene);
  }
  drawComboText(ctx, scene);
  if (scene.banner) drawBanner(ctx, scene);
  drawScreen(ctx, scene);

  if (scene.flash > 0.001) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, scene.flash)})`;
    ctx.fillRect(0, 0, width, height);
  }
}

// --- arena -----------------------------------------------------------------

function drawArena(ctx: CanvasRenderingContext2D, scene: BossScene): void {
  const { width: w, height: h, groundY } = scene.layout;
  const t = scene.reduced ? 0 : scene.time;

  // Sky tinted by the boss palette.
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, "#06040f");
  sky.addColorStop(0.5, rgba(scene.bossSecondary, 0.34));
  sky.addColorStop(1, "#070512");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, groundY);

  drawNebula(ctx, w * 0.3 + Math.sin(t * 0.21) * w * 0.06, h * 0.26, w * 0.52, scene.bossPrimary, 0.2);
  drawNebula(ctx, w * 0.74 + Math.cos(t * 0.17) * w * 0.05, h * 0.34, w * 0.44, scene.bossAccent, 0.13);

  drawStars(ctx, scene, t);
  drawSkyline(ctx, scene, t);
  drawGround(ctx, scene, t);
}

function drawNebula(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  alpha: number,
): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

function drawStars(ctx: CanvasRenderingContext2D, scene: BossScene, t: number): void {
  const { width: w, groundY } = scene.layout;
  const count = 84;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const hx = hash(i * 2 + 1);
    const hy = hash(i * 2 + 2);
    const depth = 0.3 + hx * 0.7;
    const x = hx * w;
    const y = (hy * groundY + t * 8 * depth) % groundY;
    const twinkle = scene.reduced ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin(t * (1 + hy * 2) + i));
    const r = (0.5 + hx * 1.5) * scene.layout.scale;
    ctx.globalAlpha = twinkle * (0.4 + depth * 0.6);
    ctx.fillStyle = i % 7 === 0 ? scene.bossAccent : "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Distant parallax pillars drifting slowly behind the action (depth + motion).
// framePrism drags them faster so the arena appears to scroll (relative motion).
function drawSkyline(ctx: CanvasRenderingContext2D, scene: BossScene, t: number): void {
  const { width: w, groundY } = scene.layout;
  const dragMult = scene.bossShape === "framePrism" ? 4 : 1;
  const drift = (t * 6 * dragMult) % (w * 0.34);
  ctx.save();
  ctx.globalAlpha = 0.22;
  for (let i = -1; i < 8; i++) {
    const seed = hash(i * 3 + 5);
    const x = i * w * 0.34 - drift;
    const pw = w * (0.06 + seed * 0.05);
    const ph = groundY * (0.28 + seed * 0.4);
    ctx.fillStyle = rgba(scene.bossPrimary, 0.5);
    ctx.fillRect(x, groundY - ph, pw, ph);
    ctx.fillStyle = rgba(scene.bossAccent, 0.5);
    ctx.fillRect(x + pw * 0.4, groundY - ph * 0.7, pw * 0.18, ph * 0.7);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, scene: BossScene, t: number): void {
  const { width: w, height: h, groundY, scale } = scene.layout;

  // Ground plane with depth shading, tinted by the palette.
  const g = ctx.createLinearGradient(0, groundY, 0, h);
  g.addColorStop(0, rgba(scene.bossPrimary, 0.34));
  g.addColorStop(0.18, "#0a0818");
  g.addColorStop(1, "#020106");
  ctx.fillStyle = g;
  ctx.fillRect(0, groundY, w, h - groundY);

  // Receding perspective rungs scrolling toward the viewer (motion underfoot).
  ctx.save();
  ctx.strokeStyle = rgba(scene.bossPrimary, 0.35);
  ctx.lineWidth = Math.max(1, scale);
  const rows = 9;
  const scroll = scene.reduced ? 0 : (t * 0.4) % 1;
  for (let i = 0; i < rows; i++) {
    const f = (i + scroll) / rows;
    const yy = groundY + (h - groundY) * f * f;
    ctx.globalAlpha = (1 - f) * 0.6 + 0.08;
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(w, yy);
    ctx.stroke();
  }
  // Converging verticals toward a vanishing point above the floor.
  ctx.globalAlpha = 0.3;
  const vx = w * 0.5;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(vx + i * 6, groundY);
    ctx.lineTo(vx + i * (w / 6), h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Bright glowing horizon edge so the ground plane reads at a glance.
  ctx.save();
  beginGlow(ctx, scene.bossPrimary, 16);
  ctx.strokeStyle = rgba(scene.bossAccent, 0.85);
  ctx.lineWidth = Math.max(2, scale * 2);
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.stroke();
  endGlow(ctx);
  ctx.restore();
}

// --- fighters --------------------------------------------------------------

interface Joint {
  x: number;
  y: number;
}

interface Rig {
  hip: Joint;
  shoulder: Joint;
  head: Joint;
  headR: number;
  legBack: { root: Joint; knee: Joint; foot: Joint };
  legFront: { root: Joint; knee: Joint; foot: Joint };
  armBack: { root: Joint; elbow: Joint; hand: Joint };
  armFront: { root: Joint; elbow: Joint; hand: Joint };
  lieAngle: number;
  alpha: number;
  guard: "none" | "high" | "low";
  /** True only during the active frame of an attack (drives smears). */
  swinging: boolean;
}

interface FighterStyle {
  glow: string;
  edge: string;
  bodyHi: string;
  bodyLo: string;
  accent: string;
}

function idleMotion(
  scene: BossScene,
  pose: FighterPose,
  skin: BossSkin,
  u: number,
): { lift: number; tilt: number } {
  const down = pose.action === "knockdown" || pose.action === "ko";
  const stunned =
    pose.stunned || pose.action === "hitstun" || pose.action === "blockstun";
  const grounded = !pose.airborne && pose.action !== "jump" && !down && !stunned;

  if (scene.reduced) {
    // Floaters keep a static lift so they don't snap to the floor.
    return { lift: skin.hover > 0 && grounded ? skin.hover * u * 0.5 : 0, tilt: 0 };
  }

  const t = scene.time;
  let lift = 0;
  let tilt = 0;
  if (skin.hover > 0 && grounded) {
    lift = (0.5 + 0.5 * Math.sin(t * 1.7)) * skin.hover * u;
  }
  const calm =
    grounded &&
    (pose.action === "idle" ||
      pose.action === "walk" ||
      pose.action === "block" ||
      pose.action === "crouch");
  if (calm && skin.sway > 0) {
    const rate =
      skin.idle === "sway"
        ? 1.05
        : skin.idle === "pulse"
          ? 2.2
          : skin.idle === "twitch"
            ? 5.5
            : 1.3;
    tilt = Math.sin(t * rate) * skin.sway;
    if (skin.idle === "twitch") tilt += Math.sin(t * 41) * 0.004; // nervous jitter
  }
  return { lift, tilt };
}

function drawShadow(
  ctx: CanvasRenderingContext2D,
  scene: BossScene,
  pose: FighterPose,
  skin: BossSkin,
): void {
  const u = unitFor(scene, pose);
  const idle = idleMotion(scene, pose, skin, u);
  const lift = pose.y + idle.lift; // hips above ground
  const fade = Math.max(0.1, 0.34 - lift / (u * 14));
  const rx = u * 1.4 * Math.max(0.45, 1 - lift / (u * 12));
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(pose.x, scene.layout.groundY, rx, u * 0.34, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function unitFor(scene: BossScene, pose: FighterPose): number {
  return scene.layout.scale * (pose.side === "boss" ? 42 : 38);
}

function fighterStyle(scene: BossScene, isBoss: boolean): FighterStyle {
  if (!isBoss) {
    return {
      glow: PLAYER_GLOW,
      edge: PLAYER_EDGE,
      bodyHi: PLAYER_BODY_HI,
      bodyLo: PLAYER_BODY_LO,
      accent: PLAYER_EDGE,
    };
  }
  if (scene.bossShape === "mirror") {
    // A dark echo of Vektor: near-black body, the player's accent as a cold edge.
    return {
      glow: scene.bossAccent,
      edge: scene.bossAccent,
      bodyHi: shade(scene.bossPrimary, 0.6),
      bodyLo: "#070a10",
      accent: scene.bossAccent,
    };
  }
  return {
    glow: scene.bossPrimary,
    edge: scene.bossAccent,
    bodyHi: scene.bossPrimary,
    bodyLo: shade(scene.bossSecondary, 0.45),
    accent: scene.bossAccent,
  };
}

function drawFighter(
  ctx: CanvasRenderingContext2D,
  scene: BossScene,
  pose: FighterPose,
  isBoss: boolean,
  skin: BossSkin,
): void {
  const u = unitFor(scene, pose);
  const t = scene.reduced ? 0 : scene.time;
  const rig = computeRig(pose, u, t, skin);
  const idle = idleMotion(scene, pose, skin, u);

  ctx.save();
  // Anchor at the foot line, lifted by airborne hip height + idle float.
  ctx.translate(pose.x, scene.layout.groundY - pose.y - idle.lift);
  ctx.scale(pose.facing, 1); // +x is always "forward" (toward the opponent).
  if (rig.lieAngle) ctx.rotate(rig.lieAngle);
  else if (idle.tilt) ctx.rotate(idle.tilt);

  const style = fighterStyle(scene, isBoss);

  drawAuraBack(ctx, scene, rig, u, t, skin, style);
  if (rig.swinging && !scene.reduced) drawSwingTrail(ctx, rig, style, u, pose);

  ctx.globalAlpha = rig.alpha;
  drawBody(ctx, rig, style, u, skin, t);
  drawAuraFront(ctx, scene, rig, u, t, skin, style);
  drawGuardFx(ctx, rig, style, u);
  if (pose.action === "walk" && !scene.reduced) drawFootDust(ctx, rig, style, u, t);
  ctx.globalAlpha = 1;

  ctx.restore();
}

function computeRig(pose: FighterPose, u: number, t: number, skin: BossSkin): Rig {
  const H = skin.heightMult;
  const breathe = Math.sin(t * skin.breatheRate) * 0.05 * u * skin.breatheDepth;

  let hipX = 0;
  let hipY = -1.95 * u * H + breathe;
  let shoulderLean = 0.14 * u;
  const torso = 1.7 * u * H;

  // Subtle resting weight shift (idle life), only when calm.
  if (t && (pose.action === "idle" || pose.action === "walk")) {
    hipX += Math.sin(t * 0.8) * 0.045 * u;
  }

  // Default fighting stance: feet staggered, weight centered.
  let bf: Joint = { x: -0.55 * u, y: 0 }; // back foot
  let ff: Joint = { x: 0.48 * u, y: 0 }; // front foot
  let lieAngle = 0;
  let alpha = 1;
  let guard: Rig["guard"] = "none";
  let armSwing = 0;
  let headBack = 0;

  const lowAttack = pose.moveHeight === "low";
  const crouched = pose.crouching || pose.action === "crouch";
  const airborne = pose.airborne || pose.action === "jump";

  if (pose.action === "walk") {
    const ph = t * 7;
    const sw = Math.sin(ph);
    armSwing = sw;
    ff = { x: 0.48 * u + sw * 0.4 * u, y: -Math.max(0, sw) * 0.16 * u };
    bf = { x: -0.55 * u - sw * 0.4 * u, y: -Math.max(0, -sw) * 0.16 * u };
    hipY += -Math.abs(Math.sin(ph * 2)) * 0.06 * u;
  }

  if (crouched && !airborne) {
    hipY = -1.18 * u * H + breathe * 0.4;
    bf = { x: -0.62 * u, y: 0 };
    ff = { x: 0.58 * u, y: 0 };
    shoulderLean = 0.22 * u;
  }

  if (airborne) {
    // Tucked legs at the apex; the body itself is lifted via translate(y).
    hipY = -2.0 * u * H;
    bf = { x: -0.32 * u, y: -0.72 * u };
    ff = { x: 0.42 * u, y: -0.92 * u };
    shoulderLean = 0.2 * u;
  }

  const attacking = pose.action === "attack" && pose.movePhase !== null;
  const heavy = pose.attackStrength === "heavy";
  let ext = 0;
  if (attacking) {
    ext =
      pose.movePhase === "startup"
        ? heavy
          ? -0.55
          : -0.35
        : pose.movePhase === "active"
          ? 1
          : 0.45;
  }

  // A kick swings the front leg; shift weight onto the back leg for balance.
  if (attacking && pose.attackKind === "kick") {
    const kickTy =
      pose.moveHeight === "high"
        ? -1.7 * u
        : pose.moveHeight === "overhead"
          ? -1.95 * u
          : pose.moveHeight === "mid"
            ? -0.95 * u
            : -0.12 * u;
    if (ext < 0) {
      // Cock the knee up before the strike (anticipation).
      ff = { x: 0.34 * u, y: -0.7 * u };
    } else {
      ff = { x: (0.5 + ext * (heavy ? 2.1 : 1.85)) * u, y: kickTy };
      hipX -= ext * 0.22 * u;
      shoulderLean -= ext * 0.18 * u;
      headBack += ext * 0.1 * u;
    }
  }

  const stunned =
    pose.action === "hitstun" || pose.action === "blockstun" || pose.stunned;
  if (stunned && pose.action !== "knockdown" && pose.action !== "ko") {
    const j = Math.sin(t * 60) * 0.05 * u;
    shoulderLean = -0.5 * u + j;
    hipX -= 0.18 * u;
    headBack = 0.45 * u;
  }

  const down = pose.action === "knockdown";
  const ko = pose.action === "ko";
  if (down || ko) {
    lieAngle = ko ? -1.5 : -1.25;
    alpha = ko ? 0.78 : 1;
    hipY = -1.4 * u;
    bf = { x: -0.2 * u, y: 0 };
    ff = { x: 0.7 * u, y: 0 };
    shoulderLean = -0.1 * u;
  }

  // Shoulder + head from the (possibly modified) hip.
  const shoulder: Joint = { x: hipX + shoulderLean, y: hipY - torso };
  const headR = 0.56 * u * skin.headScale;
  const headBob = t && (pose.action === "idle" || pose.action === "walk") ? Math.sin(t * 1.3) * 0.02 * u : 0;
  const head: Joint = {
    x: shoulder.x + 0.12 * u - headBack,
    y: shoulder.y - 0.55 * u - headR + headBob,
  };

  // Default guard hands (relative to the shoulder).
  let fh: Joint = { x: shoulder.x + 0.5 * u - armSwing * 0.2 * u, y: shoulder.y + 0.4 * u };
  let bh: Joint = { x: shoulder.x + 0.12 * u + armSwing * 0.2 * u, y: shoulder.y + 0.6 * u };

  if (pose.blocking || pose.action === "block" || pose.action === "blockstun") {
    if (lowAttack || crouched) {
      guard = "low";
      fh = { x: shoulder.x + 0.6 * u, y: shoulder.y + 1.1 * u };
      bh = { x: shoulder.x + 0.3 * u, y: shoulder.y + 0.8 * u };
    } else {
      guard = "high";
      fh = { x: shoulder.x + 0.55 * u, y: shoulder.y - 0.55 * u };
      bh = { x: shoulder.x + 0.32 * u, y: shoulder.y - 0.2 * u };
    }
  }

  if (attacking && pose.attackKind === "punch") {
    const ty =
      pose.moveHeight === "high"
        ? shoulder.y - 0.15 * u
        : pose.moveHeight === "overhead"
          ? shoulder.y + (ext > 0 ? 0.9 * u : -0.9 * u)
          : pose.moveHeight === "mid"
            ? shoulder.y + 0.5 * u
            : shoulder.y + 1.4 * u;
    fh = {
      x: shoulder.x + (0.45 + ext * (heavy ? 1.95 : 1.7)) * u,
      y: ext < 0 ? shoulder.y - 0.35 * u : ty,
    };
    bh = { x: shoulder.x + 0.05 * u, y: shoulder.y + 0.2 * u };
  }

  if (stunned && pose.action !== "knockdown" && pose.action !== "ko") {
    fh = { x: shoulder.x - 0.1 * u, y: shoulder.y + 0.2 * u };
    bh = { x: shoulder.x - 0.4 * u, y: shoulder.y + 0.1 * u };
  }
  if (down || ko) {
    fh = { x: shoulder.x + 0.4 * u, y: shoulder.y + 0.3 * u };
    bh = { x: shoulder.x - 0.5 * u, y: shoulder.y - 0.1 * u };
  }

  const thigh = 1.05 * u * H;
  const shin = 1.05 * u * H;
  const upper = 0.9 * u;
  const fore = 0.85 * u;

  const backHipRoot: Joint = { x: hipX - 0.16 * u, y: hipY };
  const frontHipRoot: Joint = { x: hipX + 0.16 * u, y: hipY };
  const backShRoot: Joint = { x: shoulder.x - 0.3 * u, y: shoulder.y + 0.1 * u };
  const frontShRoot: Joint = { x: shoulder.x + 0.3 * u, y: shoulder.y + 0.1 * u };

  return {
    hip: { x: hipX, y: hipY },
    shoulder,
    head,
    headR,
    legBack: { root: backHipRoot, knee: ik2(backHipRoot, bf, thigh, shin, -1), foot: bf },
    legFront: { root: frontHipRoot, knee: ik2(frontHipRoot, ff, thigh, shin, -1), foot: ff },
    armBack: { root: backShRoot, elbow: ik2(backShRoot, bh, upper, fore, 1), hand: bh },
    armFront: { root: frontShRoot, elbow: ik2(frontShRoot, fh, upper, fore, 1), hand: fh },
    lieAngle,
    alpha,
    guard,
    swinging: attacking && pose.movePhase === "active",
  };
}

// Two-bone IK: place the mid joint for a limb from root -> end, bending toward
// bendSign. The end is clamped to the reachable length.
function ik2(root: Joint, end: Joint, l1: number, l2: number, bendSign: number): Joint {
  let dx = end.x - root.x;
  let dy = end.y - root.y;
  let d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.001;
  const min = Math.abs(l1 - l2) + 0.001;
  if (d < 1e-4) {
    dx = 0.001;
    d = 0.001;
  }
  const cd = Math.max(min, Math.min(max, d));
  const ux = dx / d;
  const uy = dy / d;
  const baseAng = Math.atan2(uy, ux);
  let cosA = (cd * cd + l1 * l1 - l2 * l2) / (2 * cd * l1);
  cosA = Math.max(-1, Math.min(1, cosA));
  const ang = baseAng + bendSign * Math.acos(cosA);
  return { x: root.x + Math.cos(ang) * l1, y: root.y + Math.sin(ang) * l1 };
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  rig: Rig,
  style: FighterStyle,
  u: number,
  skin: BossSkin,
  t: number,
): void {
  const legW = u * 0.38 * skin.limbThickness;
  const armW = u * 0.3 * skin.limbThickness;

  beginGlow(ctx, style.glow, skin.glowBlur);

  // Back-side limbs are dimmer for depth.
  ctx.save();
  ctx.globalAlpha *= 0.7;
  limb(ctx, rig.legBack.root, rig.legBack.knee, rig.legBack.foot, legW, style.bodyLo);
  limb(ctx, rig.armBack.root, rig.armBack.elbow, rig.armBack.hand, armW, style.bodyLo);
  ctx.restore();

  // Torso: a tapered trapezoid from hips up to the shoulders.
  const hipHalf = 0.3 * u * skin.torsoWidth;
  const shHalf = 0.42 * u * skin.torsoWidth;
  const grad = ctx.createLinearGradient(0, rig.shoulder.y, 0, rig.hip.y);
  grad.addColorStop(0, style.bodyHi);
  grad.addColorStop(1, style.bodyLo);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(rig.hip.x - hipHalf, rig.hip.y);
  ctx.lineTo(rig.hip.x + hipHalf, rig.hip.y);
  ctx.lineTo(rig.shoulder.x + shHalf, rig.shoulder.y);
  ctx.lineTo(rig.shoulder.x - shHalf, rig.shoulder.y);
  ctx.closePath();
  ctx.fill();

  // A crisp lit edge down the front of the torso (vector definition).
  ctx.strokeStyle = rgba(style.edge, 0.5);
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.beginPath();
  ctx.moveTo(rig.hip.x + hipHalf, rig.hip.y);
  ctx.lineTo(rig.shoulder.x + shHalf, rig.shoulder.y);
  ctx.stroke();

  // Front leg, then neck + head, then front arm on top.
  limb(ctx, rig.legFront.root, rig.legFront.knee, rig.legFront.foot, legW, style.bodyHi);

  // Neck.
  ctx.strokeStyle = style.bodyLo;
  ctx.lineWidth = u * 0.28;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(rig.shoulder.x, rig.shoulder.y);
  ctx.lineTo(rig.head.x, rig.head.y + rig.headR * 0.7);
  ctx.stroke();

  drawHead(ctx, rig, style, u, skin, t);

  limb(ctx, rig.armFront.root, rig.armFront.elbow, rig.armFront.hand, armW, style.bodyHi);

  endGlow(ctx);

  // Chest core spark.
  drawCore(
    ctx,
    rig.shoulder.x * 0.5 + rig.hip.x * 0.5,
    (rig.shoulder.y + rig.hip.y) * 0.5,
    u * 0.26,
    style.accent,
  );

  // A small fist/knuckle node at the lead hand reads the strike point.
  ctx.fillStyle = style.edge;
  ctx.beginPath();
  ctx.arc(rig.armFront.hand.x, rig.armFront.hand.y, armW * 0.65, 0, TAU);
  ctx.fill();
}

function limb(
  ctx: CanvasRenderingContext2D,
  a: Joint,
  mid: Joint,
  b: Joint,
  w: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(mid.x, mid.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

// --- per-boss heads (distinct silhouettes) ---------------------------------

function headOrb(ctx: CanvasRenderingContext2D, hx: number, hy: number, r: number, hi: string, lo: string): void {
  const g = ctx.createRadialGradient(hx - r * 0.3, hy - r * 0.3, r * 0.1, hx, hy, r);
  g.addColorStop(0, hi);
  g.addColorStop(1, lo);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, TAU);
  ctx.fill();
}

// A menacing forward eye glint — sells "this thing is looking at you".
function headEye(ctx: CanvasRenderingContext2D, hx: number, hy: number, r: number, color: string): void {
  beginGlow(ctx, color, 8);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.42, hy - r * 0.04, r * 0.24, r * 0.13, -0.2, 0, TAU);
  ctx.fill();
  endGlow(ctx);
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  rig: Rig,
  style: FighterStyle,
  u: number,
  skin: BossSkin,
  t: number,
): void {
  const hx = rig.head.x;
  const hy = rig.head.y;
  const r = rig.headR;

  switch (skin.head) {
    case "visor": {
      headOrb(ctx, hx, hy, r, style.bodyHi, style.bodyLo);
      // Forward visor sweep.
      ctx.strokeStyle = rgba(style.edge, 0.9);
      ctx.lineWidth = Math.max(1, u * 0.07);
      ctx.beginPath();
      ctx.moveTo(hx + r * 0.1, hy - r * 0.2);
      ctx.lineTo(hx + r * 0.95, hy - r * 0.05);
      ctx.stroke();
      headEye(ctx, hx, hy, r, style.edge);
      break;
    }
    case "wraithHood": {
      // Tall angular hood peaking up-forward, jagged hem.
      beginGlow(ctx, style.glow, skin.glowBlur);
      ctx.fillStyle = style.bodyLo;
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.95, hy + r * 0.5);
      ctx.lineTo(hx + r * 0.05, hy - r * 2.0);
      ctx.lineTo(hx + r * 1.05, hy + r * 0.45);
      ctx.lineTo(hx + r * 0.55, hy + r * 0.9);
      ctx.lineTo(hx + r * 0.1, hy + r * 0.55);
      ctx.lineTo(hx - r * 0.4, hy + r * 0.9);
      ctx.closePath();
      ctx.fill();
      endGlow(ctx);
      // Recessed face.
      headOrb(ctx, hx + r * 0.1, hy, r * 0.7, shade(style.bodyLo, 0.6), "#05060c");
      // Glowing slit eye.
      beginGlow(ctx, style.edge, 10);
      ctx.strokeStyle = style.edge;
      ctx.lineWidth = Math.max(1.5, r * 0.18);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.05, hy + r * 0.05);
      ctx.lineTo(hx + r * 0.6, hy - r * 0.1);
      ctx.stroke();
      endGlow(ctx);
      break;
    }
    case "arrowhead": {
      // Forward chevron of light.
      const g = ctx.createLinearGradient(hx - r, hy, hx + r * 1.6, hy);
      g.addColorStop(0, style.bodyLo);
      g.addColorStop(1, style.bodyHi);
      beginGlow(ctx, style.glow, skin.glowBlur);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(hx + r * 1.6, hy);
      ctx.lineTo(hx - r * 0.6, hy - r * 0.95);
      ctx.lineTo(hx - r * 0.15, hy);
      ctx.lineTo(hx - r * 0.6, hy + r * 0.95);
      ctx.closePath();
      ctx.fill();
      endGlow(ctx);
      drawCore(ctx, hx + r * 0.35, hy, r * 0.45, style.edge);
      break;
    }
    case "crown": {
      // Blocky monolith head with a stepped crown.
      const hw = r * 0.95;
      const hh = r * 1.05;
      const g = ctx.createLinearGradient(0, hy - hh, 0, hy + hh);
      g.addColorStop(0, style.bodyHi);
      g.addColorStop(1, style.bodyLo);
      beginGlow(ctx, style.glow, skin.glowBlur);
      ctx.fillStyle = g;
      roundRect(ctx, hx - hw, hy - hh, hw * 2, hh * 2, r * 0.28);
      ctx.fill();
      endGlow(ctx);
      // Stepped crown blocks.
      ctx.fillStyle = rgba(style.accent, 0.85);
      for (let i = 0; i < 3; i++) {
        const bw = hw * (1.0 - i * 0.26);
        const by = hy - hh - r * 0.28 * (i + 1);
        ctx.fillRect(hx - bw, by, bw * 2, r * 0.24);
      }
      headEye(ctx, hx, hy, r, style.edge);
      break;
    }
    case "halo": {
      headOrb(ctx, hx, hy, r, style.bodyHi, style.bodyLo);
      ctx.save();
      ctx.translate(hx, hy - r * 0.1);
      ctx.rotate(t * 0.8);
      beginGlow(ctx, style.accent, skin.glowBlur);
      ctx.strokeStyle = rgba(style.accent, 0.85);
      ctx.lineWidth = Math.max(1.5, r * 0.16);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.55, r * 0.5, 0, 0, TAU);
      ctx.stroke();
      endGlow(ctx);
      ctx.restore();
      headEye(ctx, hx, hy, r, style.edge);
      break;
    }
    case "crossCrest": {
      headOrb(ctx, hx, hy, r, style.bodyHi, style.bodyLo);
      // Perpendicular plus crest (two-axis identity).
      beginGlow(ctx, style.accent, 10);
      ctx.strokeStyle = rgba(style.accent, 0.9);
      ctx.lineWidth = Math.max(1.5, r * 0.18);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hx, hy - r * 1.5);
      ctx.lineTo(hx, hy - r * 0.4);
      ctx.moveTo(hx - r * 0.7, hy - r * 0.95);
      ctx.lineTo(hx + r * 0.7, hy - r * 0.95);
      ctx.stroke();
      endGlow(ctx);
      headEye(ctx, hx, hy, r, style.edge);
      break;
    }
    case "comet": {
      // Tail streaming backward (-x).
      const tail = ctx.createLinearGradient(hx, hy, hx - r * 3.2, hy);
      tail.addColorStop(0, rgba(style.accent, 0.8));
      tail.addColorStop(1, rgba(style.accent, 0));
      ctx.fillStyle = tail;
      ctx.beginPath();
      ctx.moveTo(hx, hy - r * 0.7);
      ctx.lineTo(hx - r * 3.2, hy);
      ctx.lineTo(hx, hy + r * 0.7);
      ctx.closePath();
      ctx.fill();
      headOrb(ctx, hx, hy, r, "#ffffff", style.bodyHi);
      drawCore(ctx, hx + r * 0.2, hy, r * 0.6, style.accent);
      break;
    }
    case "anvil": {
      // Heavy wide anvil skull.
      const g = ctx.createLinearGradient(0, hy - r, 0, hy + r);
      g.addColorStop(0, style.bodyHi);
      g.addColorStop(1, style.bodyLo);
      beginGlow(ctx, style.glow, skin.glowBlur);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(hx - r * 1.35, hy - r * 0.7);
      ctx.lineTo(hx + r * 1.35, hy - r * 0.7);
      ctx.lineTo(hx + r * 0.85, hy + r * 0.35);
      ctx.lineTo(hx + r * 1.0, hy + r * 0.95);
      ctx.lineTo(hx - r * 1.0, hy + r * 0.95);
      ctx.lineTo(hx - r * 0.85, hy + r * 0.35);
      ctx.closePath();
      ctx.fill();
      endGlow(ctx);
      // Heavy brow + low burning eye.
      ctx.fillStyle = rgba("#000000", 0.4);
      ctx.fillRect(hx - r * 1.2, hy - r * 0.7, r * 2.4, r * 0.28);
      headEye(ctx, hx + r * 0.1, hy + r * 0.1, r, style.edge);
      break;
    }
    case "prism": {
      // Faceted iridescent gem.
      const g = ctx.createLinearGradient(hx - r, hy - r, hx + r, hy + r);
      g.addColorStop(0, style.bodyHi);
      g.addColorStop(0.5, style.accent);
      g.addColorStop(1, style.bodyLo);
      beginGlow(ctx, style.glow, skin.glowBlur);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(hx, hy - r * 1.3);
      ctx.lineTo(hx + r * 1.1, hy);
      ctx.lineTo(hx, hy + r * 1.3);
      ctx.lineTo(hx - r * 1.1, hy);
      ctx.closePath();
      ctx.fill();
      endGlow(ctx);
      // Internal facet lines.
      ctx.strokeStyle = rgba(style.edge, 0.7);
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(hx, hy - r * 1.3);
      ctx.lineTo(hx, hy + r * 1.3);
      ctx.moveTo(hx - r * 1.1, hy);
      ctx.lineTo(hx + r * 1.1, hy);
      ctx.stroke();
      break;
    }
    case "serpentCrest": {
      headOrb(ctx, hx, hy, r, style.bodyHi, style.bodyLo);
      // Swept-back fin crest.
      beginGlow(ctx, style.glow, 10);
      ctx.fillStyle = rgba(style.accent, 0.8);
      for (let i = 0; i < 3; i++) {
        const sx = hx - r * (0.2 + i * 0.35);
        ctx.beginPath();
        ctx.moveTo(sx, hy - r * 0.3);
        ctx.lineTo(sx - r * 0.7, hy - r * (1.0 + i * 0.25));
        ctx.lineTo(sx - r * 0.1, hy - r * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      endGlow(ctx);
      headEye(ctx, hx, hy, r, style.edge);
      break;
    }
    case "echo": {
      // Dark reflection of Vektor's visor head.
      headOrb(ctx, hx, hy, r, style.bodyHi, style.bodyLo);
      ctx.strokeStyle = rgba(style.edge, 0.95);
      ctx.lineWidth = Math.max(1, u * 0.08);
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx + r * 0.1, hy - r * 0.2);
      ctx.lineTo(hx + r * 0.95, hy - r * 0.05);
      ctx.stroke();
      headEye(ctx, hx, hy, r, style.edge);
      break;
    }
    case "void": {
      // Black event-horizon head with a bright lensing rim + jets.
      beginGlow(ctx, style.glow, skin.glowBlur);
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, TAU);
      ctx.fill();
      endGlow(ctx);
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(t * 0.6);
      beginGlow(ctx, style.accent, skin.glowBlur);
      ctx.strokeStyle = rgba(style.accent, 0.95);
      ctx.lineWidth = Math.max(1.5, r * 0.16);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.05, 0.2, Math.PI * 1.5);
      ctx.stroke();
      // Color-shifting jets.
      ctx.strokeStyle = rgba(style.edge, 0.7);
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.1);
      ctx.lineTo(0, -r * 1.9);
      ctx.moveTo(0, r * 1.1);
      ctx.lineTo(0, r * 1.9);
      ctx.stroke();
      endGlow(ctx);
      ctx.restore();
      break;
    }
  }
}

// Smear left behind a fast/heavy strike's lead limb (motion-graphics).
function drawSwingTrail(
  ctx: CanvasRenderingContext2D,
  rig: Rig,
  style: FighterStyle,
  u: number,
  pose: FighterPose,
): void {
  const kick = pose.attackKind === "kick";
  const root = kick ? rig.legFront.root : rig.armFront.root;
  const tip = kick ? rig.legFront.foot : rig.armFront.hand;
  const dx = tip.x - root.x;
  const dy = tip.y - root.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return;
  const baseAng = Math.atan2(dy, dx);
  const heavy = pose.attackStrength === "heavy";
  const n = heavy ? 4 : 3;

  ctx.save();
  beginGlow(ctx, style.edge, 12);
  ctx.strokeStyle = style.edge;
  ctx.lineCap = "round";
  for (let i = 1; i <= n; i++) {
    const a = baseAng - i * 0.24;
    ctx.globalAlpha = 0.3 * (1 - i / (n + 1));
    ctx.lineWidth = (kick ? u * 0.34 : u * 0.26) * (1 - i * 0.12);
    ctx.beginPath();
    ctx.moveTo(root.x, root.y);
    ctx.lineTo(root.x + Math.cos(a) * len, root.y + Math.sin(a) * len);
    ctx.stroke();
  }
  endGlow(ctx);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Fighter-local scuff under the trailing foot while walking.
function drawFootDust(
  ctx: CanvasRenderingContext2D,
  rig: Rig,
  style: FighterStyle,
  u: number,
  t: number,
): void {
  const foot = rig.legBack.foot;
  ctx.save();
  ctx.globalAlpha = 0.18 + 0.12 * Math.abs(Math.sin(t * 7));
  ctx.fillStyle = rgba(style.glow, 0.5);
  ctx.beginPath();
  ctx.ellipse(foot.x - u * 0.2, foot.y - u * 0.02, u * 0.45, u * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// A guard arc / shield glint when blocking.
function drawGuardFx(ctx: CanvasRenderingContext2D, rig: Rig, style: FighterStyle, u: number): void {
  if (rig.guard === "none") return;
  ctx.save();
  beginGlow(ctx, style.edge, 14);
  ctx.strokeStyle = rgba(style.edge, 0.85);
  ctx.lineWidth = u * 0.16;
  const cy = rig.guard === "high" ? rig.shoulder.y - 0.1 * u : rig.hip.y + 0.2 * u;
  ctx.beginPath();
  ctx.arc(rig.shoulder.x + 0.5 * u, cy, u * 0.95, -Math.PI * 0.65, Math.PI * 0.65);
  ctx.stroke();
  endGlow(ctx);
  ctx.restore();
}

// --- boss auras (integral to the body, not a faint backdrop) ---------------

function drawAuraBack(
  ctx: CanvasRenderingContext2D,
  scene: BossScene,
  rig: Rig,
  u: number,
  t: number,
  skin: BossSkin,
  style: FighterStyle,
): void {
  ctx.save();
  switch (skin.aura) {
    case "vector":
      auraVector(ctx, scene, rig, u, t, style);
      break;
    case "slope":
      auraSlope(ctx, scene, rig, u, t);
      break;
    case "speed":
      auraSpeed(ctx, scene, rig, u, t);
      break;
    case "tower":
      auraTower(ctx, scene, rig, u, t);
      break;
    case "rings":
      auraRings(ctx, scene, rig, u, t);
      break;
    case "cross":
      auraCross(ctx, scene, rig, u, t, true);
      break;
    case "comet":
      auraComet(ctx, scene, rig, u, t);
      break;
    case "gravity":
      auraGravity(ctx, scene, rig, u, t);
      break;
    case "prism":
      auraPrism(ctx, scene, rig, u, t);
      break;
    case "serpent":
      auraSerpent(ctx, scene, rig, u, t);
      break;
    case "mirror":
      auraMirror(ctx, scene, rig, u, t);
      break;
    case "singularity":
      auraSingularity(ctx, scene, rig, u, t, false);
      break;
  }
  ctx.restore();
}

function drawAuraFront(
  ctx: CanvasRenderingContext2D,
  scene: BossScene,
  rig: Rig,
  u: number,
  t: number,
  skin: BossSkin,
  _style: FighterStyle,
): void {
  ctx.save();
  switch (skin.aura) {
    case "cross":
      auraCross(ctx, scene, rig, u, t, false);
      break;
    case "singularity":
      auraSingularity(ctx, scene, rig, u, t, true);
      break;
    default:
      break;
  }
  ctx.restore();
}

function chestOf(rig: Rig): Joint {
  return {
    x: rig.shoulder.x * 0.5 + rig.hip.x * 0.5,
    y: (rig.shoulder.y + rig.hip.y) * 0.5,
  };
}

// Vektor: thin trailing motion ticks — clean vector polish.
function auraVector(ctx: CanvasRenderingContext2D, scene: BossScene, rig: Rig, u: number, t: number, style: FighterStyle): void {
  if (scene.reduced) return;
  ctx.strokeStyle = rgba(style.glow, 0.35);
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.lineCap = "round";
  for (let i = 1; i <= 3; i++) {
    const off = -i * 0.45 * u - ((t * 5) % (u * 0.35));
    ctx.globalAlpha = 0.3 / i;
    ctx.beginPath();
    ctx.moveTo(off, rig.shoulder.y + 0.3 * u);
    ctx.lineTo(off - u * 0.7, rig.shoulder.y + 0.3 * u);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Jagged tangent-line segments leaning off the body.
function auraSlope(ctx: CanvasRenderingContext2D, scene: BossScene, rig: Rig, u: number, t: number): void {
  ctx.strokeStyle = rgba(scene.bossPrimary, 0.6);
  ctx.lineWidth = Math.max(1.5, u * 0.08);
  ctx.lineCap = "round";
  const top = rig.head.y;
  const rungs = 8;
  for (let i = 0; i < rungs; i++) {
    const f = i / (rungs - 1);
    const yy = top + f * (rig.hip.y - top) * 1.6;
    const halfw = (0.75 + Math.sin(t * 2 + i) * 0.18) * u;
    ctx.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(t * 2 + i));
    ctx.beginPath();
    ctx.moveTo(-halfw, yy + u * 0.18);
    ctx.lineTo(halfw, yy - u * 0.18);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Accelerating after-image streaks behind the body.
function auraSpeed(ctx: CanvasRenderingContext2D, scene: BossScene, rig: Rig, u: number, t: number): void {
  ctx.strokeStyle = rgba(scene.bossAccent, 0.55);
  ctx.lineWidth = Math.max(1, u * 0.07);
  ctx.lineCap = "round";
  for (let i = 1; i <= 5; i++) {
    const off = -i * 0.32 * u - ((t * 9) % (u * 0.3));
    ctx.globalAlpha = 0.5 / i;
    ctx.beginPath();
    ctx.moveTo(off, rig.shoulder.y);
    ctx.lineTo(off - u * 1.1, rig.shoulder.y);
    ctx.moveTo(off, rig.hip.y);
    ctx.lineTo(off - u * 1.1, rig.hip.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Stacked translucent area blocks accumulating around the body (Riemann sum).
function auraTower(ctx: CanvasRenderingContext2D, scene: BossScene, rig: Rig, u: number, t: number): void {
  const blocks = 6;
  const bh = (rig.hip.y - rig.head.y) / blocks;
  for (let i = 0; i < blocks; i++) {
    const yy = rig.hip.y - (i + 1) * bh;
    const rise = scene.reduced ? 0 : Math.sin(t * 1.6 + i * 0.5) * u * 0.05;
    const w = u * (1.0 - i * 0.07);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = rgba(i % 2 ? scene.bossAccent : scene.bossPrimary, 0.6);
    ctx.fillRect(-w, yy + rise, w * 2, bh * 0.84);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = rgba(scene.bossAccent, 0.5);
    ctx.lineWidth = Math.max(1, u * 0.03);
    ctx.strokeRect(-w, yy + rise, w * 2, bh * 0.84);
  }
  ctx.globalAlpha = 1;
}

// Three nested rotating rings around the chest core (jerk/accel/velocity).
function auraRings(ctx: CanvasRenderingContext2D, scene: BossScene, rig: Rig, u: number, t: number): void {
  const c = chestOf(rig);
  ctx.save();
  ctx.translate(c.x, c.y);
  const rings = [
    { r: u * 2.1, sp: 0.6, c: scene.bossPrimary },
    { r: u * 1.6, sp: -1, c: scene.bossAccent },
    { r: u * 1.1, sp: 1.6, c: scene.bossSecondary },
  ];
  for (const ring of rings) {
    ctx.save();
    ctx.rotate(scene.reduced ? 0 : t * ring.sp);
    beginGlow(ctx, ring.c, 12);
    ctx.strokeStyle = rgba(ring.c, 0.65);
    ctx.lineWidth = Math.max(1.5, u * 0.09);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, ring.r, 0.3, Math.PI * 1.4);
    ctx.stroke();
    endGlow(ctx);
    ctx.restore();
  }
  ctx.restore();
}

// Perpendicular axis arms (x-arm + y-arm) glinting around / at the hands.
function auraCross(ctx: CanvasRenderingContext2D, scene: BossScene, rig: Rig, u: number, t: number, back: boolean): void {
  if (back) {
    // Faint wide axes through the chest behind the body.
    const c = chestOf(rig);
    ctx.globalAlpha = 0.25 + (scene.reduced ? 0 : 0.1 * Math.sin(t * 3));
    ctx.strokeStyle = rgba(scene.bossSecondary, 0.7);
    ctx.lineWidth = Math.max(1.5, u * 0.07);
    ctx.beginPath();
    ctx.moveTo(c.x - u * 2.4, c.y);
    ctx.lineTo(c.x + u * 2.4, c.y);
    ctx.moveTo(c.x, c.y - u * 2.4);
    ctx.lineTo(c.x, c.y + u * 2.4);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  const blink = scene.reduced ? 0.8 : 0.5 + 0.5 * Math.sin(t * 4);
  ctx.globalAlpha = blink;
  beginGlow(ctx, scene.bossAccent, 10);
  ctx.strokeStyle = rgba(scene.bossAccent, 0.9);
  ctx.lineWidth = Math.max(1.5, u * 0.08);
  const arm = u * 0.6;
  for (const h of [rig.armFront.hand, rig.armBack.hand]) {
    ctx.beginPath();
    ctx.moveTo(h.x - arm, h.y);
    ctx.lineTo(h.x + arm, h.y);
    ctx.moveTo(h.x, h.y - arm);
    ctx.lineTo(h.x, h.y + arm);
    ctx.stroke();
  }
  endGlow(ctx);
  ctx.globalAlpha = 1;
}

// A parabolic arc preview plus a comet tail off the chest.
function auraComet(ctx: CanvasRenderingContext2D, scene: BossScene, rig: Rig, u: number, t: number): void {
  const c = chestOf(rig);
  // Tail.
  const ang = (scene.reduced ? 0 : Math.sin(t * 0.8) * 0.25) + Math.PI;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(ang);
  const tail = ctx.createLinearGradient(0, 0, u * 2.8, 0);
  tail.addColorStop(0, rgba(scene.bossPrimary, 0.8));
  tail.addColorStop(1, rgba(scene.bossSecondary, 0));
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(0, -u * 0.6);
  ctx.lineTo(u * 3.0, 0);
  ctx.lineTo(0, u * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Dotted parabolic trajectory preview rising forward.
  ctx.strokeStyle = rgba(scene.bossAccent, 0.5);
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.setLineDash([u * 0.22, u * 0.3]);
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const f = i / 14;
    const px = c.x + f * u * 3.4;
    const py = c.y - Math.sin(f * Math.PI) * u * 1.8;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

// Heavy gravity well: a dark halo + downward pull streaks.
function auraGravity(ctx: CanvasRenderingContext2D, scene: BossScene, rig: Rig, u: number, t: number): void {
  const og = ctx.createRadialGradient(rig.head.x, rig.head.y, u * 0.2, rig.head.x, rig.head.y, u * 2.1);
  og.addColorStop(0, rgba(scene.bossPrimary, 0.45));
  og.addColorStop(1, rgba(scene.bossPrimary, 0));
  ctx.fillStyle = og;
  ctx.fillRect(rig.head.x - u * 2.1, rig.head.y - u * 2.1, u * 4.2, u * 4.2);

  ctx.strokeStyle = rgba(scene.bossAccent, 0.5);
  ctx.lineWidth = Math.max(1, u * 0.06);
  ctx.lineCap = "round";
  for (let i = -3; i <= 3; i++) {
    const x = i * u * 0.42;
    const phase = scene.reduced ? 0.5 : (t * 1.3 + i) % 1;
    ctx.globalAlpha = 0.2 + 0.5 * (1 - phase);
    ctx.beginPath();
    ctx.moveTo(x, rig.hip.y + phase * u);
    ctx.lineTo(x, rig.hip.y + u * 1.0 + phase * u);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Iridescent parallax: ghost echoes dragging behind the silhouette.
function auraPrism(ctx: CanvasRenderingContext2D, scene: BossScene, rig: Rig, u: number, t: number): void {
  const colors = [scene.bossPrimary, scene.bossAccent, scene.bossSecondary];
  const top = rig.shoulder.y;
  const hgt = rig.hip.y - rig.shoulder.y + u * 1.2;
  for (let i = 0; i < 3; i++) {
    const drift = scene.reduced ? (i + 1) * u * 0.25 : Math.sin(t * 0.9 + i * 0.7) * u * (0.6 + i * 0.4);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = colors[i];
    ctx.fillRect(rig.shoulder.x - 0.45 * u + drift, top, u * 0.9, hgt);
  }
  ctx.globalAlpha = 1;
}

// Undulating sine-wave aura + a metronome tick (SHM).
function auraSerpent(ctx: CanvasRenderingContext2D, scene: BossScene, rig: Rig, u: number, t: number): void {
  ctx.strokeStyle = rgba(scene.bossPrimary, 0.6);
  ctx.lineWidth = Math.max(1.5, u * 0.08);
  ctx.lineCap = "round";
  const top = rig.head.y - u * 0.4;
  const bot = rig.hip.y + u * 0.8;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const f = i / 14;
      const yy = top + f * (bot - top);
      const xx = side * (0.75 + Math.sin(f * Math.PI * 3 + t * 3) * 0.45) * u;
      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  // Metronome tick above the head.
  const beat = scene.reduced ? 0 : Math.sin(t * 3.2);
  beginGlow(ctx, scene.bossAccent, 8);
  ctx.strokeStyle = rgba(scene.bossAccent, 0.8);
  ctx.lineWidth = Math.max(1.5, u * 0.07);
  ctx.beginPath();
  ctx.moveTo(rig.head.x, rig.head.y - u * 1.0);
  ctx.lineTo(rig.head.x + beat * u * 0.7, rig.head.y - u * 1.9);
  ctx.stroke();
  endGlow(ctx);
}

// Mirror: offset dark/bright echoes of the torso (a reflection of Vektor).
function auraMirror(ctx: CanvasRenderingContext2D, scene: BossScene, rig: Rig, u: number, t: number): void {
  const top = rig.shoulder.y;
  const hgt = rig.hip.y - rig.shoulder.y + u * 1.0;
  for (let i = 1; i <= 2; i++) {
    const drift = scene.reduced ? -i * u * 0.3 : -Math.abs(Math.sin(t * 2)) * i * u * 0.5;
    ctx.globalAlpha = 0.2 / i;
    ctx.fillStyle = scene.bossAccent;
    ctx.fillRect(rig.shoulder.x - 0.4 * u + drift, top, u * 0.8, hgt);
  }
  ctx.globalAlpha = 1;
}

// Black-hole accretion: lensing rings (behind) + orbiting motes (front).
function auraSingularity(ctx: CanvasRenderingContext2D, scene: BossScene, rig: Rig, u: number, t: number, front: boolean): void {
  const c = chestOf(rig);
  ctx.save();
  ctx.translate(c.x, c.y);
  if (!front) {
    for (let i = 4; i >= 1; i--) {
      ctx.strokeStyle = rgba(i % 2 ? scene.bossPrimary : scene.bossAccent, 0.12 + 0.05 * i);
      ctx.lineWidth = Math.max(1, u * 0.06);
      ctx.beginPath();
      ctx.arc(0, 0, u * (1.0 + i * 0.6), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const spin = scene.reduced ? 0 : t * 1.2;
  const motes = 30;
  ctx.rotate(spin);
  for (let i = 0; i < motes; i++) {
    const a = (i / motes) * TAU;
    ctx.globalAlpha = 0.4 + 0.5 * Math.sin(a * 2 + t * 4);
    ctx.fillStyle = i % 3 === 0 ? scene.bossAccent : scene.bossPrimary;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * u * 2.5, Math.sin(a) * u * 1.0, u * 0.12, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// --- HUD -------------------------------------------------------------------

function drawHud(ctx: CanvasRenderingContext2D, scene: BossScene): void {
  const { width: w, height: h, scale: s } = scene.layout;
  const top = h * TOP_SAFE;
  const plateW = w * 0.4;
  const barH = Math.max(13, 17 * s);

  hpBar(ctx, w * 0.04, top, plateW, barH, scene.player.hp, PLAYER_HP, HP_LOW, "VEKTOR", false, s);
  const bossX = w * 0.96 - plateW;
  hpBar(ctx, bossX, top, plateW, barH, scene.boss.hp, BOSS_HP, HP_LOW, scene.bossName.toUpperCase(), true, s);

  // Special meters under each HP bar (glow when full).
  const meterY = top + barH + 4 * s;
  const meterH = Math.max(5, 6 * s);
  meterBar(ctx, w * 0.04, meterY, plateW, meterH, scene.player.meter, PLAYER_GLOW, false, scene);
  meterBar(ctx, bossX, meterY, plateW, meterH, scene.boss.meter, scene.bossPrimary, true, scene);

  // Phase pips beneath the boss bar.
  if (scene.phaseCount > 1) {
    const pr = Math.max(3, 4 * s);
    const py = meterY + meterH + 8 * s;
    for (let i = 0; i < scene.phaseCount; i++) {
      const px = w * 0.96 - (i + 1) * pr * 3;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, TAU);
      ctx.fillStyle = i <= scene.phaseIndex ? scene.bossAccent : "rgba(255,255,255,0.25)";
      ctx.fill();
    }
  }

  // Score / Best (center, stacked, compact).
  ctx.save();
  ctx.font = `800 ${Math.round(13 * s)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = TEXT;
  ctx.fillText(`${scene.score}`, w * 0.5, top);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `700 ${Math.round(9 * s)}px ${FONT}`;
  ctx.fillText(`BEST ${scene.highScore}`, w * 0.5, top + 15 * s);
  ctx.restore();
}

function hpBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bw: number,
  bh: number,
  frac: number,
  color: string,
  lowColor: string,
  label: string,
  rightAlign: boolean,
  s: number,
): void {
  ctx.fillStyle = HP_BACK;
  roundRect(ctx, x, y, bw, bh, bh * 0.35);
  ctx.fill();

  const f = clamp01(frac);
  const c = f < 0.25 ? lowColor : color;
  const grad = ctx.createLinearGradient(x, y, x, y + bh);
  grad.addColorStop(0, rgba("#ffffff", 0.25));
  grad.addColorStop(0.15, c);
  grad.addColorStop(1, rgba(c, 0.8));
  ctx.fillStyle = grad;
  const fillW = bw * f;
  // Both bars drain toward the center: player empties from its right edge,
  // boss from its left edge.
  roundRect(ctx, rightAlign ? x + bw - fillW : x, y, fillW, bh, bh * 0.35);
  ctx.fill();

  ctx.strokeStyle = HP_FRAME;
  ctx.lineWidth = Math.max(1, s);
  roundRect(ctx, x, y, bw, bh, bh * 0.35);
  ctx.stroke();

  ctx.fillStyle = TEXT;
  ctx.font = `800 ${Math.round(11 * s)}px ${FONT}`;
  ctx.textAlign = rightAlign ? "right" : "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, rightAlign ? x + bw : x, y - 2);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function meterBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bw: number,
  bh: number,
  frac: number,
  color: string,
  rightAlign: boolean,
  scene: BossScene,
): void {
  const f = clamp01(frac);
  const full = f >= 0.999;
  ctx.fillStyle = HP_BACK;
  roundRect(ctx, x, y, bw, bh, bh * 0.5);
  ctx.fill();
  if (full && !scene.reduced) {
    beginGlow(ctx, color, 10 + 6 * Math.sin(scene.time * 8));
  }
  ctx.fillStyle = full ? "#ffd23f" : color;
  const fillW = bw * f;
  roundRect(ctx, rightAlign ? x + bw - fillW : x, y, fillW, bh, bh * 0.5);
  ctx.fill();
  if (full && !scene.reduced) endGlow(ctx);
}

function drawComboText(ctx: CanvasRenderingContext2D, scene: BossScene): void {
  const combo = scene.player.combo;
  if (combo < 2) return;
  const { width: w, height: h } = scene.layout;
  const size = Math.min(w * 0.06 + combo * w * 0.012, w * 0.18);
  const wobble = scene.reduced ? 1 : 1 + 0.06 * Math.sin(scene.time * 12);
  ctx.save();
  ctx.translate(w * 0.5, h * 0.28);
  ctx.scale(wobble, wobble);
  ctx.font = `900 ${Math.round(size)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(3, size * 0.1);
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.fillStyle = "#ffd23f";
  const label = `${combo}`;
  ctx.strokeText(label, 0, 0);
  ctx.fillText(label, 0, 0);
  ctx.font = `900 ${Math.round(size * 0.4)}px ${FONT}`;
  ctx.fillStyle = "#ff7a1a";
  ctx.strokeText("HITS!", 0, size * 0.7);
  ctx.fillText("HITS!", 0, size * 0.7);
  ctx.restore();
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawBanner(ctx: CanvasRenderingContext2D, scene: BossScene): void {
  if (!scene.banner) return;
  const { width: w, height: h } = scene.layout;
  const pulse = scene.reduced ? 1 : 1 + 0.05 * Math.sin(scene.time * 9);
  const size = Math.round(w * 0.1 * pulse);
  ctx.save();
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  beginGlow(ctx, "#ffae00", 18);
  ctx.lineWidth = Math.max(4, w * 0.018);
  ctx.strokeStyle = "rgba(0,0,0,0.72)";
  ctx.strokeText(scene.banner, w * 0.5, h * 0.44);
  ctx.fillStyle = "#fff0b3";
  ctx.fillText(scene.banner, w * 0.5, h * 0.44);
  endGlow(ctx);
  ctx.restore();
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

// --- FX --------------------------------------------------------------------

function drawParticle(ctx: CanvasRenderingContext2D, p: BossSceneParticle): void {
  const a = p.maxLife > 0 ? Math.max(0, p.life / p.maxLife) : 0;
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
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSpark(ctx: CanvasRenderingContext2D, scene: BossScene, sp: HitSpark): void {
  const a = sp.maxLife > 0 ? Math.max(0, sp.life / sp.maxLife) : 0;
  if (a <= 0) return;
  const r = sp.size * (1.1 - a * 0.4);
  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.globalAlpha = a;

  switch (sp.kind) {
    case "hit": {
      // Yellow-white impact starburst.
      beginGlow(ctx, "#fff2a8", 16);
      ctx.strokeStyle = "#fff7d6";
      ctx.lineWidth = Math.max(2, r * 0.18);
      ctx.lineCap = "round";
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * TAU + (1 - a) * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * r * 1.4, Math.sin(ang) * r * 1.4);
        ctx.stroke();
      }
      drawCore(ctx, 0, 0, r * 0.8, "#ffd23f");
      endGlow(ctx);
      break;
    }
    case "block": {
      // Cyan deflection arc + a couple of glints.
      beginGlow(ctx, "#9fe8ff", 14);
      ctx.strokeStyle = "#cdf3ff";
      ctx.lineWidth = Math.max(2, r * 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.2, -Math.PI * 0.55, Math.PI * 0.55);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.5, r * 0.14);
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r * 1.3, i * r * 0.7);
        ctx.stroke();
      }
      endGlow(ctx);
      break;
    }
    case "special": {
      // Palette-tinted radial star + ring.
      beginGlow(ctx, scene.bossAccent, 22);
      ctx.strokeStyle = scene.bossAccent;
      ctx.lineWidth = Math.max(2, r * 0.16);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * TAU + (1 - a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * r * 1.7, Math.sin(ang) * r * 1.7);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.6 + (1 - a) * 1.2), 0, TAU);
      ctx.stroke();
      drawCore(ctx, 0, 0, r, "#ffffff");
      endGlow(ctx);
      break;
    }
    case "ko": {
      // Big white -> red explosion ring.
      beginGlow(ctx, "#ff4d4d", 26);
      const ring = r * (1.4 + (1 - a) * 2.2);
      ctx.strokeStyle = `rgba(255,90,90,${a})`;
      ctx.lineWidth = Math.max(3, r * 0.3);
      ctx.beginPath();
      ctx.arc(0, 0, ring, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(2, r * 0.2);
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r * 0.5, Math.sin(ang) * r * 0.5);
        ctx.lineTo(Math.cos(ang) * ring, Math.sin(ang) * ring);
        ctx.stroke();
      }
      drawCore(ctx, 0, 0, r, "#fff0b3");
      endGlow(ctx);
      break;
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// --- screen backdrops ------------------------------------------------------

function drawScreen(ctx: CanvasRenderingContext2D, scene: BossScene): void {
  const { width: w, height: h } = scene.layout;
  if (scene.screen === "fighting") return;

  if (scene.screen === "intro") {
    vignette(ctx, w, h, "rgba(4,3,10,0.55)");

    // VS card: Vektor on the left, the boss on the right.
    ctx.textAlign = "center";
    ctx.fillStyle = PLAYER_EDGE;
    ctx.font = `900 ${Math.round(w * 0.07)}px ${FONT}`;
    beginGlow(ctx, PLAYER_GLOW, 14);
    ctx.fillText("VEKTOR", w * 0.27, h * 0.2);
    endGlow(ctx);

    ctx.fillStyle = scene.bossAccent;
    beginGlow(ctx, scene.bossPrimary, 16);
    ctx.fillText(scene.bossName.toUpperCase(), w * 0.73, h * 0.2);
    endGlow(ctx);

    ctx.fillStyle = "#fff0b3";
    ctx.font = `900 ${Math.round(w * 0.1)}px ${FONT}`;
    beginGlow(ctx, "#ffae00", 18);
    ctx.fillText("VS", w * 0.5, h * 0.31);
    endGlow(ctx);

    ctx.fillStyle = TEXT;
    ctx.font = `700 ${Math.round(w * 0.045)}px ${FONT}`;
    ctx.fillText(scene.bossTitle, w * 0.73, h * 0.26);

    ctx.textAlign = "start";
    return;
  }

  if (scene.screen === "victory") {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, h * 0.6);
    g.addColorStop(0, "rgba(255,210,63,0.28)");
    g.addColorStop(1, "rgba(4,3,10,0.78)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (!scene.reduced) sunburst(ctx, w * 0.5, h * 0.4, h * 0.7, scene.time, "rgba(255,225,140,0.1)");
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd23f";
    beginGlow(ctx, "#ffae00", 22);
    ctx.font = `900 ${Math.round(w * 0.14)}px ${FONT}`;
    ctx.fillText("VICTORY", w * 0.5, h * 0.4);
    endGlow(ctx);
    ctx.fillStyle = TEXT;
    ctx.font = `700 ${Math.round(w * 0.05)}px ${FONT}`;
    ctx.fillText(`${scene.bossName} falls`, w * 0.5, h * 0.4 + w * 0.1);
    ctx.textAlign = "start";
    return;
  }

  // defeat
  ctx.fillStyle = "rgba(40,4,10,0.66)";
  ctx.fillRect(0, 0, w, h);
  vignette(ctx, w, h, "rgba(0,0,0,0.5)");
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff6b6b";
  beginGlow(ctx, "#ff2d2d", 18);
  ctx.font = `900 ${Math.round(w * 0.13)}px ${FONT}`;
  ctx.fillText("DEFEATED", w * 0.5, h * 0.4);
  endGlow(ctx);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `700 ${Math.round(w * 0.045)}px ${FONT}`;
  ctx.fillText("Try again", w * 0.5, h * 0.4 + w * 0.09);
  ctx.textAlign = "start";
}

// --- shared helpers --------------------------------------------------------

function drawCore(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.5, color);
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function beginGlow(ctx: CanvasRenderingContext2D, color: string, blur: number): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function endGlow(ctx: CanvasRenderingContext2D): void {
  ctx.restore();
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, edge: string): void {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.2, w * 0.5, h * 0.5, h * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, edge);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function sunburst(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number, color: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.3);
  ctx.fillStyle = color;
  const rays = 12;
  for (let i = 0; i < rays; i++) {
    ctx.rotate(TAU / rays);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r, -r * 0.06);
    ctx.lineTo(r, r * 0.06);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Parse "#rgb" / "#rrggbb" / "rgb(...)" / "rgba(...)" into [r, g, b] (0..255).
// Tolerant by design: these helpers are composed (e.g. shade() feeds rgba(), and
// a recessed face shades an already-shaded body color), so the parser must accept
// its own rgb() output as well as hex. Any unparseable input falls back to a
// neutral grey rather than emitting "rgb(NaN,…)", which Canvas rejects at
// addColorStop/fillStyle and would otherwise crash the whole frame.
function parseRGB(color: string): [number, number, number] {
  const fn = color.match(/rgba?\(([^)]+)\)/i);
  if (fn) {
    const [r, g, b] = fn[1].split(",").map((p) => parseFloat(p.trim()));
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return [r, g, b];
    }
    return [128, 128, 128];
  }
  let h = color.replace("#", "").trim();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
    return [r, g, b];
  }
  return [128, 128, 128];
}

function rgba(color: string, a: number): string {
  const [r, g, b] = parseRGB(color);
  return `rgba(${r},${g},${b},${a})`;
}

// Darken a color toward the shadow end of the palette by `factor` (0..1).
// Accepts hex or rgb() so it can be applied to an already-shaded color.
function shade(color: string, factor: number): string {
  const [r, g, b] = parseRGB(color);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}
