import { useCallback, useEffect, useRef, useState } from "react";
import type { ArcadeGameProps, Vec2 } from "../types";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import { useGameLoop } from "../useGameLoop";
import { useArcadeAudio } from "../audio/useArcadeAudio";
import { BASKETBALL_TRACK } from "../audio/audioEngine";
import { MuteButton } from "../MuteButton";
import { EndLeaderboard } from "./EndLeaderboard";
import {
  ASPECT_H,
  ASPECT_W,
  computeLayout,
  randomSpawnX,
  type Layout,
} from "./basketballLayout";
import {
  aimAngleAt,
  aimRange,
  aimSpeedForDifficulty,
  applyTimeDelta,
  idealSpeed,
  meterSpeedForDifficulty,
  powerToSpeed,
  previewArc,
  simulateShot,
  solveSpeedWindow,
  speedToPower,
  QUESTION_INTERVAL,
  TIME_BONUS,
  TIME_LIMITS,
  WRONG_PENALTY,
  type AimRange,
  type ShotResult,
  type TimeLimit,
} from "./basketballPhysics";
import type {
  Banner,
  BballScene,
  CrowdSpeck,
  FloatText,
  Particle,
  Phase,
  Screen,
} from "./basketballScene";
import { drawScene } from "./basketballRender";
import type {
  BankDifficulty,
  BankQuestion,
} from "../../../content/practiceBank/types";
import { getGameQuestion } from "../../../ai/practiceQuestion";
import { practiceTopics } from "../../../ai/topics";
import { QuestionModal } from "./QuestionModal";

const TWO_PI = Math.PI * 2;
const FLY_DURATION = 0.9; // seconds for the ball to travel its arc
const SCORE_HOLD = 0.75; // seconds the result lingers before the next shot

interface CrowdSeed {
  fx: number;
  fy: number;
  color: string;
  phase: number;
  speed: number;
  amp: number;
}

interface GState {
  time: number;
  lightPhase: number;

  remaining: number;
  totalLimit: number;
  sinceQuestion: number;
  paused: boolean;

  score: number;
  combo: number;
  bestCombo: number;
  shots: number;
  makes: number;

  phase: Phase;

  /** Launch origin for the current shot (random along the line). */
  shotBall: Vec2;
  range: AimRange;
  /** Launch speed for a TRUE shot (fixed per shot); the green band sits here. */
  trueSpeed: number;
  aimPhase: number;
  dir: number;
  aimLocked: boolean;
  lockedDir: number;
  aimGood: boolean;
  greenCenter: number;
  greenHalf: number;
  aimPreview: Vec2[];

  powerPhase: number;
  power: number;

  ball: Vec2;
  ballSpin: number;
  trail: Vec2[];
  trajectory: Vec2[] | null;
  flyT: number;
  made: boolean;
  result: ShotResult;
  scoreTimer: number;

  netPos: number;
  netVel: number;
  netStretch: number;

  particles: Particle[];
  floats: FloatText[];
  banner: Banner | null;
  flash: number;
  shake: number;
}

function freshGState(limit: TimeLimit): GState {
  return {
    time: 0,
    lightPhase: 0,
    remaining: limit,
    totalLimit: limit,
    sinceQuestion: 0,
    paused: false,
    score: 0,
    combo: 0,
    bestCombo: 0,
    shots: 0,
    makes: 0,
    phase: "aim",
    shotBall: { x: 0, y: 0 },
    range: { centerRad: Math.PI / 2, halfRad: 0.7 },
    trueSpeed: 0,
    aimPhase: 0,
    dir: Math.PI / 2,
    aimLocked: false,
    lockedDir: Math.PI / 2,
    aimGood: true,
    greenCenter: 0.5,
    greenHalf: 0.06,
    aimPreview: [],
    powerPhase: 0,
    power: 0.5,
    ball: { x: 0, y: 0 },
    ballSpin: 0,
    trail: [],
    trajectory: null,
    flyT: 0,
    made: false,
    result: "wide",
    scoreTimer: 0,
    netPos: 0,
    netVel: 0,
    netStretch: 0,
    particles: [],
    floats: [],
    banner: null,
    flash: 0,
    shake: 0,
  };
}

