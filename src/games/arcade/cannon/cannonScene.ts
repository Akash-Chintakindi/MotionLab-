import type { Vec2 } from "../types";
import type { Terrain } from "./cannonLayout";

// ---------------------------------------------------------------------------
// The render contract. The component builds an immutable `CannonScene` every
// frame and hands it (plus the Layout) to `drawScene`. The renderer reads these
// fields only — it never mutates state or runs simulation. Keep these shapes
// stable so physics / component / renderer stay in sync.
// ---------------------------------------------------------------------------

export type Screen = "start" | "play" | "end";
export type Phase =
  | "playerAim"
  | "playerFly"
  | "aiTelegraph"
  | "aiFly"
  | "resolve";

export type Side = "player" | "ai";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  spin?: number;
}

export interface Explosion {
  x: number;
  y: number;
  t: number;
  life: number;
  r: number;
  /** Bigger blooms for a cannon hit vs a terrain puff. */
  big: boolean;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
  life: number;
  vy: number;
  size: number;
}

export interface Banner {
  text: string;
  sub?: string;
  color: string;
  t: number;
  life: number;
}

/** Everything the renderer needs to draw one cannon. */
export interface CannonView {
  pivot: Vec2;
  /** Barrel angle (rad, y-up). */
  angle: number;
  hearts: number;
  shields: number;
  /** Recoil 0..1 — kicks the barrel back briefly after firing. */
  recoil: number;
  /** A short flash at the muzzle right after firing (0..1). */
  muzzleFlash: number;
}

export interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
}

export interface CannonScene {
  screen: Screen;
  phase: Phase;
  reduced: boolean;
  time: number;

  terrain: Terrain;
  clouds: Cloud[];
  /** 0..1 ambient sky pulse used for the dusk glow. */
  skyPulse: number;

  player: CannonView;
  ai: CannonView;
  /** Whose turn the HUD highlights. */
  turn: Side;

  /** Active ball (player or AI shot). */
  ball: Vec2;
  showBall: boolean;
  /** Tint of the in-flight ball (player vs AI). */
  ballColor: string;
  trail: Vec2[];

  /** SHORT dotted aim preview from the player muzzle (empty unless aiming). */
  aimPreview: Vec2[];
  aiming: boolean;
  /** Current power 0..1 (drives the preview length + the HUD gauge). */
  power: number;
  /** Current player launch angle (rad, y-up) for the HUD readout. */
  aimAngle: number;

  ammo: number;
  difficulty: "easy" | "medium" | "hard";

  explosions: Explosion[];
  particles: Particle[];
  floats: FloatText[];
  banner: Banner | null;
  flash: number;
  /** Entrance terrain draw-in 0..1 (0 = nothing drawn, 1 = full). */
  intro: number;
}
