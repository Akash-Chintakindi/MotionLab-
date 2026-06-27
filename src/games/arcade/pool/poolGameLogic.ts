import type { Ball, PoolTable } from "./poolPhysics";
import type { Vec2 } from "../types";

// ---------------------------------------------------------------------------
// Pure rules engine for the full 8-ball-style game vs the computer. Holds no
// React or canvas state: it only racks balls and resolves a turn from a shot's
// outcome, so the rules can be unit-tested in isolation. Coordinates are in the
// same TABLE UNITS that poolPhysics uses (origin bottom-left, +x right, +y up).
// ---------------------------------------------------------------------------

export type Difficulty = "easy" | "medium" | "hard";
export type Group = "solids" | "stripes";
export type Side = "player" | "ai";

export const EIGHT = 8;

/** Standard-ish billiard colours; stripes (9–15) reuse the 1–7 hues. */
const BALL_COLORS: Record<number, string> = {
  1: "#f4c430",
  2: "#1f5fd0",
  3: "#d22b2b",
  4: "#7a3fb0",
  5: "#ef7d18",
  6: "#1f9e57",
  7: "#9b3b2f",
  8: "#1c1c1c",
  9: "#f4c430",
  10: "#1f5fd0",
  11: "#d22b2b",
  12: "#7a3fb0",
  13: "#ef7d18",
  14: "#1f9e57",
  15: "#9b3b2f",
};

export const CUE_COLOR = "#f5f1e3";

/** Group a ball number belongs to (`"eight"` for the 8-ball). */
export function groupOf(n: number): Group | "eight" {
  if (n === EIGHT) return "eight";
  return n <= 7 ? "solids" : "stripes";
}

export function otherGroup(g: Group): Group {
  return g === "solids" ? "stripes" : "solids";
}

export function otherSide(side: Side): Side {
  return side === "player" ? "ai" : "player";
}

/** How many balls of `group` are still on the table given the live numbers. */
export function remainingOfGroup(group: Group, tableNumbers: number[]): number {
  return tableNumbers.filter((n) => groupOf(n) === group).length;
}

// ---- Rack -----------------------------------------------------------------

/** Cue-ball start position: roughly the head-spot quarter of the table. */
export function cueStart(table: PoolTable): Vec2 {
  return { x: table.width * 0.25, y: table.height / 2 };
}

/**
 * Builds a fresh rack: the cue ball plus the 15 numbered balls packed into the
 * standard triangle with the 8-ball in the centre. Layout is fixed so the break
 * is deterministic.
 */
export function makeRack(table: PoolTable): Ball[] {
  const r = table.ballRadius;
  const d = r * 2 + 0.04; // diameter + a hair of breathing room
  const dx = d * Math.cos(Math.PI / 6); // row-to-row horizontal spacing
  const apexX = table.width * 0.68;
  const apexY = table.height / 2;

  // Row sizes 1..5 (15 total); 8-ball sits in the centre slot of row 2.
  const layout = [
    [1],
    [9, 2],
    [10, 8, 3],
    [4, 11, 5, 12],
    [6, 13, 7, 14, 15],
  ];

  const cue: Ball = {
    id: "cue",
    pos: cueStart(table),
    vel: { x: 0, y: 0 },
    radius: r,
    color: CUE_COLOR,
    pocketed: false,
    isCue: true,
  };

  const balls: Ball[] = [cue];
  for (let row = 0; row < layout.length; row++) {
    const numbers = layout[row];
    const x = apexX + row * dx;
    for (let j = 0; j < numbers.length; j++) {
      const n = numbers[j];
      const y = apexY + (j - row / 2) * d;
      balls.push({
        id: `b${n}`,
        pos: { x, y },
        vel: { x: 0, y: 0 },
        radius: r,
        color: BALL_COLORS[n],
        pocketed: false,
        number: n,
        stripe: n > EIGHT,
      });
    }
  }
  return balls;
}

/** Object-ball numbers still on the table (cue excluded). */
export function tableNumbers(balls: Ball[]): number[] {
  return balls
    .filter((b) => !b.isCue && !b.pocketed && b.number != null)
    .map((b) => b.number as number);
}

/**
 * Finds a free re-spot for the cue ball after a scratch, scanning outward from
 * the head spot so it never overlaps a resting ball or a cushion.
 */