/** Sets up a fresh shot: random spawn along the line + adaptive aim range. */
function newShot(g: GState, lay: Layout): void {
  g.shotBall = { x: randomSpawnX(lay), y: lay.spawnY };
  g.ball = { ...g.shotBall };
  g.range = aimRange(g.shotBall, lay.hoop);

  // The TRUE shot: aim dead-on (range center) with the speed that drops it
  // through the rim. The green power band is the window of speeds that actually
  // score from this true direction — so "stop it in the green" really makes it.
  const ideal = idealSpeed(g.shotBall, lay.hoop, g.range.centerRad, lay.gravity);
  g.trueSpeed = clampSpeed(ideal ?? (lay.speedMin + lay.speedMax) * 0.5, lay);
  const win = solveSpeedWindow(lay, g.shotBall, g.range.centerRad);
  if (win) {
    const lo = speedToPower(win.lo, lay);
    const hi = speedToPower(win.hi, lay);
    g.greenCenter = (lo + hi) / 2;
    g.greenHalf = Math.max(0.035, (hi - lo) / 2);
  } else {
    g.greenCenter = speedToPower(g.trueSpeed, lay);
    g.greenHalf = 0.05;
  }

  g.phase = "aim";
  g.aimPhase = 0;
  g.aimLocked = false;
  g.aimGood = true;
  g.dir = g.range.centerRad;
  g.power = 0.5;
  g.powerPhase = 0;
  g.trajectory = null;
  g.trail = [];
  g.flyT = 0;
  g.aimPreview = previewArc(lay, g.shotBall, g.dir, g.trueSpeed);
}

const CROWD_COLORS = ["#5cc8ff", "#ff7a1a", "#ffd23f", "#a78bfa", "#34d399", "#f472b6"];

function makeCrowd(): CrowdSeed[] {
  const seeds: CrowdSeed[] = [];
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 12; i++) {
      seeds.push({
        fx: 0.04 + (i / 11) * 0.92 + (Math.random() - 0.5) * 0.02,
        fy: 0.12 + row * 0.045 + Math.random() * 0.015,
        color: CROWD_COLORS[Math.floor(Math.random() * CROWD_COLORS.length)],
        phase: Math.random() * TWO_PI,
        speed: 1.5 + Math.random() * 2.5,
        amp: 2 + Math.random() * 3,
      });
    }
  }
  return seeds;
}

/** Shot difficulty ramps up as the player sinks more baskets. */
function shotDifficulty(makes: number): BankDifficulty {
  if (makes < 4) return "easy";
  if (makes < 9) return "medium";
  return "hard";
}

const COMBO_BANNERS: Record<number, string> = {
  3: "HEATING UP!",
  5: "ON FIRE!",
  8: "UNSTOPPABLE!",
  12: "LEGENDARY!",
};

