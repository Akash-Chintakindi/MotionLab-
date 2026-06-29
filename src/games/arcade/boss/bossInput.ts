// ---------------------------------------------------------------------------
// Pure input mapping for Boss Fight Mode — a Shadow Fight 2-style 2D brawler.
// Translates the on-screen button actions and keyboard events into the engine's
// `BossIntent`s. On-screen buttons are the primary (mobile) scheme; the keyboard
// is a desktop mirror. There are NO swipe gestures.
//
// Two thumb clusters of controls:
//   • movement: left, right (held walk), jump (tap), crouch (held), block (held)
//   • attacks:  punch, kick (taps), special (tap)
//
// The attack INTENT no longer carries a strength: there is just Punch and Kick.
// The engine derives light vs. heavy / low / overhead from the fighter's STANCE
// (grounded / crouching / airborne) plus the direction currently HELD — holding
// toward the opponent and pressing an attack reads as a heavier directional
// combo. So input maps a tap straight to `{ kind: "attack", attack }`.
//
// HELD actions (left/right/crouch/block) re-send their state as it changes; TAP
// actions (jump/attacks/special) fire once on press. The only module-level state
// is `heldMoveKeys` — a small stack so a keyup with another direction still held
// keeps walking, and a keyup with nothing else held stops (`{ move, dir: 0 }`).
// ---------------------------------------------------------------------------

import type { BossIntent } from "./bossTypes";

/** Every control the player can press (buttons + keyboard alike). */
export type ControlAction =
  // movement cluster
  | "left"
  | "right"
  | "jump"
  | "crouch"
  | "block"
  // attack cluster
  | "punch"
  | "kick"
  | "special";

/** Static descriptor for one on-screen button (and its keyboard mirror). */
export interface ButtonSpec {
  action: ControlAction;
  /** Accessible label. */
  label: string;
  /** A compact glyph for the button face (paired with the label, never alone). */
  glyph: string;
  /** Keyboard key shown as a hint on desktop. */
  keyHint: string;
  /** Which thumb cluster the button belongs to. */
  cluster: "movement" | "attack";
  /** Held controls (pressed/released) vs taps that fire once on press. */
  hold?: boolean;
  /** Special is only usable when the meter is full + the weapon unlocks it. */
  needsReady?: boolean;
}

/** The held controls — re-sent on every press/release transition. */
const HELD_ACTIONS = new Set<ControlAction>(["left", "right", "crouch", "block"]);

/** Whether an action is a held control (true) or a one-shot tap (false). */
export function isHeldAction(action: ControlAction): boolean {
  return HELD_ACTIONS.has(action);
}

/** Movement cluster, in render order. */
export const MOVEMENT_ACTIONS: ButtonSpec[] = [
  { action: "jump", label: "Jump", glyph: "▲", keyHint: "W", cluster: "movement" },
  { action: "left", label: "Left", glyph: "◀", keyHint: "A", cluster: "movement", hold: true },
  { action: "crouch", label: "Crouch", glyph: "▼", keyHint: "S", cluster: "movement", hold: true },
  { action: "right", label: "Right", glyph: "▶", keyHint: "D", cluster: "movement", hold: true },
  { action: "block", label: "Block", glyph: "🛡", keyHint: "⇧", cluster: "movement", hold: true },
];

/** Attack cluster, in render order. Just Punch / Kick plus the meter Special. */
export const ATTACK_ACTIONS: ButtonSpec[] = [
  { action: "punch", label: "Punch", glyph: "🥊", keyHint: "J", cluster: "attack" },
  { action: "kick", label: "Kick", glyph: "🦵", keyHint: "K", cluster: "attack" },
  { action: "special", label: "Special", glyph: "✦", keyHint: "L", cluster: "attack", needsReady: true },
];

/** The full button roster, grouped by cluster. */
export const BUTTON_ACTIONS: ButtonSpec[] = [...MOVEMENT_ACTIONS, ...ATTACK_ACTIONS];

