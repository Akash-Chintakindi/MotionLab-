import type { Vec2 } from "../types";

// ---------------------------------------------------------------------------
// The render contract. The game component builds an immutable `BballScene`
// every frame and hands it (plus the Layout) to `drawScene`. The renderer
// (basketballRender.ts) reads these fields only — it never mutates state or
// owns simulation. Keep these shapes stable so physics/component/renderer
// stay in sync.
// ---------------------------------------------------------------------------

export type Phase = "aim" | "power" | "fly" | "score";
export type Screen = "start" | "play" | "end";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  /** Downward acceleration (px/s²) applied each frame; 0 = floaty. */
  gravity: number;
  /** Optional spin for confetti flecks. */
  spin?: number;
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

export interface CrowdSpeck {
  x: number;
  y: number;
  color: string;
  phase: number;
  speed: number;
  amp: number;
}

export interface Banner {
  text: string;
  color: string;
  t: number;
  life: number;
}

export interface BballScene {
  screen: Screen;
  phase: Phase;
  reduced: boolean;
  time: number;
  lightPhase: number;

  /** Ball center, in canvas px. */
  ball: Vec2;
  /** Multiplier on ballR for a faux-depth shrink as the ball rises. */
  ballScale: number;
  ballSpin: number;
  showBall: boolean;
  trail: Vec2[];

  /**
   * The swept aim-preview arc: a polyline from the ball through the current
   * launch direction. Drawn as a glowing dotted parabola (Madden-kick style)
   * that sweeps side to side while aiming. Empty when not aiming/charging.
   */
  aimPreview: Vec2[];
  /** True once the aim direction is locked (preview turns solid/confirmed). */
  aimLocked: boolean;
  /** Whether the current launch direction can physically reach the rim. */
  aimGood: boolean;

  /** Power meter indicator position 0..1 (0 bottom, 1 top). */
  power: number;
  /** Center of the green "ideal speed" band on the meter (0..1). */
  powerGreen: number;
  /** Half-width of the green band (0..1). */
  powerHalf: number;

  /** Net animation: lateral sway (px) + a 0..1 downward "swish" stretch pulse. */
  netSway: number;
  netStretch: number;

  remaining: number;
  totalLimit: number;
  score: number;
  combo: number;
  highScore: number;

  particles: Particle[];
  floats: FloatText[];
  crowd: CrowdSpeck[];
  flash: number;
  banner: Banner | null;
}
