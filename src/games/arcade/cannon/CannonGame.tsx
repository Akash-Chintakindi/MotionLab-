import { useCallback, useEffect, useRef, useState } from "react";
import type { ArcadeGameProps, Vec2 } from "../types";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import { useGameLoop } from "../useGameLoop";
import { useArcadeAudio } from "../audio/useArcadeAudio";
import { CANNON_TRACK } from "../audio/audioEngine";
import { MuteButton } from "../MuteButton";
import {
  ASPECT_H,
  ASPECT_W,
  cannonBodyCenter,
  cannonPivot,
  computeLayout,
  generateTerrain,
  type Layout,
  type Terrain,
} from "./cannonLayout";
import {
  aiAim,
  applyReward,
  applyWrongAnswer,
  computeScore,
  freshMatch,
  MAX_PLAYER_SHIELDS,
  powerToSpeed,
  previewArc,
  questionDifficulty,
  resolveHit,
  simulateShot,
  type MatchState,
  type RewardChoice,
} from "./cannonPhysics";
import type {
  Banner,
  CannonScene,
  Cloud,
  Explosion,
  FloatText,
  Particle,
  Phase,
  Screen,
  Side,
} from "./cannonScene";
import { drawScene } from "./cannonRender";
import type { BankDifficulty } from "../../../content/practiceBank/types";
import { getRandomQuestion } from "../../../content/practiceBank";
import { QuestionModal } from "./QuestionModal";

const TWO_PI = Math.PI * 2;
const FLY_DURATION = 1.0;
const RESOLVE_HOLD = 0.95;
const AI_TELEGRAPH = 0.85;
const INTRO_DUR = 0.85;

const PLAYER_REST = 0.85;
const AI_REST = Math.PI - 0.85;
const PLAYER_DIR_MIN = 0.06;
const PLAYER_DIR_MAX = 1.5;

const WARM_BALL = "#ffc564";
const HOT_BALL = "#ff7a5b";

interface CannonRuntime {
  angle: number;
  recoil: number;
  muzzleFlash: number;
}

interface GState {
  time: number;
  intro: number;
  skyPulse: number;

  phase: Phase;
  turn: Side;
  lastShooter: Side;

  terrain: Terrain;
  match: MatchState;

  player: CannonRuntime;
  ai: CannonRuntime;

  aiming: boolean;
  dragStart: Vec2 | null;
  dir: number;
  power: number;
  aimPreview: Vec2[];

  ball: Vec2;
  ballColor: string;
  showBall: boolean;
  trail: Vec2[];
  trajectory: Vec2[] | null;
  activeSim: ReturnType<typeof simulateShot> | null;
  activeShooter: Side;
  flyT: number;

  resolveTimer: number;
  telegraphTimer: number;
  aiPlan: { dir: number; speed: number } | null;
  aiTarget: Vec2 | null;
  pendingEnd: "win" | "lose" | null;

  hitsDealt: number;

  clouds: Cloud[];
  explosions: Explosion[];
  particles: Particle[];
  floats: FloatText[];
  banner: Banner | null;
  flash: number;
  shake: number;

  paused: boolean;
}

function makeClouds(): Cloud[] {
  const clouds: Cloud[] = [];
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random(),
      y: 0.1 + Math.random() * 0.25,
      scale: 0.05 + Math.random() * 0.05,
      speed: 0.004 + Math.random() * 0.006,
    });
  }
  return clouds;
}

function freshGState(terrain: Terrain): GState {
  return {
    time: 0,
    intro: 0,
    skyPulse: 0,
    phase: "playerAim",
    turn: "player",
    lastShooter: "player",
    terrain,
    match: freshMatch(),
    player: { angle: PLAYER_REST, recoil: 0, muzzleFlash: 0 },
    ai: { angle: AI_REST, recoil: 0, muzzleFlash: 0 },
    aiming: false,
    dragStart: null,
    dir: PLAYER_REST,
    power: 0.5,
    aimPreview: [],
    ball: { x: 0, y: 0 },
    ballColor: WARM_BALL,
    showBall: false,
    trail: [],
    trajectory: null,
    activeSim: null,
    activeShooter: "player",
    flyT: 0,
    resolveTimer: 0,
    telegraphTimer: 0,
    aiPlan: null,
    aiTarget: null,
    pendingEnd: null,
    hitsDealt: 0,
    clouds: makeClouds(),
    explosions: [],
    particles: [],
    floats: [],
    banner: null,
    flash: 0,
    shake: 0,
    paused: false,
  };
}

