import type { Ball, PoolTable } from "./poolPhysics";
import type { Vec2 } from "../types";

// ---------------------------------------------------------------------------
// Table + level definitions for the learning pool game. Coordinates are in
// TABLE UNITS (origin bottom-left, +x right, +y up) to match what poolPhysics
// and the on-table coordinate grid show the learner.
// ---------------------------------------------------------------------------

const POCKET_RADIUS = 2.8;

export const POOL_TABLE: PoolTable = {
  width: 100,
  height: 50,
  ballRadius: 1.4,
  friction: 22,
  cushionRestitution: 0.7,
  pockets: [
    { id: "bl", pos: { x: 0, y: 0 }, radius: POCKET_RADIUS },
    { id: "bm", pos: { x: 50, y: 0 }, radius: POCKET_RADIUS },
    { id: "br", pos: { x: 100, y: 0 }, radius: POCKET_RADIUS },
    { id: "tl", pos: { x: 0, y: 50 }, radius: POCKET_RADIUS },
    { id: "tm", pos: { x: 50, y: 50 }, radius: POCKET_RADIUS },
    { id: "tr", pos: { x: 100, y: 50 }, radius: POCKET_RADIUS },
  ],
};

const POCKET_LABELS: Record<string, string> = {
  bl: "bottom-left",
  bm: "bottom-middle",
  br: "bottom-right",
  tl: "top-left",
  tm: "top-middle",
  tr: "top-right",
};

export function pocketLabel(id: string): string {
  return POCKET_LABELS[id] ?? id;
}

export function pocketById(id: string): Vec2 {
  const p = POOL_TABLE.pockets.find((pk) => pk.id === id);
  return p ? p.pos : { x: 0, y: 0 };
}

export interface PoolLevel {
  id: string;
  name: string;
  /** Starting cue-ball position. */
  cue: Vec2;
  /** The single numbered object ball. */
  object: Vec2;
  objectNumber: number;
  objectColor: string;
  /** Pocket the learner must sink the object ball into. */
  targetPocketId: string;
  /** One-line coaching note shown on the level. */
  hint: string;
}

const CUE_COLOR = "#f5f1e3";

/**
 * Five single-object-ball puzzles of increasing distance / cut angle. Each is
 * solvable with the ghost-ball method that the help panel teaches.
 */
export const POOL_LEVELS: PoolLevel[] = [
  {
    id: "l1",
    name: "Straight in",
    cue: { x: 28, y: 40 },
    object: { x: 55, y: 25 },
    objectNumber: 1,
    objectColor: "#f4c430",
    targetPocketId: "br",
    hint: "Cue, ball and pocket nearly line up — aim straight through.",
  },
  {
    id: "l2",
    name: "Gentle cut",
    cue: { x: 18, y: 30 },
    object: { x: 50, y: 28 },
    objectNumber: 2,
    objectColor: "#1f5fd0",
    targetPocketId: "tr",
    hint: "Aim a touch off-centre so the ball cuts toward the corner.",
  },
  {
    id: "l3",
    name: "Reverse angle",
    cue: { x: 80, y: 12 },
    object: { x: 45, y: 30 },
    objectNumber: 3,
    objectColor: "#d22b2b",
    targetPocketId: "tl",
    hint: "Shooting back across the table — mind the negative direction.",
  },
  {
    id: "l4",
    name: "Side-pocket cut",
    cue: { x: 25, y: 10 },
    object: { x: 50, y: 32 },
    objectNumber: 5,
    objectColor: "#ef7d18",
    targetPocketId: "tm",
    hint: "A steep cut into the side pocket — the ghost ball sits low.",
  },
  {
    id: "l5",
    name: "The long rail",
    cue: { x: 12, y: 42 },
    object: { x: 68, y: 18 },
    objectNumber: 8,
    objectColor: "#1c1c1c",
    targetPocketId: "br",
    hint: "Long distance: add extra speed so it coasts all the way in.",
  },
];

/** Builds the live ball array for a level: white cue + one object ball. */
export function makeBalls(level: PoolLevel): Ball[] {
  const r = POOL_TABLE.ballRadius;
  return [
    {
      id: "cue",
      pos: { ...level.cue },
      vel: { x: 0, y: 0 },
      radius: r,
      color: CUE_COLOR,
      pocketed: false,
      isCue: true,
    },
    {
      id: "obj",
      pos: { ...level.object },
      vel: { x: 0, y: 0 },
      radius: r,
      color: level.objectColor,
      pocketed: false,
      number: level.objectNumber,
    },
  ];
}

export interface ShotOutcome {
  success: boolean;
  scratched: boolean;
  angleErrorDeg: number;
  firstTry: boolean;
}

/**
 * Points for a sunk shot. Base for sinking, bonus for a tight aim angle and
 * for getting it on the first attempt. A scratch (cue ball pocketed) halves it.
 */
export function scoreShot(o: ShotOutcome): number {
  if (!o.success) return 0;
  let pts = 100;
  if (o.angleErrorDeg <= 0.5) pts += 60;
  else if (o.angleErrorDeg <= 1) pts += 40;
  else if (o.angleErrorDeg <= 2) pts += 20;
  if (o.firstTry) pts += 40;
  if (o.scratched) pts = Math.round(pts * 0.5);
  return pts;
}