export function respotCue(balls: Ball[], table: PoolTable): Vec2 {
  const r = table.ballRadius;
  const others = balls.filter((b) => !b.isCue && !b.pocketed);
  const clear = (p: Vec2) =>
    p.x > r &&
    p.x < table.width - r &&
    p.y > r &&
    p.y < table.height - r &&
    others.every((b) => Math.hypot(b.pos.x - p.x, b.pos.y - p.y) > r * 2.2);

  const base = cueStart(table);
  if (clear(base)) return base;
  for (let ring = 1; ring < 40; ring++) {
    const step = ring * r;
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      const p = { x: base.x + Math.cos(ang) * step, y: base.y + Math.sin(ang) * step };
      if (clear(p)) return p;
    }
  }
  return base;
}

// ---- Turn resolution ------------------------------------------------------

export interface FullState {
  turn: Side;
  groups: Record<Side, Group | null>;
  winner: Side | null;
  phase: "playing" | "over";
}

export function initialFullState(breaker: Side = "player"): FullState {
  return {
    turn: breaker,
    groups: { player: null, ai: null },
    winner: null,
    phase: "playing",
  };
}

export interface ShotResult {
  /** Object-ball numbers pocketed this shot (exclude the cue). */
  pocketed: number[];
  /** True if the cue ball was pocketed (a scratch). */
  cueScratched: boolean;
}

export interface TurnResolution {
  state: FullState;
  /** True if play moves to the other side. */
  turnPassed: boolean;
  /** Group assigned to the shooter on this shot (open-table break), if any. */
  assignedGroup: Group | null;
  /** True if the shooter legally potted ≥1 of their own balls (continues). */
  legalPot: boolean;
  /** Count of the shooter's own balls potted (for scoring). */
  ownPotted: number;
  scratched: boolean;
}

/**
 * Resolves a completed shot into the next game state. Rules (a clean, fair
 * subset of 8-ball — not every official nuance):
 *  - Open table: the first legally potted ball assigns the shooter's group.
 *  - Potting ≥1 of your own group without scratching keeps the turn.
 *  - A scratch always passes the turn (the caller re-spots the cue ball).
 *  - The 8-ball ends the game: a win only if you've already cleared your group
 *    and didn't scratch; otherwise the opponent wins.
 *
 * `liveNumbers` is the set of object-ball numbers still on the table *after*
 * the shot, so "group cleared" can be evaluated.
 */
export function resolveTurn(
  state: FullState,
  shot: ShotResult,
  liveNumbers: number[],
): TurnResolution {
  const shooter = state.turn;
  const opp = otherSide(shooter);
  const next: FullState = { ...state, groups: { ...state.groups } };

  const pottedNonEight = shot.pocketed.filter((n) => n !== EIGHT);
  const pottedEight = shot.pocketed.includes(EIGHT);

  // Open-table group assignment on the first clean pot.
  let assignedGroup: Group | null = null;
  if (next.groups[shooter] === null && !shot.cueScratched && pottedNonEight.length > 0) {
    const g = groupOf(pottedNonEight[0]) as Group;
    next.groups[shooter] = g;
    next.groups[opp] = otherGroup(g);
    assignedGroup = g;
  }

  const myGroup = next.groups[shooter];
  const ownPotted = myGroup
    ? pottedNonEight.filter((n) => groupOf(n) === myGroup).length
    : pottedNonEight.length;

  // The 8-ball is terminal.
  if (pottedEight) {
    const groupCleared = myGroup !== null && remainingOfGroup(myGroup, liveNumbers) === 0;
    const legalEight = groupCleared && !shot.cueScratched;
    next.winner = legalEight ? shooter : opp;
    next.phase = "over";
    return {
      state: next,
      turnPassed: false,
      assignedGroup,
      legalPot: legalEight,
      ownPotted,
      scratched: shot.cueScratched,
    };
  }

  const legalPot = !shot.cueScratched && ownPotted > 0;
  next.turn = legalPot ? shooter : opp;

  return {
    state: next,
    turnPassed: next.turn === opp,
    assignedGroup,
    legalPot,
    ownPotted,
    scratched: shot.cueScratched,
  };
}