function muzzleTip(lay: Layout, pivot: Vec2, angle: number): Vec2 {
  return {
    x: pivot.x + Math.cos(angle) * lay.muzzleLen,
    y: pivot.y - Math.sin(angle) * lay.muzzleLen,
  };
}

export function CannonGame(props: ArcadeGameProps) {
  const { highScore, onGameOver } = props;
  const reduced = usePrefersReducedMotion();
  const { muted, toggleMute, start: startTrack, sfx, resumeAudio } =
    useArcadeAudio();

  const [screen, setScreen] = useState<Screen>("start");
  const [difficulty, setDifficulty] = useState<BankDifficulty>("medium");
  const [questionOpen, setQuestionOpen] = useState(false);
  const [qDifficulty, setQDifficulty] = useState<BankDifficulty>("medium");
  const [canTakeShield, setCanTakeShield] = useState(true);
  const [ammoUi, setAmmoUi] = useState(3);
  const [playerTurnUi, setPlayerTurnUi] = useState(true);
  const [end, setEnd] = useState<{ won: boolean; score: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layoutRef = useRef<Layout>(computeLayout(480, 360));
  const excludeRef = useRef<string[]>([]);
  const endedRef = useRef(false);
  const difficultyRef = useRef<BankDifficulty>("medium");
  difficultyRef.current = difficulty;

  const gRef = useRef<GState>(
    freshGState(generateTerrain(computeLayout(480, 360))),
  );
  const g = gRef.current;

  const screenRef = useRef<Screen>(screen);
  screenRef.current = screen;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  // --- fx helpers ----------------------------------------------------------

  const setBanner = useCallback(
    (text: string, color: string, life: number, sub?: string) => {
      g.banner = { text, color, t: 0, life, sub };
    },
    [g],
  );

  const pushFloat = useCallback(
    (text: string, color: string, x: number, y: number, size: number) => {
      g.floats.push({ x, y, text, color, t: 0, life: 1.3, vy: -60, size });
    },
    [g],
  );

  const explode = useCallback(
    (x: number, y: number, big: boolean) => {
      const lay = layoutRef.current;
      g.explosions.push({
        x,
        y,
        t: 0,
        life: big ? 0.7 : 0.45,
        r: big ? lay.hitR * 2.2 : lay.hitR * 1.2,
        big,
      });
      if (reducedRef.current) return;
      const count = big ? 26 : 12;
      const colors = big
        ? ["#fff3c4", "#ffb13a", "#ff6a2a", "#9a3412"]
        : ["#caa15a", "#8a5a32", "#ffb866"];
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * TWO_PI;
        const sp = (big ? 240 : 150) * (0.4 + Math.random() * 0.9);
        g.particles.push({
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - (big ? 90 : 40),
          life: 0.5 + Math.random() * 0.6,
          maxLife: 1.1,
          size: (big ? 3 : 2) + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          gravity: lay.gravity * 0.5,
          spin: Math.random() < 0.4 ? Math.random() * TWO_PI : undefined,
        });
      }
    },
    [g],
  );

  // --- shot lifecycle ------------------------------------------------------

  const resolveImpact = useCallback(
    (sim: ReturnType<typeof simulateShot>, shooter: Side) => {
      const lay = layoutRef.current;
      g.showBall = false;
      g.lastShooter = shooter;

      if (sim.outcome === "hitTarget") {
        const victim: Side = shooter === "player" ? "ai" : "player";
        const { state, result } = resolveHit(g.match, victim);
        g.match = state;
        setAmmoUi(g.match.ammo);
        if (shooter === "player") g.hitsDealt += 1;

        const center =
          victim === "ai"
            ? cannonBodyCenter(lay, g.terrain, lay.aiX)
            : cannonBodyCenter(lay, g.terrain, lay.playerX);

        if (result === "shielded") {
          explode(center.x, center.y, false);
          sfx("shieldBreak");
          setBanner(
            "SHIELD HOLDS!",
            shooter === "player" ? "#fca5a5" : "#7dd3fc",
            0.9,
          );
          if (!reducedRef.current) g.shake = Math.max(g.shake, 8);
        } else {
          explode(center.x, center.y, true);
          sfx("explosion");
          if (!reducedRef.current) {
            g.flash = Math.max(g.flash, 0.5);
            g.shake = Math.max(g.shake, 16);
          }
          if (result === "defeated") {
            g.pendingEnd = shooter === "player" ? "win" : "lose";
          } else {
            setBanner(
              shooter === "player" ? "DIRECT HIT!" : "YOU'RE HIT!",
              shooter === "player" ? "#fcd34d" : "#fb7185",
              0.95,
            );
          }
        }
      } else if (sim.outcome === "hitTerrain") {
        explode(sim.impact.x, sim.impact.y, false);
        sfx("explosion");
        if (!reducedRef.current) g.shake = Math.max(g.shake, 6);
        setBanner("MISS", "#cbd5e1", 0.7);
      } else {
        setBanner("WIDE!", "#cbd5e1", 0.7);
      }

      g.phase = "resolve";
      g.resolveTimer = reducedRef.current ? 0.25 : RESOLVE_HOLD;
    },
    [g, explode, sfx, setBanner],
  );

  const setupFlight = useCallback(
    (sim: ReturnType<typeof simulateShot>, shooter: Side, color: string) => {
      g.trajectory = sim.points;
      g.activeSim = sim;
      g.activeShooter = shooter;
      g.flyT = 0;
      g.trail = [];
      g.ball = { ...sim.points[0] };
      g.ballColor = color;
      g.showBall = true;
      const shooterRt = shooter === "player" ? g.player : g.ai;
      shooterRt.recoil = 1;
      shooterRt.muzzleFlash = 1;
      sfx("cannonFire");
      if (!reducedRef.current) g.shake = Math.max(g.shake, 7);
      if (reducedRef.current) {
        g.ball = { ...sim.impact };
        resolveImpact(sim, shooter);
      } else {
        g.phase = shooter === "player" ? "playerFly" : "aiFly";
      }
    },
    [g, sfx, resolveImpact],
  );

  const firePlayer = useCallback(() => {
    if (g.match.ammo <= 0) {
      setBanner("OUT OF AMMO", "#fca5a5", 0.9, "Open Questions to resupply");
      sfx("wrong");
      return;
    }
    const lay = layoutRef.current;
    g.match = { ...g.match, ammo: g.match.ammo - 1 };
    setAmmoUi(g.match.ammo);
    g.player.angle = g.dir;
    const from = muzzleTip(lay, cannonPivot(lay, g.terrain, lay.playerX), g.dir);
    const target = cannonBodyCenter(lay, g.terrain, lay.aiX);
    const sim = simulateShot(
      lay,
      g.terrain,
      from,
      g.dir,
      powerToSpeed(g.power, lay),
      target,
      lay.hitR,
    );
    g.aiming = false;
    g.dragStart = null;
    g.aimPreview = [];
    g.turn = "player";
    setPlayerTurnUi(false);
    setupFlight(sim, "player", WARM_BALL);
  }, [g, setupFlight, setBanner, sfx]);

  const beginPlayerRound = useCallback(() => {
    const lay = layoutRef.current;
    // Regenerate the battlefield each round so the terrain keeps changing.
    g.terrain = generateTerrain(lay);
    g.turn = "player";
    g.phase = "playerAim";
    g.aiming = false;
    g.dragStart = null;
    g.aimPreview = [];
    g.dir = PLAYER_REST;
    g.power = 0.5;
    g.player.angle = PLAYER_REST;
    g.ai.angle = AI_REST;
    setPlayerTurnUi(true);
  }, [g]);

  const beginAiTurn = useCallback(() => {
    const lay = layoutRef.current;
    g.turn = "ai";
    setPlayerTurnUi(false);
    const from = muzzleTip(lay, cannonPivot(lay, g.terrain, lay.aiX), g.ai.angle);
    const target = cannonBodyCenter(lay, g.terrain, lay.playerX);
    const plan = aiAim(
      lay,
      g.terrain,
      from,
      target,
      lay.hitR,
      difficultyRef.current,
    );
    g.aiPlan = plan;
    g.aiTarget = target;
    g.phase = "aiTelegraph";
    g.telegraphTimer = reducedRef.current ? 0 : AI_TELEGRAPH;
    if (reducedRef.current) fireAiRef.current();
  }, [g]);

  const fireAi = useCallback(() => {
    const lay = layoutRef.current;
    const plan = g.aiPlan;
    if (!plan) {
      beginPlayerRound();
      return;
    }
    g.ai.angle = plan.dir;
    const from = muzzleTip(lay, cannonPivot(lay, g.terrain, lay.aiX), plan.dir);
    const target =
      g.aiTarget ?? cannonBodyCenter(lay, g.terrain, lay.playerX);
    const sim = simulateShot(
      lay,
      g.terrain,
      from,
      plan.dir,
      plan.speed,
      target,
      lay.hitR,
    );
    setupFlight(sim, "ai", HOT_BALL);
  }, [g, setupFlight, beginPlayerRound]);

  const fireAiRef = useRef(fireAi);
  fireAiRef.current = fireAi;

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
      g.ball = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
      g.trail.push({ ...g.ball });
      if (g.trail.length > 16) g.trail.shift();
      if (u >= 1 && g.activeSim) {
        resolveImpact(g.activeSim, g.activeShooter);
      }
    },
    [g, resolveImpact],
  );

  // --- questions -----------------------------------------------------------

  const openQuestion = useCallback(() => {
    g.paused = true;
    g.aiming = false;
    g.dragStart = null;
    g.aimPreview = [];
    setQDifficulty(questionDifficulty(g.match.playerHearts, g.match.aiHearts));
    setCanTakeShield(g.match.playerShields < MAX_PLAYER_SHIELDS);
    setQuestionOpen(true);
    sfx("countdown");
  }, [g, sfx]);

  const handlePickQuestion = useCallback((d: BankDifficulty) => {
    const q = getRandomQuestion(d, excludeRef.current);
    if (q) excludeRef.current = [...excludeRef.current, q.id].slice(-12);
    return q ?? null;
  }, []);

  const handleAnswered = useCallback(
    (correct: boolean) => {
      if (correct) {
        sfx("correct");
        return;
      }
      g.match = applyWrongAnswer(g.match);
      sfx("wrong");
      sfx("shieldUp");
      const lay = layoutRef.current;
      pushFloat("RIVAL +🛡", "#fca5a5", lay.aiX, lay.h * 0.3, lay.w * 0.03);
    },
    [g, sfx, pushFloat],
  );

  const handleReward = useCallback(
    (choice: RewardChoice) => {
      g.match = applyReward(g.match, choice);
      setAmmoUi(g.match.ammo);
      const lay = layoutRef.current;
      if (choice === "shield") {
        sfx("shieldUp");
        pushFloat("+🛡 SHIELD", "#7dd3fc", lay.playerX, lay.h * 0.3, lay.w * 0.03);
      } else {
        sfx("click");
        pushFloat("+1 AMMO", "#ffe08a", lay.playerX, lay.h * 0.3, lay.w * 0.03);
      }
    },
    [g, sfx, pushFloat],
  );

  const closeQuestion = useCallback(() => {
    g.paused = false;
    setQuestionOpen(false);
    setAmmoUi(g.match.ammo);
  }, [g]);

  // --- game flow -----------------------------------------------------------

  const endGame = useCallback(
    (result: "win" | "lose") => {
      if (endedRef.current) return;
      endedRef.current = true;
      const won = result === "win";
      const score = computeScore({
        won,
        hitsDealt: g.hitsDealt,
        playerHearts: g.match.playerHearts,
        ammo: g.match.ammo,
        playerShields: g.match.playerShields,
        difficulty: difficultyRef.current,
      });
      g.paused = true;
      g.showBall = false;
      setEnd({ won, score });
      setScreen("end");
      setBanner(won ? "VICTORY!" : "DEFEATED", won ? "#fcd34d" : "#fb7185", 1.4);
      sfx(won ? "victory" : "defeat");
      if (!reducedRef.current) {
        g.flash = 0.5;
        g.shake = 18;
        const lay = layoutRef.current;
        if (won) {
          for (let i = 0; i < 36; i++) {
            const ang = Math.random() * TWO_PI;
            const sp = 220 * (0.4 + Math.random() * 0.9);
            g.particles.push({
              x: lay.w * 0.5,
              y: lay.h * 0.4,
              vx: Math.cos(ang) * sp,
              vy: Math.sin(ang) * sp - 120,
              life: 0.8 + Math.random() * 0.7,
              maxLife: 1.5,
              size: 3 + Math.random() * 4,
              color: ["#fcd34d", "#38bdf8", "#fb7185", "#a7f3d0"][
                Math.floor(Math.random() * 4)
              ],
              gravity: lay.gravity * 0.45,
              spin: Math.random() * TWO_PI,
            });
          }
        }
      }
      onGameOver({ score });
    },
    [g, onGameOver, sfx, setBanner],
  );

  const startGame = useCallback(() => {
    resumeAudio();
    startTrack(CANNON_TRACK);
    endedRef.current = false;
    excludeRef.current = [];
    const lay = layoutRef.current;
    const fresh = freshGState(generateTerrain(lay));
    if (reducedRef.current) fresh.intro = 1;
    else fresh.flash = 0.55;
    gRef.current = fresh;
    setAmmoUi(fresh.match.ammo);
    setPlayerTurnUi(true);
    setQuestionOpen(false);
    setEnd(null);
    setScreen("play");
  }, [resumeAudio, startTrack]);

  // --- input ---------------------------------------------------------------

  const localPoint = useCallback((clientX: number, clientY: number): Vec2 => {
    const canvas = canvasRef.current;
    const lay = layoutRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * lay.w,
      y: ((clientY - rect.top) / rect.height) * lay.h,
    };
  }, []);

  const canAim = useCallback(
    () =>
      screenRef.current === "play" &&
      !g.paused &&
      g.turn === "player" &&
      g.phase === "playerAim",
    [g],
  );

  const updateAimFromDrag = useCallback(
    (cur: Vec2) => {
      const lay = layoutRef.current;
      const start = g.dragStart;
      if (!start) return;
      // Slingshot: pull BACK from the start point; the launch fires the opposite
      // way, with power proportional to how far you pulled (capped).
      const vx = start.x - cur.x;
      const vy = start.y - cur.y;
      const dist = Math.hypot(vx, vy);
      const maxDrag = lay.h * 0.5;
      g.power = Math.max(0, Math.min(1, dist / maxDrag));
      if (dist > 4) {
        const raw = Math.atan2(-vy, vx); // y-up
        g.dir = Math.max(PLAYER_DIR_MIN, Math.min(PLAYER_DIR_MAX, raw));
      }
      g.player.angle = g.dir;
      const from = muzzleTip(
        lay,
        cannonPivot(lay, g.terrain, lay.playerX),
        g.dir,
      );
      g.aimPreview = previewArc(
        lay,
        g.terrain,
        from,
        g.dir,
        powerToSpeed(g.power, lay),
      );
    },
    [g],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canAim()) return;
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      g.aiming = true;
      g.dragStart = localPoint(e.clientX, e.clientY);
      g.power = 0;
      updateAimFromDrag(g.dragStart);
    },
    [g, canAim, localPoint, updateAimFromDrag],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!g.aiming) return;
      e.preventDefault();
      updateAimFromDrag(localPoint(e.clientX, e.clientY));
    },
    [g, localPoint, updateAimFromDrag],
  );

  const endDrag = useCallback(() => {
    if (!g.aiming) return;
    g.aiming = false;
    const launched = g.power > 0.06;
    g.dragStart = null;
    if (launched) firePlayer();
    else g.aimPreview = [];
  }, [g, firePlayer]);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
      endDrag();
    },
    [endDrag],
  );

  // --- scene + paint -------------------------------------------------------

  const buildScene = useCallback((): CannonScene => {
    const lay = layoutRef.current;
    const playerPivot = cannonPivot(lay, g.terrain, lay.playerX);
    const aiPivot = cannonPivot(lay, g.terrain, lay.aiX);
    return {
      screen: screenRef.current,
      phase: g.phase,
      reduced: reducedRef.current,
      time: g.time,
      terrain: g.terrain,
      clouds: g.clouds,
      skyPulse: g.skyPulse,
      player: {
        pivot: playerPivot,
        angle: g.player.angle,
        hearts: g.match.playerHearts,
        shields: g.match.playerShields,
        recoil: g.player.recoil,
        muzzleFlash: g.player.muzzleFlash,
      },
      ai: {
        pivot: aiPivot,
        angle: g.ai.angle,
        hearts: g.match.aiHearts,
        shields: g.match.aiShields,
        recoil: g.ai.recoil,
        muzzleFlash: g.ai.muzzleFlash,
      },
      turn: g.turn,
      ball: g.ball,
      showBall: g.showBall,
      ballColor: g.ballColor,
      trail: g.trail,
      aimPreview: g.aimPreview,
      aiming: g.aiming,
      power: g.power,
      aimAngle: g.dir,
      ammo: g.match.ammo,
      difficulty: difficultyRef.current,
      explosions: g.explosions,
      particles: g.particles,
      floats: g.floats,
      banner: g.banner,
      flash: g.flash,
      intro: g.intro,
    };
  }, [g]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = canvas.clientWidth || 480;
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
      g.skyPulse += dt * 1.2;
      for (const c of g.clouds) {
        c.x += c.speed * dt;
        if (c.x > 1.2) c.x = -0.2;
      }
    }
    if (g.intro < 1) g.intro = Math.min(1, g.intro + dt / INTRO_DUR);

    // Runtime decays.
    g.player.recoil = Math.max(0, g.player.recoil - dt * 4);
    g.ai.recoil = Math.max(0, g.ai.recoil - dt * 4);
    g.player.muzzleFlash = Math.max(0, g.player.muzzleFlash - dt * 6);
    g.ai.muzzleFlash = Math.max(0, g.ai.muzzleFlash - dt * 6);
    g.flash = Math.max(0, g.flash - dt * 2);
    g.shake = Math.max(0, g.shake - dt * 45);

    if (g.explosions.length) {
      for (const ex of g.explosions) ex.t += dt;
      g.explosions = g.explosions.filter((ex) => ex.t < ex.life);
    }
    if (g.particles.length) {
      for (const p of g.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.vx *= 0.99;
        p.life -= dt;
        if (p.spin != null) p.spin += dt * 8;
      }
      g.particles = g.particles.filter((p) => p.life > 0);
    }
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

    if (screenRef.current === "play" && !g.paused) {
      if (g.phase === "playerFly" || g.phase === "aiFly") {
        advanceFly(dt);
      } else if (g.phase === "aiTelegraph") {
        const plan = g.aiPlan;
        if (plan) {
          // Swing the rival barrel onto target (anticipation before the shot).
          g.ai.angle += (plan.dir - g.ai.angle) * Math.min(1, dt * 6);
        }
        g.telegraphTimer -= dt;
        if (g.telegraphTimer <= 0) fireAiRef.current();
      } else if (g.phase === "resolve") {
        g.resolveTimer -= dt;
        if (g.resolveTimer <= 0) {
          if (g.pendingEnd) {
            endGame(g.pendingEnd === "win" ? "win" : "lose");
          } else if (g.lastShooter === "player") {
            beginAiTurn();
          } else {
            beginPlayerRound();
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
  }, [reduced, screen, questionOpen, ammoUi, difficulty, end, playerTurnUi]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => paintRef.current());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // --- render --------------------------------------------------------------

  const bestScore = Math.max(highScore, end?.score ?? 0);
  const newHigh = (end?.score ?? 0) > highScore && (end?.score ?? 0) > 0;

  return (
    <div data-testid="cannon-game" className="flex select-none justify-center">
      <div className="w-full" style={{ maxWidth: "min(56rem, calc((100svh - 13rem) * 1.333))" }}>
        <div className="relative overflow-hidden rounded-2xl bg-[#241a44] shadow-xl shadow-black/40 ring-1 ring-black/50">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="block w-full touch-none"
            style={{ aspectRatio: `${ASPECT_W} / ${ASPECT_H}` }}
          />

          <div className="absolute right-2 top-2">
            <MuteButton muted={muted} onToggle={toggleMute} />
          </div>

          {screen === "start" && (
            <Overlay>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
                Kinematics Arcade
              </p>
              <h2 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">
                Cannon Duel
              </h2>
              <p className="mt-2 max-w-sm text-sm text-slate-200">
                Drag back from your cannon to set the angle and power, then
                release to fire across the terrain. Land 3 hits on the rival to
                win. Out of ammo? Answer physics questions to resupply.
              </p>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-300">
                Choose your rival
              </p>
              <div className="mt-2 flex gap-2">
                {(["easy", "medium", "hard"] as BankDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    data-testid={`cannon-diff-${d}`}
                    onClick={() => setDifficulty(d)}
                    aria-pressed={difficulty === d}
                    className={`rounded-xl px-4 py-2 font-bold capitalize transition active:scale-95 ${
                      difficulty === d
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-900/40"
                        : "bg-white/15 text-slate-100 hover:bg-white/25"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm font-semibold text-amber-200">
                High score: {highScore}
              </p>
              <button
                type="button"
                data-testid="cannon-start"
                onClick={startGame}
                className="mt-3 rounded-xl bg-gradient-to-b from-sky-400 to-sky-600 px-8 py-3 font-display text-lg font-bold text-white shadow-lg shadow-sky-900/40 transition hover:from-sky-300 hover:to-sky-500 active:scale-95"
              >
                Take aim ▸
              </button>
            </Overlay>
          )}

          {screen === "end" && end && (
            <Overlay>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
                {end.won ? "Battle won" : "Battle lost"}
              </p>
              <div
                className={`mt-2 font-display text-5xl font-bold ${
                  end.won ? "text-amber-300" : "text-rose-300"
                }`}
              >
                {end.won ? "Victory" : "Defeat"}
              </div>
              <div className="mt-2 font-display text-3xl font-bold text-white">
                {end.score}
              </div>
              <p className="mt-1 text-sm text-slate-200">
                {newHigh ? "🏆 New personal best!" : `High score: ${bestScore}`}
              </p>
              <button
                type="button"
                onClick={startGame}
                className="mt-5 rounded-xl bg-gradient-to-b from-sky-400 to-sky-600 px-8 py-3 font-display text-lg font-bold text-white shadow-lg shadow-sky-900/40 transition hover:from-sky-300 hover:to-sky-500 active:scale-95"
              >
                Rematch
              </button>
            </Overlay>
          )}

          {questionOpen && (
            <QuestionModal
              difficulty={qDifficulty}
              canTakeShield={canTakeShield}
              onPickQuestion={handlePickQuestion}
              onAnswered={handleAnswered}
              onChooseReward={handleReward}
              onClose={closeQuestion}
            />
          )}
        </div>

        {screen === "play" && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              data-testid="cannon-questions"
              onClick={openQuestion}
              disabled={questionOpen || !playerTurnUi}
              className="flex-1 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 font-display text-lg font-bold text-white shadow-lg shadow-amber-900/30 transition hover:from-amber-300 hover:to-amber-500 active:scale-[0.98] disabled:opacity-40"
            >
              📚 Questions
            </button>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center font-display text-base font-bold text-white">
              🎯 {ammoUi}
            </div>
          </div>
        )}

        {screen === "play" && (
          <p className="mt-2 text-center text-xs text-slate-400">
            {playerTurnUi
              ? ammoUi > 0
                ? "Drag back from your cannon, release to fire."
                : "Out of ammo — tap Questions to resupply."
              : "Rival is taking aim…"}
          </p>
        )}
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-black/55 via-black/45 to-black/70 p-4 text-center">
      {children}
    </div>
  );
}
