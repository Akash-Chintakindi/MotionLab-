import type { Vec2 } from "../types";

const f1 = (n: number) => n.toFixed(1);

/** A single labelled coordinate / value chip in the learning HUD. */
function Stat({
  label,
  value,
  accent,
  emphasize,
  onClick,
}: {
  label: string;
  value: string;
  accent?: string;
  emphasize?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex flex-col items-start rounded-lg px-2.5 py-1.5 text-left transition ${
        onClick ? "cursor-pointer hover:bg-white/10" : "cursor-default"
      } ${emphasize ? "ring-2 ring-cyan-300/70" : "ring-1 ring-white/10"} bg-black/25`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200/70">
        {label}
      </span>
      <span
        className="font-mono text-sm font-semibold"
        style={{ color: accent ?? "#f1f5f9" }}
      >
        {value}
      </span>
    </button>
  );
}

export interface PoolHudProps {
  cue: Vec2;
  object: Vec2;
  pocket: Vec2;
  ballRadius: number;
  friction: number;
  objectNumber: number;
  objectColor: string;
  targetLabel: string;
  angle: string;
  speed: string;
  onAngle: (v: string) => void;
  onSpeed: (v: string) => void;
  onShoot: () => void;
  disabled: boolean;
  emphasizeObject: boolean;
  onEmphasizeObject: () => void;
}

/**
 * The always-on learning panel: the givens (coordinates, radius, friction a)
 * plus the numeric angle/speed entry and the Shoot button.
 */
export function PoolHud(props: PoolHudProps) {
  const {
    cue,
    object,
    pocket,
    ballRadius,
    friction,
    objectNumber,
    objectColor,
    targetLabel,
    angle,
    speed,
    onAngle,
    onSpeed,
    onShoot,
    disabled,
    emphasizeObject,
    onEmphasizeObject,
  } = props;

  return (
    <div className="rounded-2xl bg-slate-900/80 p-3 ring-1 ring-white/10">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <Stat label="Cue ball" value={`(${f1(cue.x)}, ${f1(cue.y)})`} accent="#e2e8f0" />
        <Stat
          label={`Ball ${objectNumber}`}
          value={`(${f1(object.x)}, ${f1(object.y)})`}
          accent={objectColor === "#1c1c1c" ? "#cbd5e1" : objectColor}
          emphasize={emphasizeObject}
          onClick={onEmphasizeObject}
        />
        <Stat
          label={`Pocket (${targetLabel})`}
          value={`(${f1(pocket.x)}, ${f1(pocket.y)})`}
          accent="#fcd34d"
        />
        <Stat label="Ball radius r" value={f1(ballRadius)} />
        <Stat label="Friction a" value={`${f1(friction)} u/s²`} />
        <Stat label="Tip" value="tap ball to flash" />
      </div>

      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled) onShoot();
        }}
      >
        <label className="flex flex-1 min-w-[120px] flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/70">
            Angle (° from +x)
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={angle}
            disabled={disabled}
            onChange={(e) => onAngle(e.target.value)}
            placeholder="e.g. -27.0"
            className="w-full rounded-lg bg-black/40 px-3 py-2 font-mono text-base text-white ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-1 min-w-[120px] flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/70">
            Speed (units/s)
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={speed}
            disabled={disabled}
            onChange={(e) => onSpeed(e.target.value)}
            placeholder="e.g. 60"
            className="w-full rounded-lg bg-black/40 px-3 py-2 font-mono text-base text-white ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          data-testid="pool-shoot"
          disabled={disabled}
          className="h-[42px] rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 px-5 font-display text-sm font-bold text-amber-950 shadow-lg shadow-amber-900/40 transition hover:from-amber-300 hover:to-amber-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Shoot
        </button>
      </form>
    </div>
  );
}

/** Collapsible explainer for the ghost-ball aiming + speed calculation. */
export function HelpPanel({ ballRadius }: { ballRadius: number }) {
  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-slate-900/85 p-4 text-sm leading-relaxed text-slate-200 ring-1 ring-white/10">
      <div>
        <h3 className="mb-1 font-display text-base font-bold text-emerald-300">
          1. Find the aim direction (ghost-ball method)
        </h3>
        <p>
          To sink the object ball you must drive the cue ball toward the{" "}
          <span className="font-semibold text-white">ghost ball</span>: the spot{" "}
          <span className="font-mono text-emerald-200">2r</span> behind the
          object ball, along the line from the object ball to the pocket (here{" "}
          <span className="font-mono text-emerald-200">2r = {(ballRadius * 2).toFixed(1)}</span>{" "}
          units).
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-300">
          <li>
            Direction object → pocket:{" "}
            <span className="font-mono">d = (Pₓ−Oₓ, P_y−O_y)</span>, normalise it.
          </li>
          <li>
            Ghost ball:{" "}
            <span className="font-mono">G = O − 2r · d̂</span>.
          </li>
          <li>
            Aim angle:{" "}
            <span className="font-mono">θ = atan2(G_y−C_y, Gₓ−Cₓ)</span> (degrees).
          </li>
        </ul>
      </div>
      <div>
        <h3 className="mb-1 font-display text-base font-bold text-emerald-300">
          2. Pick a speed
        </h3>
        <p>
          With rolling friction <span className="font-mono">a</span>, a ball
          launched at speed <span className="font-mono">v</span> coasts a
          distance <span className="font-mono">d = v² / (2a)</span>. So to just
          reach a pocket distance <span className="font-mono">d</span> away you
          need at least <span className="font-mono text-emerald-200">v = √(2·a·d)</span>.
          The cue must travel to the ghost ball <em>and</em> still arrive fast
          enough to send the object ball home — so aim a bit above the minimum.
        </p>
      </div>
      <p className="text-xs text-slate-400">
        Type your computed angle and speed, watch the white aim line, then{" "}
        <span className="font-semibold text-amber-300">Shoot</span>. After every
        shot you’ll see the ideal answer and your error.
      </p>
    </div>
  );
}
