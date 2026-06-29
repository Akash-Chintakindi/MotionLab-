import { useEffect, useRef, useState } from "react";
import type { ArcadeGameProps } from "../types";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import { useGameLoop } from "../useGameLoop";
import { useArcadeAudio } from "../audio/useArcadeAudio";
import { POOL_TRACK } from "../audio/audioEngine";
import { MuteButton } from "../MuteButton";
import { EndLeaderboard } from "../basketball/EndLeaderboard";
import {
  applyShot,
  computeIdealShot,
  gradeShot,
  stepSimulation,
  type Ball,
  type PoolEvent,
} from "./poolPhysics";
import {
  POOL_LEVELS,
  POOL_TABLE,
  makeBalls,
  pocketById,
  pocketLabel,
  scoreShot,
} from "./poolLevels";
import {
  canvasToTable,
  drawScene,
  totalUnits,
  type CueAnim,
  type Particle,
  type PocketFx,
  type SceneState,
} from "./poolRender";
import { HelpPanel, PoolHud } from "./PoolHud";

type Screen = "start" | "play" | "end";
type Phase = "aim" | "anim" | "result";

interface ShotResult {
  success: boolean;
  scratched: boolean;
  idealAngle: number;
  minSpeed: number;
  idealSpeed: number;
  yourAngle: number;
  angleError: number;
  points: number;
  isLast: boolean;
}

interface GameRefState {
  balls: Ball[];
  ambient: Ball[];
  particles: Particle[];
  pocketFx: PocketFx[];
  cue: CueAnim | null;
  shot: { angleDeg: number; speed: number } | null;
  pocketedInto: Record<string, string>;
  revealPulse: number;
  time: number;
  lastSfx: Record<string, number>;
}

const UNITS = totalUnits(POOL_TABLE);
const f1 = (n: number) => n.toFixed(1);

function makeAmbient(): Ball[] {
  const r = POOL_TABLE.ballRadius;
  const colors = ["#f4c430", "#1f5fd0", "#d22b2b", "#f5f1e3"];
  return colors.map((color, i): Ball => {
    const ang = Math.random() * Math.PI * 2;
    return {
      id: `amb${i}`,
      pos: {
        x: 18 + Math.random() * (POOL_TABLE.width - 36),
        y: 10 + Math.random() * (POOL_TABLE.height - 20),
      },
      vel: { x: Math.cos(ang) * 5, y: Math.sin(ang) * 5 },
      radius: r,
      color,
      pocketed: false,
      isCue: color === "#f5f1e3",
      number: i < 3 ? i + 1 : undefined,
    };
  });
}

