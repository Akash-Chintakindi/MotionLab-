import { describe, expect, it } from "vitest";
import {
  bestMakeableShot,
  consumeUndoScratch,
  legalCuePlacement,
  PERK_INFO,
  PERK_ORDER,
} from "../poolPerks";
import { POOL_TABLE } from "../poolLevels";
import { computeIdealShot, type Ball } from "../poolPhysics";

function ball(id: string, x: number, y: number, extra: Partial<Ball> = {}): Ball {
  return {
    id,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    radius: POOL_TABLE.ballRadius,
    color: "#fff",
    pocketed: false,
    ...extra,
  };
}

function pocketPos(id: string) {
  const p = POOL_TABLE.pockets.find((pk) => pk.id === id);
  if (!p) throw new Error(`no pocket ${id}`);
  return p.pos;
}

describe("bestMakeableShot (Aim Assist)", () => {
  it("returns null when no object balls remain", () => {
    const cue = ball("cue", 20, 25, { isCue: true });
    expect(bestMakeableShot([cue], POOL_TABLE, null)).toBeNull();
  });

  it("finds a makeable shot and reports the correct ghost-ball aim angle", () => {
    const cue = ball("cue", 20, 25, { isCue: true });
    const obj = ball("b1", 50, 25, { number: 1 });
    const best = bestMakeableShot([cue, obj], POOL_TABLE, null);
    expect(best).not.toBeNull();
    expect(best!.targetBallId).toBe("b1");
    // The aim must equal the pure ghost-ball solution for the chosen pocket.
    const ideal = computeIdealShot(cue.pos, obj.pos, pocketPos(best!.pocketId), POOL_TABLE);
    expect(best!.aimAngleDeg).toBeCloseTo(ideal.aimAngleDeg, 5);
  });

  it("only targets the player's own group", () => {
    const cue = ball("cue", 20, 25, { isCue: true });
    const solid = ball("b3", 50, 25, { number: 3 });
    const stripe = ball("b11", 60, 40, { number: 11, stripe: true });
    const best = bestMakeableShot([cue, solid, stripe], POOL_TABLE, "solids");
    expect(best).not.toBeNull();
    expect(best!.targetBallId).toBe("b3");
  });

  it("avoids a pocket whose object→pocket lane is blocked", () => {
    const cue = ball("cue", 20, 25, { isCue: true });
    const obj = ball("b1", 50, 25, { number: 1 });
    // Park the 8-ball right on the obj → bottom-right-corner lane (the 8 is not
    // a legal open-table target, so only b1 is considered here).
    const br = pocketPos("br");
    const mid = { x: (obj.pos.x + br.x) / 2, y: (obj.pos.y + br.y) / 2 };
    const blocker = ball("b8", mid.x, mid.y, { number: 8 });
    const best = bestMakeableShot([cue, obj, blocker], POOL_TABLE, null);
    expect(best).not.toBeNull();
    // It must pick a clear pocket, not the obstructed corner.
    expect(best!.pocketId).not.toBe("br");
  });
});

describe("legalCuePlacement (Ball in Hand)", () => {
  const obj = ball("b1", 50, 25, { number: 1 });

  it("accepts an open, in-bounds spot clear of pockets", () => {
    expect(legalCuePlacement({ x: 25, y: 40 }, [obj], POOL_TABLE)).toBe(true);
  });

  it("rejects a spot overlapping another ball", () => {
    expect(legalCuePlacement({ x: 50, y: 25 }, [obj], POOL_TABLE)).toBe(false);
  });

  it("rejects an out-of-bounds spot", () => {
    expect(legalCuePlacement({ x: 0, y: 25 }, [obj], POOL_TABLE)).toBe(false);
  });

  it("rejects a spot inside a pocket mouth", () => {
    expect(legalCuePlacement({ x: 97, y: 2 }, [obj], POOL_TABLE)).toBe(false);
  });
});

describe("perk catalogue", () => {
  it("offers the Spin perk alongside the existing three, in a stable order", () => {
    expect(PERK_ORDER).toEqual(["aimAssist", "ballInHand", "undoScratch", "spin"]);
  });

  it("exposes display metadata for the Spin perk", () => {
    expect(PERK_INFO.spin.kind).toBe("spin");
    expect(PERK_INFO.spin.label).toBe("Add Spin");
    expect(PERK_INFO.spin.icon).toBeTruthy();
    expect(PERK_INFO.spin.blurb).toMatch(/english|spin/i);
  });
});

describe("consumeUndoScratch (Scratch Shield)", () => {
  it("fires and is consumed when armed and the player scratched", () => {
    expect(consumeUndoScratch(true, true)).toEqual({ keepTurn: true, armedLeft: false });
  });

  it("stays armed when no scratch happened", () => {
    expect(consumeUndoScratch(true, false)).toEqual({ keepTurn: false, armedLeft: true });
  });

  it("does nothing when not armed", () => {
    expect(consumeUndoScratch(false, true)).toEqual({ keepTurn: false, armedLeft: false });
  });
});
