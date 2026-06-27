import { describe, it, expect } from "vitest";
import { POOL_TABLE } from "../poolLevels";
import {
  groupOf,
  initialFullState,
  makeRack,
  remainingOfGroup,
  resolveTurn,
  respotCue,
  tableNumbers,
  type FullState,
} from "../poolGameLogic";

describe("makeRack", () => {
  it("racks a cue ball plus 15 numbered balls with the 8 present", () => {
    const balls = makeRack(POOL_TABLE);
    expect(balls).toHaveLength(16);
    const cue = balls.filter((b) => b.isCue);
    expect(cue).toHaveLength(1);
    const numbers = balls.filter((b) => b.number != null).map((b) => b.number).sort((a, b) => a! - b!);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(balls.some((b) => b.number === 8)).toBe(true);
  });

  it("marks 9–15 as stripes and 1–7 as solids", () => {
    const balls = makeRack(POOL_TABLE);
    for (const b of balls) {
      if (b.number == null) continue;
      if (b.number > 8) expect(b.stripe).toBe(true);
      else expect(b.stripe).toBeFalsy();
    }
  });

  it("keeps every racked ball inside the cushions", () => {
    const r = POOL_TABLE.ballRadius;
    for (const b of makeRack(POOL_TABLE)) {
      expect(b.pos.x).toBeGreaterThan(r);
      expect(b.pos.x).toBeLessThan(POOL_TABLE.width - r);
      expect(b.pos.y).toBeGreaterThan(r);
      expect(b.pos.y).toBeLessThan(POOL_TABLE.height - r);
    }
  });
});

describe("groupOf / remainingOfGroup", () => {
  it("classifies numbers into solids, stripes and the eight", () => {
    expect(groupOf(1)).toBe("solids");
    expect(groupOf(7)).toBe("solids");
    expect(groupOf(8)).toBe("eight");
    expect(groupOf(9)).toBe("stripes");
    expect(groupOf(15)).toBe("stripes");
  });

  it("counts remaining balls of a group", () => {
    expect(remainingOfGroup("solids", [1, 3, 9, 8])).toBe(2);
    expect(remainingOfGroup("stripes", [1, 3, 9, 8])).toBe(1);
  });
});

describe("resolveTurn — group assignment", () => {
  it("assigns the shooter's group on the first clean pot and keeps the turn", () => {
    const res = resolveTurn(initialFullState("player"), { pocketed: [3], cueScratched: false }, [1, 2, 9]);
    expect(res.assignedGroup).toBe("solids");
    expect(res.state.groups.player).toBe("solids");
    expect(res.state.groups.ai).toBe("stripes");
    expect(res.turnPassed).toBe(false);
    expect(res.state.turn).toBe("player");
    expect(res.legalPot).toBe(true);
    expect(res.ownPotted).toBe(1);
  });

  it("does not assign a group when the shooter scratches", () => {
    const res = resolveTurn(initialFullState("player"), { pocketed: [3], cueScratched: true }, [1, 2, 9]);
    expect(res.assignedGroup).toBeNull();
    expect(res.state.groups.player).toBeNull();
    expect(res.turnPassed).toBe(true);
    expect(res.scratched).toBe(true);
  });
});

describe("resolveTurn — turn flow", () => {
  const assigned: FullState = {
    turn: "player",
    groups: { player: "solids", ai: "stripes" },
    winner: null,
    phase: "playing",
  };

  it("keeps the turn after potting your own ball", () => {
    const res = resolveTurn(assigned, { pocketed: [2], cueScratched: false }, [1, 9]);
    expect(res.turnPassed).toBe(false);
    expect(res.state.turn).toBe("player");
    expect(res.ownPotted).toBe(1);
  });

  it("passes the turn when nothing is potted", () => {
    const res = resolveTurn(assigned, { pocketed: [], cueScratched: false }, [1, 2, 9]);
    expect(res.turnPassed).toBe(true);
    expect(res.state.turn).toBe("ai");
    expect(res.legalPot).toBe(false);
  });

  it("passes the turn when only the opponent's ball drops", () => {
    const res = resolveTurn(assigned, { pocketed: [9], cueScratched: false }, [1, 2]);
    expect(res.turnPassed).toBe(true);
    expect(res.ownPotted).toBe(0);
  });
});

describe("resolveTurn — the 8-ball ends the game", () => {
  const onLastSolid: FullState = {
    turn: "player",
    groups: { player: "solids", ai: "stripes" },
    winner: null,
    phase: "playing",
  };

  it("wins when the 8 drops after the group is cleared", () => {
    const res = resolveTurn(onLastSolid, { pocketed: [8], cueScratched: false }, [9, 10]);
    expect(res.state.phase).toBe("over");
    expect(res.state.winner).toBe("player");
  });

  it("loses when the 8 drops while group balls remain", () => {
    const res = resolveTurn(onLastSolid, { pocketed: [8], cueScratched: false }, [3, 9]);
    expect(res.state.phase).toBe("over");
    expect(res.state.winner).toBe("ai");
  });

  it("loses when the 8 drops on a scratch even if the group is clear", () => {
    const res = resolveTurn(onLastSolid, { pocketed: [8], cueScratched: true }, [9, 10]);
    expect(res.state.phase).toBe("over");
    expect(res.state.winner).toBe("ai");
  });
});

describe("respotCue", () => {
  it("finds a clear, in-bounds spot away from resting balls", () => {
    const balls = makeRack(POOL_TABLE);
    const spot = respotCue(balls, POOL_TABLE);
    const r = POOL_TABLE.ballRadius;
    expect(spot.x).toBeGreaterThan(r);
    expect(spot.x).toBeLessThan(POOL_TABLE.width - r);
    for (const b of balls.filter((x) => !x.isCue && !x.pocketed)) {
      expect(Math.hypot(b.pos.x - spot.x, b.pos.y - spot.y)).toBeGreaterThan(r * 2);
    }
  });
});

describe("tableNumbers", () => {
  it("lists only live object-ball numbers", () => {
    const balls = makeRack(POOL_TABLE);
    balls[1].pocketed = true; // drop one numbered ball
    const nums = tableNumbers(balls);
    expect(nums).toHaveLength(14);
    expect(nums.every((n) => typeof n === "number")).toBe(true);
  });
});