export function BasketballGame(props: ArcadeGameProps) {
  const { highScore, onGameOver, leaderboard, onTopicResult } = props;
  const reduced = usePrefersReducedMotion();
  const { muted, toggleMute, start: startTrack, sfx, resumeAudio } =
    useArcadeAudio();

  const [screen, setScreen] = useState<Screen>("start");
  const [selectedLimit, setSelectedLimit] = useState<TimeLimit>(60);
  const [score, setScore] = useState(0);
  const [questionOpen, setQuestionOpen] = useState(false);
  // Mirrors g.phase (a ref) into state so the action button label re-renders
  // on aim→power→shot transitions (not every frame).
  const [uiPhase, setUiPhase] = useState<Phase>("aim");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layoutRef = useRef<Layout>(computeLayout(360, 450));
  const crowdRef = useRef<CrowdSeed[]>(makeCrowd());
  const excludeRef = useRef<string[]>([]);
  const topicsRef = useRef(practiceTopics());
  // Topic id of the most recently served question, so a graded answer can be
  // attributed to the right course topic for the mastery model.
  const lastTopicRef = useRef<string | null>(null);
  const avoidPromptsRef = useRef<string[]>([]);
  const endedRef = useRef(false);
  const gRef = useRef<GState>(freshGState(60));
  const g = gRef.current;

  const screenRef = useRef<Screen>(screen);
  screenRef.current = screen;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  // --- fx helpers ----------------------------------------------------------

  const pushFloat = useCallback(
    (text: string, color: string, x: number, y: number, size: number, vy = -55, life = 1.3) => {
      g.floats.push({ x, y, text, color, t: 0, life, vy, size });
    },
    [g],
  );

  const burst = useCallback(
    (
      x: number,
      y: number,
      count: number,
      colors: string[],
      speed: number,
      gravity: number,
      confetti: boolean,
    ) => {
      if (reducedRef.current) return;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * TWO_PI;
        const sp = speed * (0.4 + Math.random() * 0.8);
        g.particles.push({
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - (confetti ? speed * 0.3 : 0),
          life: 0.5 + Math.random() * 0.5,
          maxLife: 1,
          size: (confetti ? 4 : 2.5) + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          gravity,
          spin: confetti ? Math.random() * TWO_PI : undefined,
        });
      }
    },
    [g],
  );

  const setBanner = useCallback(
    (text: string, color: string, life: number) => {
      g.banner = { text, color, t: 0, life };
    },
    [g],
  );

  // --- shot lifecycle ------------------------------------------------------

  const finishShot = useCallback(() => {
    const lay = layoutRef.current;
    if (g.made) {
      g.makes += 1;
      g.combo += 1;
      g.bestCombo = Math.max(g.bestCombo, g.combo);
      g.score += 1;
      setScore(g.score);

      const swish = g.result === "swish";
      // Net reaction: a swish snaps the net down hard; rattles kick it sideways.
      g.netStretch = Math.max(g.netStretch, swish ? 1 : 0.6);
      g.netVel += (Math.random() < 0.5 ? -1 : 1) * (swish ? 70 : 110);
      sfx("swish");

      const milestone = COMBO_BANNERS[g.combo];
      if (milestone) {
        setBanner(milestone, "#ffd23f", 1.1);
        if (!reducedRef.current) {
          g.flash = Math.max(g.flash, 0.55);
          g.shake = Math.max(g.shake, 10);
          burst(lay.hoop.x, lay.hoop.y, 26, ["#ffd23f", "#ff7a1a", "#fff"], 220, 360, true);
        }
      } else {
        const label = swish ? "SWISH!" : g.result === "bankIn" ? "BANK!" : "AND ONE!";
        setBanner(g.combo >= 2 ? `${g.combo}x` : label, "#22c55e", 0.85);
      }
      if (!reducedRef.current) {
        sfx("cheer");
        g.flash = Math.max(g.flash, 0.35);
        burst(lay.hoop.x, lay.hoop.y, 18, ["#22c55e", "#bbf7d0", "#fff"], 160, 240, false);
        burst(lay.hoop.x, lay.hoop.y + lay.netDrop, 14, ["#ffd23f", "#ff7a1a"], 120, 320, true);
      }
      pushFloat("+1", "#ffd23f", lay.hoop.x, lay.hoop.y - lay.ballR * 2, lay.w * 0.06);
    } else {
      g.combo = 0;
      const clank = g.result === "rimOut";
      sfx(clank ? "rim" : "wrong");
      if (!reducedRef.current) {
        g.shake = Math.max(g.shake, clank ? 12 : 6);
        if (clank) {
          burst(lay.hoop.x, lay.hoop.y, 10, ["#ff7a1a", "#c8500a"], 130, 280, false);
        }
      }
      setBanner(clank ? "OFF THE RIM" : "MISS", "#ef4444", 0.8);
    }
    g.phase = "score";
    g.scoreTimer = SCORE_HOLD;
  }, [g, burst, pushFloat, setBanner, sfx]);

  const lockAim = useCallback(() => {
    const lay = layoutRef.current;
    g.lockedDir = g.dir;
    g.aimLocked = true;
    // Honest indicator: would a perfect-power (true-speed) shot at THIS locked
    // direction actually score? Green if so, red if the aim is off. The green
    // band itself stays fixed (the true-aim window from newShot).
    g.aimGood = simulateShot(lay, g.shotBall, g.lockedDir, g.trueSpeed).made;
    // Freeze the preview arc at the locked direction + true speed so it no
    // longer moves while the power meter sweeps.
    g.aimPreview = previewArc(lay, g.shotBall, g.lockedDir, g.trueSpeed);
    g.powerPhase = 0;
    g.power = 0.5;
    g.phase = "power";
    setUiPhase("power");
    sfx("click");
  }, [g, sfx]);

  const lockPower = useCallback(() => {
    const lay = layoutRef.current;
    const speed = powerToSpeed(g.power, lay);
    const sim = simulateShot(lay, g.shotBall, g.lockedDir, speed);
    g.made = sim.made;
    g.result = sim.result;
    g.trajectory = sim.points;
    g.flyT = 0;
    g.trail = [];
    g.shots += 1;
    g.aimPreview = [];
    setUiPhase("fly");
    sfx("shoot");
    if (reducedRef.current) {
      const end = sim.points[sim.points.length - 1];
      g.ball = { ...end };
      finishShot();
    } else {
      g.phase = "fly";
    }
  }, [g, sfx, finishShot]);

  const handleAction = useCallback(() => {
    if (screenRef.current !== "play" || g.paused) return;
    if (g.phase === "aim") lockAim();
    else if (g.phase === "power") lockPower();
  }, [g, lockAim, lockPower]);

  const actionRef = useRef(handleAction);
  actionRef.current = handleAction;

  // --- question loop -------------------------------------------------------

  const openQuestion = useCallback(() => {
    g.paused = true;
    setQuestionOpen(true);
    sfx("countdown");
  }, [g, sfx]);

  const handlePickQuestion = useCallback(
    async (d: BankDifficulty): Promise<BankQuestion | null> => {
      // Honors the global AI toggle: live AI (with bank fallback) when on, the
      // static bank with no network call when off. The clock is paused while
      // the modal is open, so the AI round-trip never costs the player time.
      const res = await getGameQuestion({
        difficulty: d,
        topics: topicsRef.current,
        avoidPrompts: avoidPromptsRef.current.slice(-6),
        excludeBankIds: excludeRef.current,
      });
      if (!res) return null;
      lastTopicRef.current = res.question.topicId;
      if (res.source === "ai") {
        avoidPromptsRef.current = [
          ...avoidPromptsRef.current,
          res.question.prompt,
        ].slice(-10);
      } else {
        excludeRef.current = [...excludeRef.current, res.question.id].slice(-10);
      }
      return res.question;
    },
    [],
  );

  const handleAnswered = useCallback(
    (correct: boolean, d: BankDifficulty) => {
      if (lastTopicRef.current) {
        onTopicResult?.(lastTopicRef.current, correct, d);
      }
      const lay = layoutRef.current;
      const delta = correct ? TIME_BONUS[d] : -WRONG_PENALTY;
      g.remaining = applyTimeDelta(g.remaining, delta);
      pushFloat(
        `${delta > 0 ? "+" : "−"}${Math.abs(delta)}s`,
        delta > 0 ? "#22c55e" : "#ef4444",
        lay.w * 0.5,
        lay.h * 0.2,
        lay.w * 0.1,
        -45,
        1.6,
      );
      sfx(correct ? "correct" : "wrong");
    },
    [g, pushFloat, sfx, onTopicResult],
  );

  const closeQuestion = useCallback(() => {
    g.paused = false;
    g.sinceQuestion = 0;
    setQuestionOpen(false);
  }, [g]);

  // --- game flow -----------------------------------------------------------

  const endGame = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    g.paused = true;
    setScore(g.score);
    setScreen("end");
    sfx("buzzer");
    if (!reducedRef.current) {
      g.shake = 18;
      g.flash = 0.45;
      if (g.score > highScore) {
        const lay = layoutRef.current;
        burst(lay.w * 0.5, lay.h * 0.4, 40, ["#ffd23f", "#ff7a1a", "#22c55e", "#5cc8ff"], 260, 380, true);
      }
    }
    onGameOver({ score: g.score });
  }, [g, burst, sfx, onGameOver, highScore]);

  const startGame = useCallback(() => {
    resumeAudio();
    startTrack(BASKETBALL_TRACK);
    endedRef.current = false;
    excludeRef.current = [];
    const fresh = freshGState(selectedLimit);
    newShot(fresh, layoutRef.current);
    if (!reducedRef.current) fresh.flash = 0.6;
    gRef.current = fresh;
    setScore(0);
    setQuestionOpen(false);
    setUiPhase("aim");
    setScreen("play");
  }, [resumeAudio, startTrack, selectedLimit]);

  // --- simulation ----------------------------------------------------------

  const advanceFly = useCallback(
    (dt: number) => {
      const traj = g.trajectory;
      if (!traj || traj.length < 2) return;
      g.flyT += dt / FLY_DURATION;
      const u = Math.min(1, g.flyT);
      const idx = u * (traj.length - 1);
      const i = Math.min(traj.length - 2, Math.floor(idx));
      const f = idx - i;
      const a = traj[i];
      const b = traj[i + 1];
      const nx = a.x + (b.x - a.x) * f;
      const ny = a.y + (b.y - a.y) * f;
      g.ballSpin += (nx - g.ball.x) * 0.05 + dt * 5;
      g.ball = { x: nx, y: ny };
      g.trail.push({ x: nx, y: ny });
      if (g.trail.length > 14) g.trail.shift();
      if (u >= 1) finishShot();
    },
    [g, finishShot],
  );

  const buildScene = useCallback((): BballScene => {
    const lay = layoutRef.current;
    const crowd: CrowdSpeck[] = crowdRef.current.map((c) => ({
      x: c.fx * lay.w,
      y: c.fy * lay.h,
      color: c.color,
      phase: c.phase,
      speed: c.speed,
      amp: c.amp,
    }));
    const ballPos = g.phase === "aim" ? g.shotBall : g.ball;
    // Faux-depth shrink as the ball rises toward the rim.
    const climb = (lay.spawnY - ballPos.y) / Math.max(1, lay.spawnY - lay.hoop.y);
    const ballScale = Math.max(0.6, 1 - 0.4 * Math.min(1, Math.max(0, climb)));
    return {
      screen: screenRef.current,
      phase: g.phase,
      reduced: reducedRef.current,
      time: g.time,
      lightPhase: g.lightPhase,
      ball: ballPos,
      ballScale,
      ballSpin: g.ballSpin,
      showBall:
        screenRef.current === "play" && (g.phase !== "score" || !g.made),
      trail: g.trail,
      aimPreview: g.aimPreview,
      aimLocked: g.aimLocked,
      aimGood: g.aimGood,
      power: g.power,
      powerGreen: g.greenCenter,
      powerHalf: g.greenHalf,
      netSway: g.netPos,
      netStretch: g.netStretch,
      remaining: g.remaining,
      totalLimit: g.totalLimit,
      score: g.score,
      combo: g.combo,
      highScore,
      particles: g.particles,
      floats: g.floats,
      crowd,
      flash: g.flash,
      banner: g.banner,
    };
  }, [g, highScore]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = canvas.clientWidth || 360;
    const cssH = (cssW * ASPECT_H) / ASPECT_W;
    const nw = Math.round(cssW * dpr);
    const nh = Math.round(cssH * dpr);
    if (canvas.width !== nw) canvas.width = nw;
    if (canvas.height !== nh) canvas.height = nh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    layoutRef.current = computeLayout(cssW, cssH);
    let sx = 0;
    let sy = 0;
    if (g.shake > 0.01 && !reducedRef.current) {
      sx = (Math.random() - 0.5) * g.shake;
      sy = (Math.random() - 0.5) * g.shake;
    }
    ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
    drawScene(ctx, layoutRef.current, buildScene());
  }, [g, buildScene]);

  const paintRef = useRef(paint);
  paintRef.current = paint;

  useGameLoop((dt) => {
    g.time += dt;

    if (!reducedRef.current) {
      g.lightPhase += dt * 0.6;
      for (const c of crowdRef.current) c.phase += dt * c.speed;
    }

    // Particles (gravity + drag + spin).
    if (g.particles.length) {
      for (const p of g.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.vx *= 0.985;
        p.life -= dt;
        if (p.spin != null) p.spin += dt * 9;
      }
      g.particles = g.particles.filter((p) => p.life > 0);
    }

    // Floating text.
    if (g.floats.length) {
      for (const f of g.floats) {
        f.t += dt;
        f.y += f.vy * dt;
      }
      g.floats = g.floats.filter((f) => f.t < f.life);
    }

    if (g.banner) {
      g.banner.t += dt;
      if (g.banner.t >= g.banner.life) g.banner = null;
    }

    g.flash = Math.max(0, g.flash - dt * 2);
    g.shake = Math.max(0, g.shake - dt * 45);

    // Net spring (sway) + swish-stretch decay.
    const K = 140;
    const DAMP = 6.5;
    g.netVel += (-K * g.netPos - DAMP * g.netVel) * dt;
    g.netPos += g.netVel * dt;
    g.netStretch = Math.max(0, g.netStretch - dt * 2.2);

    if (screenRef.current === "play" && !g.paused) {
      g.remaining = Math.max(0, g.remaining - dt);
      if (g.remaining <= 0) {
        endGame();
      } else {
        g.sinceQuestion += dt;
        const lay = layoutRef.current;
        const diff = shotDifficulty(g.makes);
        if (g.phase === "aim") {
          g.aimPhase += dt * aimSpeedForDifficulty(diff);
          const osc = Math.sin(g.aimPhase * TWO_PI);
          g.dir = aimAngleAt(g.range, osc);
          // The arc sweeps at the FIXED true speed, so the launch DIRECTION is
          // the skill: time the lock when the arc drops through the hoop.
          g.aimPreview = previewArc(lay, g.shotBall, g.dir, g.trueSpeed);
          if (g.sinceQuestion >= QUESTION_INTERVAL) openQuestion();
        } else if (g.phase === "power") {
          // Aim is locked; the arc is frozen (set at lock). Only the power meter
          // moves — keeping the two inputs visually independent.
          g.powerPhase += dt * 0.8 * meterSpeedForDifficulty(diff);
          g.power = 0.5 + 0.5 * Math.sin(g.powerPhase * TWO_PI);
        } else if (g.phase === "fly") {
          advanceFly(dt);
        } else if (g.phase === "score") {
          g.scoreTimer -= dt;
          if (g.scoreTimer <= 0) {
            newShot(g, layoutRef.current);
            setUiPhase("aim");
          }
        }
      }
    }

    paintRef.current();
  }, screen === "play" ? true : !reduced);

  // --- effects -------------------------------------------------------------

  useEffect(() => {
    paintRef.current();
  }, []);

  useEffect(() => {
    if (reduced) paintRef.current();
  }, [reduced, screen, questionOpen, score, selectedLimit]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => paintRef.current());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        if (screenRef.current === "play" && !gRef.current.paused) {
          e.preventDefault();
          actionRef.current();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- render --------------------------------------------------------------

  const newHigh = score > highScore && score > 0;
  const actionLabel =
    uiPhase === "power" ? "SHOOT!" : uiPhase === "aim" ? "LOCK AIM" : "…";

  return (
    <div data-testid="basketball-game" className="flex select-none justify-center">
      {/* Grow to fill the screen: the court is capped by width AND by the
          viewport height (it's a tall portrait court) so the whole thing stays
          on-screen on desktop while still going full-width on phones. */}
      <div
        className="w-full"
        style={{ maxWidth: "min(36rem, calc((100svh - 15rem) * 0.8))" }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-[#241433] shadow-xl shadow-black/40 ring-1 ring-black/50">
          <canvas
            ref={canvasRef}
            onClick={() => actionRef.current()}
            className="block w-full"
            style={{ aspectRatio: `${ASPECT_W} / ${ASPECT_H}` }}
          />

          <div className="absolute right-2 top-2">
            <MuteButton muted={muted} onToggle={toggleMute} />
          </div>

          {screen === "start" && (
            <Overlay>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-orange-300">
                Kinematics Arcade
              </p>
              <h2 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">
                Buzzer Beater
              </h2>
              <p className="mt-2 max-w-xs text-sm text-slate-200">
                Sweep the arc to aim, then time the power to drain it. Every{" "}
                {QUESTION_INTERVAL}s a physics question pops up — answer it to
                bank extra seconds on the clock.
              </p>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-300">
                Pick your clock
              </p>
              <div className="mt-2 flex gap-2">
                {TIME_LIMITS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedLimit(t)}
                    aria-pressed={selectedLimit === t}
                    className={`rounded-xl px-4 py-2 font-bold transition active:scale-95 ${
                      selectedLimit === t
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-900/40"
                        : "bg-white/15 text-slate-100 hover:bg-white/25"
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm font-semibold text-amber-200">
                High score: {highScore}
              </p>
              <button
                type="button"
                data-testid="bball-start"
                onClick={startGame}
                className="mt-3 rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 px-8 py-3 font-display text-lg font-bold text-white shadow-lg shadow-orange-900/40 transition hover:from-orange-300 hover:to-orange-500 active:scale-95"
              >
                Start ▸
              </button>
            </Overlay>
          )}

          {screen === "end" && (
            <Overlay>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-orange-300">
                Final buzzer
              </p>
              <div className="mt-2 font-display text-6xl font-bold text-amber-300">
                {score}
              </div>
              <p className="mt-1 text-sm text-slate-200">
                {newHigh
                  ? "🏆 New personal best!"
                  : `High score: ${Math.max(highScore, score)}`}
              </p>
              {g.bestCombo >= 2 && (
                <p className="mt-1 text-xs text-slate-400">
                  Best combo: {g.bestCombo}x · {g.makes}/{g.shots} made
                </p>
              )}
              {leaderboard && score > 0 && (
                <EndLeaderboard leaderboard={leaderboard} score={score} />
              )}
              <button
                type="button"
                onClick={startGame}
                className="mt-5 rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 px-8 py-3 font-display text-lg font-bold text-white shadow-lg shadow-orange-900/40 transition hover:from-orange-300 hover:to-orange-500 active:scale-95"
              >
                Play again
              </button>
            </Overlay>
          )}

          {questionOpen && (
            <QuestionModal
              onPickQuestion={handlePickQuestion}
              onAnswered={handleAnswered}
              onClose={closeQuestion}
            />
          )}
        </div>

        {screen === "play" && (
          <div className="mt-3 flex flex-col items-stretch gap-2">
            <button
              type="button"
              data-testid="bball-action"
              onClick={() => actionRef.current()}
              disabled={questionOpen}
              className="rounded-2xl bg-gradient-to-b from-orange-400 to-orange-600 py-4 font-display text-xl font-bold text-white shadow-lg shadow-orange-900/30 transition hover:from-orange-300 hover:to-orange-500 active:scale-[0.98] disabled:opacity-40"
            >
              {actionLabel}
            </button>
            <p className="text-center text-xs text-slate-400">
              Tap, click the court, or press{" "}
              <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                Space
              </kbd>{" "}
              — first to lock the aim arc, then to set the power.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function clampSpeed(speed: number, lay: Layout): number {
  return Math.max(lay.speedMin, Math.min(lay.speedMax, speed));
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-black/55 via-black/45 to-black/70 p-4 text-center">
      {children}
    </div>
  );
}
