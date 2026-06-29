// ---------------------------------------------------------------------------
// On-screen brawler controls — two large, fixed thumb clusters tuned for mobile
// (game-ui-design: touch-first fighting controls, big targets, clear held-vs-tap
// feedback, no swipe):
//
//   • LEFT  (movement): ◀ / ▶ walk (held), Jump (tap), Crouch (held), Block (held)
//   • RIGHT (attacks):  Punch (tap), Kick (tap), Special (tap, gated)
//
// There are no longer separate light/heavy buttons: the engine reads light vs.
// heavy / low / overhead from the player's stance + the direction held, so a
// hint reminds players that "move + attack = special hits".
//
// Held buttons send their pressed/released transition (walk re-resolves to the
// other held direction so two thumbs never deadlock); taps fire once on pointer-
// down for the snappiest timing. Every button is `touch-none` (no scroll/zoom),
// carries an aria-label + aria-pressed, and shows a pressed state.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import type { BossIntent } from "./bossTypes";
import {
  actionToIntent,
  ATTACK_ACTIONS,
  MOVEMENT_ACTIONS,
  type ButtonSpec,
  type ControlAction,
} from "./bossInput";

interface Props {
  /** Receives the mapped intent for each press/release. */
  onIntent: (intent: BossIntent) => void;
  /** Whether the Special is usable (meter full + weapon Special unlocked). */
  specialReady: boolean;
  disabled?: boolean;
}

type Accent = "sky" | "cyan" | "slate" | "amber" | "rose" | "violet";

const ACCENT_FOR: Record<ControlAction, Accent> = {
  left: "sky",
  right: "sky",
  jump: "cyan",
  crouch: "cyan",
  block: "slate",
  punch: "amber",
  kick: "rose",
  special: "violet",
};

const SPEC: Record<ControlAction, ButtonSpec> = Object.fromEntries(
  [...MOVEMENT_ACTIONS, ...ATTACK_ACTIONS].map((s) => [s.action, s]),
) as Record<ControlAction, ButtonSpec>;

export function BossControls({ onIntent, specialReady, disabled = false }: Props) {
  const [pressed, setPressed] = useState<Partial<Record<ControlAction, boolean>>>({});
  // Held walk keys, most-recent last — mirrors the keyboard stack so pressing
  // both directions and releasing one keeps walking the other way.
  const walkStack = useRef<Array<"left" | "right">>([]);

  // A safety net: if the component unmounts mid-press (e.g. the fight ends while
  // a thumb is down), make sure no held input is left stuck on.
  useEffect(() => {
    return () => {
      walkStack.current.length = 0;
    };
  }, []);

  const resolveWalk = useCallback(() => {
    const top = walkStack.current[walkStack.current.length - 1];
    onIntent({ kind: "move", dir: top === "left" ? -1 : top === "right" ? 1 : 0 });
  }, [onIntent]);

  const onDown = useCallback(
    (action: ControlAction) => {
      if (disabled) return;
      if (action === "special" && !specialReady) return;
      setPressed((p) => ({ ...p, [action]: true }));

      if (action === "left" || action === "right") {
        if (!walkStack.current.includes(action)) walkStack.current.push(action);
        resolveWalk();
        return;
      }
      const intent = actionToIntent(action, true);
      if (intent) onIntent(intent);
    },
    [disabled, specialReady, onIntent, resolveWalk],
  );

  const onUp = useCallback(
    (action: ControlAction) => {
      setPressed((p) => (p[action] ? { ...p, [action]: false } : p));

      if (action === "left" || action === "right") {
        walkStack.current = walkStack.current.filter((a) => a !== action);
        resolveWalk();
        return;
      }
      // Crouch / block release their held state; taps have no release intent.
      const intent = actionToIntent(action, false);
      if (intent) onIntent(intent);
    },
    [onIntent, resolveWalk],
  );

  return (
    <div data-testid="boss-controls" className="mt-3 select-none">
      <div className="flex items-end justify-between gap-3 sm:gap-6">
        {/* Movement cluster — a compact pad with a wide held Block beneath. */}
        <div className="min-w-0 flex-1">
          <ClusterLabel tone="text-sky-300/70">Move</ClusterLabel>
          <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
            <Cell col={2} row={1} action="jump" pressed={pressed} disabled={disabled} onDown={onDown} onUp={onUp} />
            <Cell col={1} row={2} action="left" pressed={pressed} disabled={disabled} onDown={onDown} onUp={onUp} />
            <Cell col={2} row={2} action="crouch" pressed={pressed} disabled={disabled} onDown={onDown} onUp={onUp} />
            <Cell col={3} row={2} action="right" pressed={pressed} disabled={disabled} onDown={onDown} onUp={onUp} />
          </div>
          <div className="mt-1.5">
            <ControlButton
              spec={SPEC.block}
              accent={ACCENT_FOR.block}
              pressed={!!pressed.block}
              disabled={disabled}
              wide
              onDown={onDown}
              onUp={onUp}
            />
          </div>
        </div>

        {/* Attack cluster — Punch + Kick, with a gated Special beneath. */}
        <div className="min-w-0 flex-1">
          <ClusterLabel tone="text-amber-300/70">Strike</ClusterLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {(["punch", "kick"] as const).map((action) => (
              <ControlButton
                key={action}
                spec={SPEC[action]}
                accent={ACCENT_FOR[action]}
                pressed={!!pressed[action]}
                disabled={disabled}
                onDown={onDown}
                onUp={onUp}
              />
            ))}
          </div>
          <div className="mt-1.5">
            <ControlButton
              spec={SPEC.special}
              accent={ACCENT_FOR.special}
              pressed={!!pressed.special}
              disabled={disabled || !specialReady}
              glowing={specialReady && !disabled}
              wide
              onDown={onDown}
              onUp={onUp}
            />
          </div>
        </div>
      </div>

      {/* Combo discoverability — held direction + attack reads as a heavier hit. */}
      <p className="mt-2 text-center text-[10px] leading-snug text-slate-400 dark:text-slate-500">
        Tip: hold a direction (or crouch / jump) + Punch&nbsp;/&nbsp;Kick for heavier combos.
      </p>
    </div>
  );
}