/**
 * Maps a control action + its pressed state to a `BossIntent`. Held actions
 * carry the pressed flag (or a zeroed move on release); taps emit only on
 * press and return null on release. Attacks emit a strength-free intent — the
 * engine resolves the concrete move from stance + held direction.
 */
export function actionToIntent(action: ControlAction, pressed: boolean): BossIntent | null {
  switch (action) {
    case "left":
      return { kind: "move", dir: pressed ? -1 : 0 };
    case "right":
      return { kind: "move", dir: pressed ? 1 : 0 };
    case "crouch":
      return { kind: "crouch", pressed };
    case "block":
      return { kind: "block", pressed };
    case "jump":
      return pressed ? { kind: "jump" } : null;
    case "punch":
      return pressed ? { kind: "attack", attack: "punch" } : null;
    case "kick":
      return pressed ? { kind: "attack", attack: "kick" } : null;
    case "special":
      return pressed ? { kind: "special" } : null;
  }
}

// --- keyboard mirror -------------------------------------------------------

// Lower-cased key -> control. Movement on A/D + arrows, jump on W/↑, crouch on
// S/↓, block on Shift (held); J = punch, K = kick, L or Space = special.
const KEY_TO_ACTION: Record<string, ControlAction> = {
  a: "left",
  arrowleft: "left",
  d: "right",
  arrowright: "right",
  w: "jump",
  arrowup: "jump",
  s: "crouch",
  arrowdown: "crouch",
  shift: "block",
  j: "punch",
  k: "kick",
  l: "special",
  " ": "special",
  spacebar: "special",
};

/** Normalize a KeyboardEvent.key to our map's lower-cased lookup key. */
function normalizeKey(e: KeyboardEvent): string {
  if (e.key === "Shift") return "shift";
  return e.key.toLowerCase();
}

// The currently-held movement keys, most-recent last. Lets a keyup resolve to
// the still-held direction (or a stop) — see module header.
const heldMoveKeys: Array<"left" | "right"> = [];

function moveIntentFromStack(): BossIntent {
  const top = heldMoveKeys[heldMoveKeys.length - 1];
  return { kind: "move", dir: top === "left" ? -1 : top === "right" ? 1 : 0 };
}

/** Clears held movement state. Call when (re)starting a fight. */
export function resetInput(): void {
  heldMoveKeys.length = 0;
}

/** Which control a key targets, or null if it isn't bound. */
export function keyToAction(e: KeyboardEvent): ControlAction | null {
  return KEY_TO_ACTION[normalizeKey(e)] ?? null;
}

/**
 * Maps a keydown to a `BossIntent`, or null when the key is unbound or is a
 * tap's auto-repeat. Held directions update the move stack; crouch/block emit
 * their pressed state; taps fire once.
 */
export function keyDownToIntent(e: KeyboardEvent): BossIntent | null {
  const action = keyToAction(e);
  if (!action) return null;
  switch (action) {
    case "left":
    case "right":
      if (!e.repeat && !heldMoveKeys.includes(action)) heldMoveKeys.push(action);
      return moveIntentFromStack();
    case "crouch":
      return e.repeat ? null : { kind: "crouch", pressed: true };
    case "block":
      return e.repeat ? null : { kind: "block", pressed: true };
    default:
      // Taps ignore the OS key-repeat so a held key fires a single attack.
      return e.repeat ? null : actionToIntent(action, true);
  }
}

/**
 * Maps a keyup to a `BossIntent`, or null for taps (which have no release). A
 * released direction resolves to the still-held direction, or a stop.
 */
export function keyUpToIntent(e: KeyboardEvent): BossIntent | null {
  const action = keyToAction(e);
  if (!action) return null;
  switch (action) {
    case "left":
    case "right": {
      const i = heldMoveKeys.lastIndexOf(action);
      if (i >= 0) heldMoveKeys.splice(i, 1);
      return moveIntentFromStack();
    }
    case "crouch":
      return { kind: "crouch", pressed: false };
    case "block":
      return { kind: "block", pressed: false };
    default:
      return null;
  }
}