/** The original calculation-based one-shot puzzle mode. */
export function OneShotGame(props: ArcadeGameProps & { onBack: () => void }) {
  const { highScore, onGameOver, leaderboard, onBack } = props;
  const reduced = usePrefersReducedMotion();
  const { muted, toggleMute, start: startTrack, sfx, resumeAudio } = useArcadeAudio();

  const [screen, setScreen] = useState<Screen>("start");
  const [phase, setPhase] = useState<Phase>("aim");
  const [levelIndex, setLevelIndex] = useState(0);
  const [angle, setAngle] = useState("");
  const [speed, setSpeed] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [result, setResult] = useState<ShotResult | null>(null);
  const [emphasize, setEmphasize] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const attemptsRef = useRef(0);
  const endedRef = useRef(false);
  const emphasizeTimer = useRef<number | undefined>(undefined);
  const gRef = useRef<GameRefState>({
    balls: makeBalls(POOL_LEVELS[0]),
    ambient: makeAmbient(),
    particles: [],
    pocketFx: [],
    cue: null,
    shot: null,
    pocketedInto: {},
    revealPulse: 0,
    time: 0,
    lastSfx: {},
  });
  const g = gRef.current;

  const level = POOL_LEVELS[levelIndex];

  // --- drawing -------------------------------------------------------------

  function buildScene(): SceneState {
    const base = {
      table: POOL_TABLE,
      particles: g.particles,
      pocketFx: g.pocketFx,
      revealPulse: g.revealPulse,
      time: g.time,
      reduced,
    };
    if (screen === "play") {
      const a = parseFloat(angle);
      const sp = parseFloat(speed);
      const angleValid = Number.isFinite(a);
      const speedValid = Number.isFinite(sp) && sp > 0;
      let cue: CueAnim | null = null;
      let aim: { angleDeg: number; speed: number } | null = null;
      if (phase === "aim" && angleValid) {
        cue = { angleDeg: a, progress: 0, struck: false, recoil: 0 };
        aim = { angleDeg: a, speed: speedValid ? sp : 30 };
      } else if (phase === "anim") {
        cue = g.cue;
      }
      return {
        ...base,
        balls: g.balls,
        targetPocketId: level.targetPocketId,
        revealObjectId: "obj",
        cue,
        aim,
      };
    }
    return {
      ...base,
      balls: g.ambient,
      targetPocketId: null,
      revealObjectId: null,
      cue: null,
      aim: null,
    };
  }

  function paint() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = canvas.clientWidth || 320;
    const cssH = (cssW * UNITS.h) / UNITS.w;
    const nw = Math.round(cssW * dpr);
    const nh = Math.round(cssH * dpr);
    if (canvas.width !== nw) canvas.width = nw;
    if (canvas.height !== nh) canvas.height = nh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(ctx, cssW, cssH, buildScene());
  }

  const paintRef = useRef(paint);
  paintRef.current = paint;

  // --- per-frame simulation ------------------------------------------------

  function throttledSfx(name: "ballClack" | "rail", gap: number) {
    const last = g.lastSfx[name] ?? -1;
    if (g.time - last >= gap) {
      g.lastSfx[name] = g.time;
      sfx(name);
    }
  }

  function handleEvent(ev: PoolEvent) {
    if (ev.type === "ballCollision") {
      throttledSfx("ballClack", 0.05);
    } else if (ev.type === "cushion") {
      throttledSfx("rail", 0.05);
    } else if (ev.type === "pocketed") {
      g.pocketedInto[ev.ball] = ev.pocket;
      sfx("pocket");
      const p = POOL_TABLE.pockets.find((pk) => pk.id === ev.pocket);
      const ball = g.balls.find((b) => b.id === ev.ball);
      if (p) g.pocketFx.push({ pos: { ...p.pos }, t: 0, color: ball?.color ?? "#fff" });
    }
  }

  function spawnChalk() {
    const cb = g.balls.find((b) => b.isCue);
    if (!cb || !g.shot) return;
    const rad = (g.shot.angleDeg * Math.PI) / 180;
    const back = { x: -Math.cos(rad), y: -Math.sin(rad) };
    const ox = cb.pos.x + back.x * cb.radius;
    const oy = cb.pos.y + back.y * cb.radius;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 4 + Math.random() * 10;
      g.particles.push({
        x: ox,
        y: oy,
        vx: Math.cos(a) * sp + back.x * 6,
        vy: Math.sin(a) * sp + back.y * 6,
        life: 0.3 + Math.random() * 0.25,
        maxLife: 0.55,
        size: 0.3 + Math.random() * 0.5,
        color: Math.random() < 0.5 ? "#dbe9ff" : "#9ec5ff",
      });
    }
  }

  function advanceShot(dt: number) {
    const cue = g.cue;
    if (!cue || !g.shot) return;
    if (!cue.struck) {
      cue.progress += dt / 0.5;
      if (cue.progress >= 1) {
        cue.progress = 1;
        cue.struck = true;
        cue.recoil = 0;
        sfx("cueHit");
        spawnChalk();
        g.balls = applyShot(g.balls, g.shot);
      }
    } else {
      cue.recoil += dt;
      const sub = 5;
      for (let i = 0; i < sub; i++) {
        const res = stepSimulation(g.balls, POOL_TABLE, dt / sub);
        g.balls = res.balls;
        for (const ev of res.events) handleEvent(ev);
        if (res.settled) {
          finishShot();
          return;
        }
      }
    }
  }

  function stepAmbient(dt: number) {
    const r = POOL_TABLE.ballRadius;
    for (const b of g.ambient) {
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
      if (b.pos.x < r) {
        b.pos.x = r;
        b.vel.x = Math.abs(b.vel.x);
      } else if (b.pos.x > POOL_TABLE.width - r) {
        b.pos.x = POOL_TABLE.width - r;
        b.vel.x = -Math.abs(b.vel.x);
      }
      if (b.pos.y < r) {
        b.pos.y = r;
        b.vel.y = Math.abs(b.vel.y);
      } else if (b.pos.y > POOL_TABLE.height - r) {
        b.pos.y = POOL_TABLE.height - r;
        b.vel.y = -Math.abs(b.vel.y);
      }
      if (Math.hypot(b.vel.x, b.vel.y) < 3) {
        const ang = Math.random() * Math.PI * 2;
        b.vel = { x: Math.cos(ang) * 5, y: Math.sin(ang) * 5 };
      }
    }
  }

  useGameLoop((dt) => {
    g.time += dt;
    g.revealPulse = Math.max(0, g.revealPulse - dt * 1.6);
    for (const p of g.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.life -= dt;
    }
    if (g.particles.length) g.particles = g.particles.filter((p) => p.life > 0);
    for (const fx of g.pocketFx) fx.t += dt;
    if (g.pocketFx.length) g.pocketFx = g.pocketFx.filter((fx) => fx.t < 0.5);

    if (screen === "start" || screen === "end") stepAmbient(dt);
    else if (screen === "play" && phase === "anim") advanceShot(dt);

    paint();
  }, !reduced);

  // --- shot lifecycle ------------------------------------------------------

  function finishShot() {
    const objPocket = g.pocketedInto["obj"];
    const scratched = !!g.pocketedInto["cue"];
    const success = objPocket === level.targetPocketId;
    const ideal = computeIdealShot(
      level.cue,
      level.object,
      pocketById(level.targetPocketId),
      POOL_TABLE,
    );
    const shot = g.shot ?? { angleDeg: 0, speed: 0 };
    const grade = gradeShot(shot, ideal);
    const firstTry = attemptsRef.current === 1;
    const points = scoreShot({
      success,
      scratched,
      angleErrorDeg: grade.angleErrorDeg,
      firstTry,
    });
    g.cue = null;
    if (success) {
      setSessionScore((s) => s + points);
      sfx("correct");
    } else {
      sfx("wrong");
    }
    setResult({
      success,
      scratched,
      idealAngle: ideal.aimAngleDeg,
      minSpeed: ideal.minSpeed,
      idealSpeed: ideal.idealSpeed,
      yourAngle: shot.angleDeg,
      angleError: grade.angleErrorDeg,
      points,
      isLast: levelIndex === POOL_LEVELS.length - 1,
    });
    setPhase("result");
  }

  function handleShoot() {
    if (phase !== "aim") return;
    const a = parseFloat(angle);
    const v = parseFloat(speed);
    if (!Number.isFinite(a) || !Number.isFinite(v) || v <= 0) {
      setInputError("Enter a numeric angle and a positive speed.");
      sfx("wrong");
      return;
    }
    setInputError(null);
    attemptsRef.current += 1;
    const shot = { angleDeg: a, speed: v };
    g.shot = shot;
    g.pocketedInto = {};
    g.particles = [];
    g.pocketFx = [];

    if (reduced) {
      g.balls = applyShot(g.balls, shot);
      let guard = 0;
      while (guard++ < 4000) {
        const res = stepSimulation(g.balls, POOL_TABLE, 1 / 120);
        g.balls = res.balls;
        for (const ev of res.events)
          if (ev.type === "pocketed") g.pocketedInto[ev.ball] = ev.pocket;
        if (res.settled) break;
      }
      if (g.pocketedInto["obj"] || g.pocketedInto["cue"]) sfx("pocket");
      finishShot();
      paintRef.current();
    } else {
      g.cue = { angleDeg: a, progress: 0, struck: false, recoil: 0 };
      setPhase("anim");
    }
  }

  function loadLevel(i: number) {
    const lvl = POOL_LEVELS[i];
    setLevelIndex(i);
    setResult(null);
    setPhase("aim");
    setAngle("");
    setSpeed("");
    setInputError(null);
    g.balls = makeBalls(lvl);
    g.cue = null;
    g.particles = [];
    g.pocketFx = [];
    g.pocketedInto = {};
    attemptsRef.current = 0;
    if (reduced) paintRef.current();
  }

  function retry() {
    g.balls = makeBalls(level);
    g.cue = null;
    g.particles = [];
    g.pocketFx = [];
    g.pocketedInto = {};
    setResult(null);
    setPhase("aim");
    if (reduced) paintRef.current();
  }

  function nextShot() {
    if (levelIndex === POOL_LEVELS.length - 1) {
      endSession();
      return;
    }
    loadLevel(levelIndex + 1);
  }

  function endSession() {
    setScreen("end");
    if (!endedRef.current) {
      endedRef.current = true;
      onGameOver({ score: sessionScore });
    }
  }

  function startGame() {
    resumeAudio();
    startTrack(POOL_TRACK);
    endedRef.current = false;
    setSessionScore(0);
    setScreen("play");
    loadLevel(0);
  }

  function flashObject() {
    g.revealPulse = 1;
    setEmphasize(true);
    window.clearTimeout(emphasizeTimer.current);
    emphasizeTimer.current = window.setTimeout(() => setEmphasize(false), 700);
    if (reduced) paintRef.current();
  }

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (screen !== "play") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pt = canvasToTable(
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      POOL_TABLE,
    );
    const obj = g.balls.find((b) => b.id === "obj");
    if (obj && !obj.pocketed && Math.hypot(pt.x - obj.pos.x, pt.y - obj.pos.y) < 4) {
      flashObject();
    }
  }

  // --- effects -------------------------------------------------------------

  useEffect(() => {
    paintRef.current();
    return () => window.clearTimeout(emphasizeTimer.current);
  }, []);

  useEffect(() => {
    if (reduced) paintRef.current();
  }, [reduced, screen, phase, levelIndex, angle, speed, emphasize, result]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => paintRef.current());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // --- render --------------------------------------------------------------

  const bestSoFar = Math.max(highScore, sessionScore);

  return (
    <div data-testid="pool-oneshot" className="select-none">
      <div className="relative overflow-hidden rounded-2xl bg-[#2a1809] shadow-xl shadow-black/30 ring-1 ring-black/40">
        <canvas
          ref={canvasRef}
          onClick={onCanvasClick}
          className="block w-full"
          style={{ aspectRatio: `${UNITS.w} / ${UNITS.h}` }}
        />

        {/* top controls */}
        <div className="absolute right-2 top-2 flex items-center gap-2">
          <button
            type="button"
            data-testid="pool-back-menu"
            onClick={onBack}
            className="flex h-9 items-center rounded-full bg-white/15 px-3 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            Menu
          </button>
          <button
            type="button"
            onClick={() => setHelpOpen((o) => !o)}
            aria-pressed={helpOpen}
            className="flex h-9 items-center rounded-full bg-white/15 px-3 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            {helpOpen ? "Hide help" : "How to aim"}
          </button>
          <MuteButton muted={muted} onToggle={toggleMute} />
        </div>

        {/* level banner */}
        {screen === "play" && (
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-white/10">
              Shot {levelIndex + 1}/{POOL_LEVELS.length} · {level.name}
            </span>
            <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-mono font-semibold text-amber-200 ring-1 ring-white/10">
              Score {sessionScore}
            </span>
          </div>
        )}

        {screen === "start" && (
          <Overlay>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
              Kinematics Arcade
            </p>
            <h2 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">
              Trick-Shot Lab
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-200">
              Read the coordinates, compute the aim angle and speed with the
              ghost-ball method, and sink the ball in the glowing pocket. Pure
              geometry &amp; kinematics — no dragging, just calculation.
            </p>
            <p className="mt-3 text-sm font-semibold text-amber-200">
              High score: {highScore}
            </p>
            <button
              type="button"
              onClick={startGame}
              className="mt-4 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-7 py-3 font-display text-base font-bold text-emerald-950 shadow-lg shadow-emerald-900/40 transition hover:from-emerald-300 hover:to-emerald-500 active:scale-95"
            >
              Break ▸
            </button>
          </Overlay>
        )}

        {screen === "end" && (
          <Overlay>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
              Session complete
            </p>
            <div className="mt-2 font-display text-6xl font-bold text-amber-300">
              {sessionScore}
            </div>
            <p className="mt-1 text-sm text-slate-200">
              {sessionScore >= highScore && sessionScore > 0
                ? "New personal best! 🎉"
                : `Best: ${bestSoFar}`}
            </p>
            {leaderboard && sessionScore > 0 && (
              <EndLeaderboard leaderboard={leaderboard} score={sessionScore} />
            )}
            <button
              type="button"
              onClick={startGame}
              className="mt-5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-7 py-3 font-display text-base font-bold text-emerald-950 shadow-lg shadow-emerald-900/40 transition hover:from-emerald-300 hover:to-emerald-500 active:scale-95"
            >
              Play again
            </button>
          </Overlay>
        )}

        {screen === "play" && phase === "result" && result && (
          <ResultCard result={result} onNext={nextShot} onRetry={retry} />
        )}
      </div>

      {screen === "play" && (
        <div className="mt-3">
          <PoolHud
            cue={level.cue}
            object={level.object}
            pocket={pocketById(level.targetPocketId)}
            ballRadius={POOL_TABLE.ballRadius}
            friction={POOL_TABLE.friction}
            objectNumber={level.objectNumber}
            objectColor={level.objectColor}
            targetLabel={pocketLabel(level.targetPocketId)}
            angle={angle}
            speed={speed}
            onAngle={setAngle}
            onSpeed={setSpeed}
            onShoot={handleShoot}
            disabled={phase !== "aim"}
            emphasizeObject={emphasize}
            onEmphasizeObject={flashObject}
          />
          {inputError && (
            <p className="mt-2 text-sm font-semibold text-rose-300">{inputError}</p>
          )}
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{level.hint}</p>
        </div>
      )}

      {helpOpen && <HelpPanel ballRadius={POOL_TABLE.ballRadius} />}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/55 via-black/40 to-black/65 p-4 text-center">
      {children}
    </div>
  );
}