function ClusterLabel({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <p className={`mb-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.25em] ${tone}`}>
      {children}
    </p>
  );
}

const COL: Record<number, string> = { 1: "col-start-1", 2: "col-start-2", 3: "col-start-3" };
const ROW: Record<number, string> = { 1: "row-start-1", 2: "row-start-2" };

function Cell({
  col,
  row,
  action,
  pressed,
  disabled,
  onDown,
  onUp,
}: {
  col: number;
  row: number;
  action: ControlAction;
  pressed: Partial<Record<ControlAction, boolean>>;
  disabled: boolean;
  onDown: (a: ControlAction) => void;
  onUp: (a: ControlAction) => void;
}) {
  return (
    <div className={`${COL[col]} ${ROW[row]}`}>
      <ControlButton
        spec={SPEC[action]}
        accent={ACCENT_FOR[action]}
        pressed={!!pressed[action]}
        disabled={disabled}
        onDown={onDown}
        onUp={onUp}
      />
    </div>
  );
}

const ACCENTS: Record<Accent, { idle: string; on: string }> = {
  sky: {
    idle: "from-sky-500/25 to-sky-700/25 text-sky-100 ring-sky-400/40",
    on: "from-sky-300 to-sky-500 text-white ring-sky-200",
  },
  cyan: {
    idle: "from-cyan-500/25 to-cyan-700/25 text-cyan-100 ring-cyan-400/40",
    on: "from-cyan-300 to-cyan-500 text-white ring-cyan-200",
  },
  slate: {
    idle: "from-slate-500/25 to-slate-700/25 text-slate-100 ring-slate-400/40",
    on: "from-slate-200 to-slate-400 text-slate-900 ring-slate-100",
  },
  amber: {
    idle: "from-amber-500/25 to-amber-700/25 text-amber-100 ring-amber-400/40",
    on: "from-amber-300 to-amber-500 text-white ring-amber-200",
  },
  rose: {
    idle: "from-rose-500/25 to-rose-700/25 text-rose-100 ring-rose-400/40",
    on: "from-rose-300 to-rose-500 text-white ring-rose-200",
  },
  violet: {
    idle: "from-violet-500/25 to-violet-700/25 text-violet-100 ring-violet-400/40",
    on: "from-violet-300 to-fuchsia-500 text-white ring-violet-200",
  },
};

function ControlButton({
  spec,
  accent,
  pressed,
  disabled,
  wide,
  glowing,
  onDown,
  onUp,
}: {
  spec: ButtonSpec;
  accent: Accent;
  pressed: boolean;
  disabled: boolean;
  wide?: boolean;
  glowing?: boolean;
  onDown: (a: ControlAction) => void;
  onUp: (a: ControlAction) => void;
}) {
  const tone = ACCENTS[accent];
  return (
    <button
      type="button"
      aria-label={spec.label}
      aria-pressed={pressed}
      disabled={disabled}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        onDown(spec.action);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onUp(spec.action);
      }}
      onPointerLeave={() => onUp(spec.action)}
      onPointerCancel={() => onUp(spec.action)}
      className={[
        "flex w-full touch-none select-none flex-col items-center justify-center gap-0.5 rounded-2xl bg-gradient-to-b font-bold ring-1 transition-transform",
        wide ? "h-14" : "aspect-square min-h-[3.25rem]",
        pressed ? `${tone.on} scale-95` : tone.idle,
        glowing ? "animate-pulse shadow-lg shadow-violet-500/40" : "",
        "disabled:opacity-30 disabled:saturate-50",
      ].join(" ")}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {spec.glyph}
      </span>
      <span className="text-[11px] font-semibold leading-none tracking-wide">{spec.label}</span>
      <kbd className="hidden rounded bg-black/30 px-1 text-[8px] font-mono text-white/70 sm:inline">
        {spec.keyHint}
      </kbd>
    </button>
  );
}