function ResultCard({
  result,
  onNext,
  onRetry,
}: {
  result: ShotResult;
  onNext: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900/95 p-4 text-center ring-1 ring-white/15">
        <p
          className={`font-display text-xl font-bold ${
            result.success ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {result.success
            ? result.scratched
              ? "Sunk it — but you scratched!"
              : "Sunk it! 🎯"
            : "Missed the pocket"}
        </p>
        {result.success && (
          <p className="mt-1 font-mono text-2xl font-bold text-amber-300">
            +{result.points}
          </p>
        )}

        <dl className="mt-3 space-y-1 text-left text-sm">
          <Row label="Your angle" value={`${f1(result.yourAngle)}°`} />
          <Row
            label="Ideal angle"
            value={`${f1(result.idealAngle)}°`}
            accent="#6ee7b7"
          />
          <Row
            label="Angle error"
            value={`${f1(result.angleError)}°`}
            accent={result.angleError <= 2.5 ? "#6ee7b7" : "#fda4af"}
          />
          <Row
            label="Speed needed"
            value={`min ${f1(result.minSpeed)} · ideal ${f1(result.idealSpeed)}`}
            accent="#6ee7b7"
          />
        </dl>

        <div className="mt-4 flex justify-center gap-2">
          {result.success ? (
            <button
              type="button"
              onClick={onNext}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              {result.isLast ? "Finish ▸" : "Next shot ▸"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
            >
              Retry shot
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-1.5">
      <dt className="text-slate-300">{label}</dt>
      <dd className="font-mono font-semibold" style={{ color: accent ?? "#e2e8f0" }}>
        {value}
      </dd>
    </div>
  );
}
