import { useEffect, useRef, useState } from "react";
import type { ArcadeGameProps, Vec2 } from "../types";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import { useGameLoop } from "../useGameLoop";
import { useArcadeAudio } from "../audio/useArcadeAudio";
import { POOL_TRACK } from "../audio/audioEngine";
import { MuteButton } from "../MuteButton";
import { EndLeaderboard } from "../basketball/EndLeaderboard";
import {
  applyShot,
  predictAim,
  simulateToSettle,
  stepSimulation,
  type AimPrediction,
  type Ball,
  type PoolEvent,
} from "./poolPhysics";
import { POOL_TABLE } from "./poolLevels";
import {
  canvasToTable,
  drawScene,
  totalUnits,
  type CueAnim,
  type Particle,
  type PocketFx,
  type SceneState,
} from "./poolRender";
import {
  initialFullState,
  makeRack,
  resolveTurn,
  respotCue,
  tableNumbers,
  type Difficulty,
  type FullState,
  type Group,
  type Side,
} from "./poolGameLogic";
import { chooseAiShot } from "./poolAi";
import {
  bestMakeableShot,
  consumeUndoScratch,
  legalCuePlacement,
  PERK_INFO,
  QUESTION_POINTS,
  type BestShot,
  type PerkKind,
} from "./poolPerks";
import { QuestionModal, type PerkOption, type PoolQuestion } from "./QuestionModal";
import { getPracticeQuestion } from "../../../ai/practiceQuestion";
import { practiceTopics } from "../../../ai/topics";
import type { AIPracticeQuestion } from "../../../ai/practiceTypes";
import type { BankDifficulty } from "../../../content/practiceBank/types";

type Phase = "aim" | "anim" | "ai" | "over";

/** Adapt an AI-generated question into the modal's gradeable shape. */
function aiToPoolQuestion(q: AIPracticeQuestion, d: BankDifficulty): PoolQuestion {
  return {
    id: q.id,
    type: q.type,
    category: "calculation",
    prompt: q.prompt,
    options: q.options,
    correctOptionId: q.correctOptionId,
    value: q.value,
    tolerance: q.tolerance,
    unit: q.unit,
    explanation: q.explanation,
    difficulty: d,
    source: "ai",
  };
}

const UNITS = totalUnits(POOL_TABLE);
/** Power 0..1 maps onto this launch-speed band (units/s). */
const MIN_SPEED = 14;
/**
 * Full-power break speed (units/s). The cue→apex gap is ~43 units and friction
 * is 22 u/s², so at this speed the cue still slams the rack at ~sqrt(330² −
 * 2·22·43) ≈ 327 u/s — fast enough that the line-of-centres cascade flings the
 * back rows out past the far rails and genuinely scatters the WHOLE rack
 * (post-contact balls leaving at ~150–300 u/s coast 500+ units, i.e. several
 * rail lengths). The sim's sub-stepping (MAX_SUBSTEPS / MAX_STEP_FRACTION) keeps
 * it stable — even 6000 u/s is sub-stepped without tunneling — so this is safe.
 */
const MAX_SPEED = 330;
/** Below this, a shot won't fire (guards an accidental zero-power tap). */
const MIN_SHOOT_POWER = 0.06;

const powerToSpeed = (p: number) => MIN_SPEED + (MAX_SPEED - MIN_SPEED) * clamp01(p);

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

interface GameRefState {
  balls: Ball[];
  particles: Particle[];
  pocketFx: PocketFx[];
  cue: CueAnim | null;
  shot: { angleDeg: number; speed: number; spin?: Vec2 } | null;
  pocketedNums: number[];
  shooter: Side;
  aiPocketId: string | null;
  broke: boolean;
  time: number;
  lastSfx: Record<string, number>;
}

export function FullPoolGame(
  props: ArcadeGameProps & { difficulty: Difficulty; onBack: () => void },
) {
  const { highScore, onGameOver, leaderboard, difficulty, onBack, onTopicResult } =
    props;
  const reduced = usePrefersReducedMotion();
  const { muted, toggleMute, start: startTrack, sfx, resumeAudio } = useArcadeAudio();

  const [phase, setPhase] = useState<Phase>("aim");
  const [fullState, setFullState] = useState<FullState>(() => initialFullState("player"));
  const [aimAngle, setAimAngle] = useState(0);
  // Aim is committed with an explicit lock so sliding to the power bar can't
  // nudge the cue; a fresh aim phase always starts unlocked (see resetters).
  const [aimLocked, setAimLocked] = useState(false);
  const [power, setPower] = useState(0.55);
  const [banner, setBanner] = useState(
    "Your break — move to aim · drag the power bar · press Shoot",
  );

  // --- learning + perks (per turn) ----------------------------------------
  const [questionOpen, setQuestionOpen] = useState(false);
  const [perkOptions, setPerkOptions] = useState<PerkOption[]>([]);
  const [activePerk, setActivePerk] = useState<PerkKind | null>(null);
  const [assist, setAssist] = useState<BestShot | null>(null);
  const [placingCue, setPlacingCue] = useState(false);
  const [placementLegal, setPlacementLegal] = useState(true);
  // Spin perk: once chosen, the player dials english on a mini cue ball. `spin`
  // is the contact offset in [-1,1] (y = follow+/draw−, x = side); reset per turn.
  const [spinActive, setSpinActive] = useState(false);
  const [spin, setSpin] = useState<Vec2>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const powerBarRef = useRef<HTMLDivElement | null>(null);
  const powerDragRef = useRef(false);
  const placeDragRef = useRef(false);
  const spinRef = useRef<HTMLDivElement | null>(null);
  const spinDragRef = useRef(false);
  const scoreRef = useRef(0);
  const endedRef = useRef(false);
  const aiTimer = useRef<number | undefined>(undefined);
  const fsRef = useRef<FullState>(fullState);
  // Scratch-Shield token (mirrored in a ref so resolveAfterShot reads it live).
  const undoScratchRef = useRef(false);
  // Question sourcing: avoid recent prompts/bank ids across the match.
  const topicsRef = useRef(practiceTopics());
  const avoidPromptsRef = useRef<string[]>([]);
  // Topic id + difficulty of the most recently served question, so a graded
  // answer can be attributed to the right course topic for the mastery model.
  const lastTopicRef = useRef<string | null>(null);
  const lastDiffRef = useRef<BankDifficulty>("medium");
  const excludeBankIdsRef = useRef<string[]>([]);

  const gRef = useRef<GameRefState>({
    balls: makeRack(POOL_TABLE),
    particles: [],
    pocketFx: [],
    cue: null,
    shot: null,
    pocketedNums: [],
    shooter: "player",
    aiPocketId: null,
    broke: false,
    time: 0,
    lastSfx: {},
  });
  const g = gRef.current;

  function setFull(s: FullState) {
    fsRef.current = s;
    setFullState(s);
  }

  // --- drawing -------------------------------------------------------------

  function buildScene(): SceneState {
    const base = {
      table: POOL_TABLE,
      particles: g.particles,
      pocketFx: g.pocketFx,
      revealPulse: 0,
      revealObjectId: null,
      time: g.time,
      reduced,
    };
    const cueBall = g.balls.find((b) => b.isCue && !b.pocketed);
    let cue: CueAnim | null = null;
    let aim: { angleDeg: number; speed: number } | null = null;
    let aimPredict: AimPrediction | null = null;
    if (phase === "aim" && cueBall) {
      cue = { angleDeg: aimAngle, progress: 0, struck: false, recoil: 0 };
      aim = { angleDeg: aimAngle, speed: powerToSpeed(power) };
      aimPredict = predictAim(g.balls, POOL_TABLE, cueBall.id, aimAngle);
    } else if (phase === "anim" || phase === "ai") {
      cue = g.cue;
    }
    // Aim-Assist overlay: only while the player is aiming.
    const assistGuide =
      phase === "aim" && assist && cueBall
        ? {
            cue: { ...cueBall.pos },
            ghostBall: assist.ghostBall,
            objectPos: assist.objectPos,
            objectDir: assist.objectDir,
            pocket: assist.pocketPos,
          }
        : null;

    return {
      ...base,
      balls: g.balls,
      targetPocketId: g.aiPocketId,
      cue,
      aim: placingCue ? null : aim,
      aimPredict: placingCue ? null : aimPredict,
      aimLocked,
      assist: assistGuide,
      placingCue,
      placementLegal,
      cueSpin: phase === "aim" && spinActive ? spin : null,
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
      throttledSfx("ballClack", 0.04);
    } else if (ev.type === "cushion") {
      throttledSfx("rail", 0.05);
    } else if (ev.type === "pocketed") {
      sfx("pocket");
      const ball = g.balls.find((b) => b.id === ev.ball);
      if (ball && ball.number != null) g.pocketedNums.push(ball.number);
      const p = POOL_TABLE.pockets.find((pk) => pk.id === ev.pocket);
      if (p) g.pocketFx.push({ pos: { ...p.pos }, t: 0, color: ball?.color ?? "#fff" });
    }
  }

  function spawnChalk() {
    const cb = g.balls.find((b) => b.isCue && !b.pocketed);
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
      cue.progress += dt / 0.45;
      if (cue.progress >= 1) {
        cue.progress = 1;
        cue.struck = true;
        cue.recoil = 0;
        sfx("cueHit");
        if (!g.broke) {
          g.broke = true;
          sfx("rackBreak");
        }
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
          resolveAfterShot();
          return;
        }
      }
    }
  }

  useGameLoop((dt) => {
    g.time += dt;
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

    if (phase === "anim") advanceShot(dt);

    // Accumulate each ball's roll from its speed (roll angle ≈ distance / r) and
    // remember its travel direction so the renderer can spin the markings.
    for (const b of g.balls) {
      if (b.pocketed || b.radius <= 0) continue;
      const sp = Math.hypot(b.vel.x, b.vel.y);
      if (sp > 0.01) {
        b.roll = (b.roll ?? 0) + (sp * dt) / b.radius;
        b.rollDir = { x: b.vel.x / sp, y: b.vel.y / sp };
      }
    }

    paint();
  }, !reduced);

  // --- shot lifecycle ------------------------------------------------------

  function beginShot(angleDeg: number, speed: number, shotSpin?: Vec2) {
    setAimLocked(false); // the lock belongs to this aim phase only
    g.shot = { angleDeg, speed, spin: shotSpin };
    g.pocketedNums = [];
    g.particles = [];
    g.pocketFx = [];
    g.shooter = fsRef.current.turn;

    if (reduced) {
      if (!g.broke) {
        g.broke = true;
        sfx("rackBreak");
      }
      g.balls = applyShot(g.balls, g.shot);
      const res = simulateToSettle(g.balls, POOL_TABLE);
      g.balls = res.balls;
      for (const p of res.pocketed) {
        const ball = g.balls.find((b) => b.id === p.ball);
        if (ball && ball.number != null) g.pocketedNums.push(ball.number);
      }
      if (res.pocketed.length) sfx("pocket");
      resolveAfterShot();
      paintRef.current();
    } else {
      g.cue = { angleDeg, progress: 0, struck: false, recoil: 0 };
      setPhase("anim");
    }
  }

  function resolveAfterShot() {
    const cueBall = g.balls.find((b) => b.isCue);
    const cueScratched = !!cueBall?.pocketed;
    const live = tableNumbers(g.balls);
    const res = resolveTurn(
      fsRef.current,
      { pocketed: g.pocketedNums, cueScratched },
      live,
    );

    if (g.shooter === "player" && res.ownPotted > 0) {
      scoreRef.current += res.ownPotted * 100;
    }

    // Scratch-Shield perk: a player scratch that would pass the turn instead
    // re-spots the cue and keeps the turn. The token is per-turn, so it's
    // always cleared once the shot resolves.
    let state = res.state;
    let shieldFired = false;
    if (state.phase !== "over" && g.shooter === "player") {
      const shield = consumeUndoScratch(undoScratchRef.current, cueScratched);
      if (shield.keepTurn) {
        state = { ...state, turn: "player" };
        shieldFired = true;
      }
    }
    undoScratchRef.current = false;

    if (cueScratched && cueBall) {
      cueBall.pocketed = false;
      cueBall.vel = { x: 0, y: 0 };
      cueBall.pos = respotCue(g.balls, POOL_TABLE);
    }

    g.cue = null;
    g.aiPocketId = null;
    setFull(state);

    if (state.phase === "over") {
      const won = state.winner === "player";
      if (won) scoreRef.current += 500;
      setBanner(won ? "You win! 🎉" : "Computer wins");
      sfx(won ? "victory" : "defeat");
      setPhase("over");
      if (!endedRef.current) {
        endedRef.current = true;
        onGameOver({ score: scoreRef.current });
      }
      if (reduced) paintRef.current();
      return;
    }

    if (shieldFired) {
      sfx("shieldUp");
      setBanner("Scratch shield! Cue re-spotted — your turn continues");
    } else {
      setBanner(turnBanner(state, g.shooter, res.scratched));
    }

    if (state.turn === "ai") {
      setPhase("ai");
      scheduleAi();
    } else {
      startPlayerTurn();
      if (reduced) paintRef.current();
    }
  }

  // --- learning question + perks ------------------------------------------

  /**
   * Begins a player turn: clears any prior per-turn perk, then opens the
   * pre-shot question modal (cadence: before EVERY player aim, incl. the break).
   * The AI never sees this — it's wired only on player-turn entry.
   */
  function startPlayerTurn() {
    setActivePerk(null);
    setAssist(null);
    setPlacingCue(false);
    setPlacementLegal(true);
    placeDragRef.current = false;
    undoScratchRef.current = false;
    setSpinActive(false);
    setSpin({ x: 0, y: 0 });
    spinDragRef.current = false;
    setAimLocked(false);
    setPhase("aim");

    // Offer perks; Aim-Assist only when a clean makeable shot actually exists.
    const best = bestMakeableShot(g.balls, POOL_TABLE, fsRef.current.groups.player);
    setPerkOptions([
      { kind: "aimAssist", enabled: !!best, reason: best ? undefined : "No clear shot" },
      { kind: "ballInHand", enabled: true },
      { kind: "undoScratch", enabled: true },
      { kind: "spin", enabled: true },
    ]);
    setQuestionOpen(true);
    sfx("countdown");
  }

  async function handlePickQuestion(d: BankDifficulty): Promise<PoolQuestion | null> {
    const topics = topicsRef.current;
    const topic = topics[Math.floor(Math.random() * topics.length)] ?? topics[0];
    if (!topic) return null;
    try {
      // getPracticeQuestion honors the global AI toggle: AI (with bank fallback)
      // when on, the static bank with NO network call when off (the default).
      const res = await getPracticeQuestion({
        topic,
        difficulty: d,
        avoidPrompts: avoidPromptsRef.current.slice(-6),
        excludeBankIds: excludeBankIdsRef.current,
      });
      lastDiffRef.current = d;
      if (res.source === "ai") {
        lastTopicRef.current = topic.id;
        avoidPromptsRef.current = [...avoidPromptsRef.current, res.question.prompt].slice(-10);
        return aiToPoolQuestion(res.question, d);
      }
      lastTopicRef.current = res.question.topicId;
      excludeBankIdsRef.current = [...excludeBankIdsRef.current, res.question.id].slice(-10);
      return { ...res.question, source: "bank" };
    } catch {
      return null;
    }
  }

  function handleAnswered(correct: boolean, d: BankDifficulty) {
    if (lastTopicRef.current) {
      onTopicResult?.(lastTopicRef.current, correct, lastDiffRef.current);
    }
    if (correct) scoreRef.current += QUESTION_POINTS[d];
    sfx(correct ? "correct" : "wrong");
  }

  /** Apply the chosen perk for this turn. */
  function applyPerk(kind: PerkKind) {
    setActivePerk(kind);
    sfx("shieldUp");
    if (kind === "aimAssist") {
      const best = bestMakeableShot(g.balls, POOL_TABLE, fsRef.current.groups.player);
      setAssist(best);
      // Pre-align the aim to the suggested line (the player can still adjust).
      if (best) {
        setAimAngle(best.aimAngleDeg);
        setAimLocked(false);
      }
    } else if (kind === "ballInHand") {
      setPlacingCue(true);
      setPlacementLegal(true);
    } else if (kind === "undoScratch") {
      undoScratchRef.current = true;
    } else if (kind === "spin") {
      setSpinActive(true);
      setSpin({ x: 0, y: 0 });
    }
  }

  function closeQuestion() {
    setQuestionOpen(false);
  }

  function skipQuestion() {
    // No perk; go straight to aiming.
    setActivePerk(null);
    setAssist(null);
    setPlacingCue(false);
    undoScratchRef.current = false;
    setSpinActive(false);
    setSpin({ x: 0, y: 0 });
  }

  /** Finish ball-in-hand placement and return to normal aiming. */
  function finishPlacing() {
    if (!placingCue) return;
    placeDragRef.current = false;
    setPlacingCue(false);
    setActivePerk(null);
    if (reduced) paintRef.current();
  }

  function scheduleAi() {
    window.clearTimeout(aiTimer.current);
    aiTimer.current = window.setTimeout(doAiTurn, reduced ? 350 : 800);
  }

  function doAiTurn() {
    const fs = fsRef.current;
    if (fs.phase === "over" || fs.turn !== "ai") return;
    const shot = chooseAiShot(g.balls, POOL_TABLE, fs.groups.ai, difficulty);
    if (!shot) {
      // Nothing to aim at — concede the turn back to the player.
      setFull({ ...fs, turn: "player" });
      setBanner("Your turn");
      startPlayerTurn();
      if (reduced) paintRef.current();
      return;
    }
    g.aiPocketId = shot.pocketId;
    beginShot(shot.angleDeg, shot.speed);
  }

  // --- player input --------------------------------------------------------

  function pointerToTable(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return null;
    return canvasToTable(e.clientX - rect.left, e.clientY - rect.top, rect.width, POOL_TABLE);
  }

  const canShoot =
    phase === "aim" &&
    fullState.turn === "player" &&
    !fullState.winner &&
    !questionOpen &&
    !placingCue;

  /**
   * The table's ONLY job is aiming: point the cue at the pointer. It never sets
   * power and never fires a shot (power lives on the bar; shooting on the button).
   */
  function aimToPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    const pt = pointerToTable(e);
    if (!pt) return;
    const cueBall = g.balls.find((b) => b.isCue && !b.pocketed);
    if (!cueBall) return;
    const dx = pt.x - cueBall.pos.x;
    const dy = pt.y - cueBall.pos.y;
    if (Math.hypot(dx, dy) > 1e-3) setAimAngle((Math.atan2(dy, dx) * 180) / Math.PI);
  }

  /** Ball-in-Hand: drag the cue ball to a candidate spot (committed if legal). */
  function placeCueAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const pt = pointerToTable(e);
    if (!pt) return;
    const cueBall = g.balls.find((b) => b.isCue);
    if (!cueBall) return;
    const r = POOL_TABLE.ballRadius;
    const cand = {
      x: Math.max(r, Math.min(POOL_TABLE.width - r, pt.x)),
      y: Math.max(r, Math.min(POOL_TABLE.height - r, pt.y)),
    };
    const legal = legalCuePlacement(cand, g.balls, POOL_TABLE);
    setPlacementLegal(legal);
    // Only commit the cue to a legal spot; an illegal drag flashes the ring red
    // but leaves the ball at its last legal position.
    if (legal) {
      cueBall.pos = cand;
      cueBall.vel = { x: 0, y: 0 };
      cueBall.pocketed = false;
      if (reduced) paintRef.current();
    }
  }

  /**
   * A click toggles the aim lock. Locking commits the click direction so the
   * pointer can travel down to the power bar without re-aiming; clicking again
   * unlocks and resumes live aiming from the new pointer position. While
   * Ball-in-Hand is active the table drags the cue ball instead of aiming.
   */
  function onTablePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (placingCue) {
      placeDragRef.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      placeCueAt(e);
      return;
    }
    if (!canShoot) return;
    if (aimLocked) {
      setAimLocked(false);
      aimToPointer(e);
    } else {
      aimToPointer(e);
      setAimLocked(true);
    }
  }

  /** Live aiming only while unlocked; a locked aim ignores pointer movement. */
  function onTablePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (placingCue) {
      if (placeDragRef.current) placeCueAt(e);
      return;
    }
    if (!canShoot || aimLocked) return;
    aimToPointer(e);
  }

  function onTablePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (placeDragRef.current) {
      placeDragRef.current = false;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }
  }

  // --- power bar (the only thing that sets power) --------------------------

  function powerFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    const el = powerBarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;
    setPower(clamp01((e.clientX - rect.left) / rect.width));
  }

  function onPowerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!canShoot) return;
    powerDragRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    powerFromPointer(e);
  }

  function onPowerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!powerDragRef.current) return;
    powerFromPointer(e);
  }

  function onPowerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!powerDragRef.current) return;
    powerDragRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  // --- spin selector (the mini cue ball — only when the Spin perk is active) -

  /** Map a pointer onto the cue-ball face: centre = none, edge = max english. */
  function spinFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    const el = spinRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    let nx = (e.clientX - rect.left - cx) / cx;
    // Invert y so dragging UP is top-spin (follow) and DOWN is back-spin (draw).
    let ny = -((e.clientY - rect.top - cy) / cy);
    const m = Math.hypot(nx, ny);
    if (m > 1) {
      nx /= m;
      ny /= m;
    }
    // Snap tiny offsets to dead-centre so "no spin" is easy to hit.
    if (Math.hypot(nx, ny) < 0.12) ((nx = 0), (ny = 0));
    setSpin({ x: Math.round(nx * 100) / 100, y: Math.round(ny * 100) / 100 });
  }

  function onSpinDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!spinActive) return;
    spinDragRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    spinFromPointer(e);
  }

  function onSpinMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!spinDragRef.current) return;
    spinFromPointer(e);
  }

  function onSpinUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!spinDragRef.current) return;
    spinDragRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  function shootFromControls() {
    if (!canShoot || power < MIN_SHOOT_POWER) return;
    resumeAudio();
    const activeSpin =
      spinActive && (spin.x !== 0 || spin.y !== 0) ? spin : undefined;
    beginShot(aimAngle, powerToSpeed(power), activeSpin);
  }

  // --- session control -----------------------------------------------------

  function replay() {
    window.clearTimeout(aiTimer.current);
    g.balls = makeRack(POOL_TABLE);
    g.cue = null;
    g.particles = [];
    g.pocketFx = [];
    g.pocketedNums = [];
    g.aiPocketId = null;
    g.broke = false;
    scoreRef.current = 0;
    endedRef.current = false;
    setFull(initialFullState("player"));
    setAimAngle(0);
    setAimLocked(false);
    setPower(0.55);
    setBanner("Your break — move to aim · drag the power bar · press Shoot");
    // Reset all per-match learning state, then re-open the break question.
    avoidPromptsRef.current = [];
    excludeBankIdsRef.current = [];
    setQuestionOpen(false);
    startPlayerTurn();
    if (reduced) paintRef.current();
  }

  // --- effects -------------------------------------------------------------

  useEffect(() => {
    resumeAudio();
    startTrack(POOL_TRACK);
    startPlayerTurn();
    paintRef.current();
    return () => window.clearTimeout(aiTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reduced) paintRef.current();
  }, [
    reduced,
    phase,
    aimAngle,
    aimLocked,
    power,
    fullState,
    questionOpen,
    placingCue,
    placementLegal,
    activePerk,
    assist,
    spinActive,
    spin,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => paintRef.current());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // --- render --------------------------------------------------------------

  const playerGroup = fullState.groups.player;
  const aiGroup = fullState.groups.ai;
  const live = tableNumbers(g.balls);
  const remaining = (group: Group | null) =>
    group ? live.filter((n) => (group === "solids" ? n <= 7 : n >= 9)).length : null;
  const turnLabel =
    fullState.phase === "over"
      ? fullState.winner === "player"
        ? "You win"
        : "Computer wins"
      : fullState.turn === "player"
        ? "Your turn"
        : "Computer's turn";

  // While the player is aiming, the banner coaches the lock flow; outside of
  // aiming it shows the stored status/transition line.
  const displayBanner = canShoot
    ? aimLocked
      ? "Aim locked · drag power · press Shoot"
      : "Move to aim · click to lock"
    : banner;

  return (
    <div data-testid="pool-full" className="select-none">
      <div className="relative overflow-hidden rounded-2xl bg-[#2a1809] shadow-xl shadow-black/30 ring-1 ring-black/40">
        <canvas
          ref={canvasRef}
          onPointerDown={onTablePointerDown}
          onPointerMove={onTablePointerMove}
          onPointerUp={onTablePointerUp}
          onPointerCancel={onTablePointerUp}
          className="block w-full touch-none"
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
          <MuteButton muted={muted} onToggle={toggleMute} />
        </div>

        {/* turn + group banner */}
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
          <span
            data-testid="pool-turn"
            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-white/10 ${
              fullState.turn === "player"
                ? "bg-emerald-600/80 text-white"
                : "bg-rose-600/80 text-white"
            }`}
          >
            {turnLabel}
          </span>
          <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-amber-100 ring-1 ring-white/10">
            {difficulty.toUpperCase()} · You:{" "}
            {playerGroup ? `${playerGroup} (${remaining(playerGroup)})` : "open"} · CPU:{" "}
            {aiGroup ? `${aiGroup} (${remaining(aiGroup)})` : "open"}
          </span>
          {activePerk && (
            <span
              data-testid="pool-perk-badge"
              className="flex w-fit items-center gap-1 rounded-full bg-cyan-500/85 px-3 py-1 text-[11px] font-bold text-cyan-950 ring-1 ring-cyan-200/40"
            >
              <span aria-hidden>{PERK_INFO[activePerk].icon}</span>
              {PERK_INFO[activePerk].label}
            </span>
          )}
        </div>

        {/* status banner */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          <span
            data-testid="pool-aim-state"
            className={`rounded-full px-4 py-1 text-xs font-semibold ring-1 ${
              canShoot && aimLocked
                ? "bg-amber-500/85 text-amber-950 ring-amber-200/40"
                : "bg-black/55 text-slate-100 ring-white/10"
            }`}
          >
            {displayBanner}
          </span>
        </div>

        {phase === "over" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900/95 p-5 text-center ring-1 ring-white/15">
              <p
                className={`font-display text-2xl font-bold ${
                  fullState.winner === "player" ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {fullState.winner === "player" ? "You win! 🎉" : "Computer wins"}
              </p>
              <p className="mt-2 font-mono text-3xl font-bold text-amber-300">
                {scoreRef.current}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {scoreRef.current >= highScore && scoreRef.current > 0
                  ? "New personal best!"
                  : `Best: ${Math.max(highScore, scoreRef.current)}`}
              </p>
              {leaderboard && scoreRef.current > 0 && (
                <div className="mt-3 flex justify-center">
                  <EndLeaderboard
                    leaderboard={leaderboard}
                    score={scoreRef.current}
                  />
                </div>
              )}
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  data-testid="pool-full-replay"
                  onClick={replay}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Play again
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
                >
                  Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ball-in-Hand: drag the cue ball; confirm with Done. */}
        {placingCue && (
          <div className="absolute inset-x-0 top-14 flex flex-col items-center gap-2">
            <span
              className={`rounded-full px-4 py-1 text-xs font-semibold ring-1 ${
                placementLegal
                  ? "bg-emerald-500/85 text-emerald-950 ring-emerald-200/40"
                  : "bg-rose-500/85 text-rose-50 ring-rose-200/40"
              }`}
            >
              {placementLegal
                ? "Ball in hand — drag the cue ball to a legal spot"
                : "Illegal spot — overlaps a ball, pocket, or rail"}
            </span>
            <button
              type="button"
              data-testid="pool-place-done"
              onClick={finishPlacing}
              className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-bold text-cyan-950 shadow-lg transition hover:bg-cyan-400 active:scale-95"
            >
              Done placing ▸
            </button>
          </div>
        )}

        {questionOpen && (
          <QuestionModal
            onPickQuestion={handlePickQuestion}
            onAnswered={handleAnswered}
            onChoosePerk={applyPerk}
            perkOptions={perkOptions}
            onSkip={skipQuestion}
            onClose={closeQuestion}
          />
        )}
      </div>

      {/* spin selector — shown only when the Add Spin perk is active this turn */}
      {spinActive && (
        <div className="mt-3 flex items-center gap-4 rounded-2xl bg-slate-900/80 p-3 ring-1 ring-cyan-300/25">
          <div className="flex flex-col items-center gap-1">
            <div
              ref={spinRef}
              data-testid="pool-spin-selector"
              role="slider"
              aria-label="Cue-ball spin"
              aria-valuetext={spinLabel(spin)}
              onPointerDown={onSpinDown}
              onPointerMove={onSpinMove}
              onPointerUp={onSpinUp}
              onPointerCancel={onSpinUp}
              className="relative h-16 w-16 touch-none rounded-full bg-gradient-to-br from-slate-50 to-slate-300 ring-2 ring-white/70 shadow-inner cursor-pointer"
            >
              {/* cross-hairs through centre */}
              <div className="pointer-events-none absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-slate-400/60" />
              <div className="pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-slate-400/60" />
              {/* chosen contact point */}
              <div
                data-testid="pool-spin-dot"
                className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-rose-500 shadow"
                style={{
                  left: `${50 + spin.x * 42}%`,
                  top: `${50 - spin.y * 42}%`,
                }}
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-200/80">
              English
            </p>
            <p data-testid="pool-spin-label" className="font-display text-sm font-bold text-white">
              {spinLabel(spin)}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Drag the contact point: top = follow, bottom = draw, sides = english.
            </p>
          </div>
          <button
            type="button"
            data-testid="pool-spin-reset"
            onClick={() => setSpin({ x: 0, y: 0 })}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/20"
          >
            Center
          </button>
        </div>
      )}

      {/* power + shoot controls */}
      <div className="mt-3 rounded-2xl bg-slate-900/80 p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/70">
            Power
          </span>
          {/* Draggable gradient meter: pointer x sets the power directly. */}
          <div
            ref={powerBarRef}
            data-testid="pool-power-bar"
            role="slider"
            aria-label="Shot power"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(power * 100)}
            aria-disabled={!canShoot}
            onPointerDown={onPowerDown}
            onPointerMove={onPowerMove}
            onPointerUp={onPowerUp}
            onPointerCancel={onPowerUp}
            className={`relative h-5 flex-1 touch-none rounded-full bg-black/50 ring-1 ring-white/10 ${
              canShoot ? "cursor-pointer" : "cursor-not-allowed opacity-50"
            }`}
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.round(power * 100)}%`,
                background:
                  "linear-gradient(90deg,#34d399 0%,#fbbf24 60%,#ef4444 100%)",
              }}
            />
            {/* Visible draggable thumb. */}
            <div
              className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-200 bg-slate-900 shadow-md shadow-black/50"
              style={{ left: `${Math.round(power * 100)}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono text-sm font-semibold text-amber-200">
            {Math.round(power * 100)}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          {/* Accessible mirror of the meter; tests target this control. */}
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(power * 100)}
            data-testid="pool-power"
            disabled={!canShoot}
            onChange={(e) => setPower(clamp01(Number(e.target.value) / 100))}
            className="flex-1 accent-amber-400 disabled:opacity-50"
            aria-label="Shot power"
          />
          <button
            type="button"
            data-testid="pool-full-shoot"
            disabled={!canShoot}
            onClick={shootFromControls}
            className="h-[42px] rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 px-5 font-display text-sm font-bold text-amber-950 shadow-lg shadow-amber-900/40 transition hover:from-amber-300 hover:to-amber-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Shoot
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Move the mouse to aim, click the table to lock the aim, drag the power
          bar to set strength, then press Shoot. Sink your group, then the 8-ball
          to win.
        </p>
      </div>
    </div>
  );
}

/** Human-readable description of the chosen cue-ball english. */
function spinLabel(spin: Vec2): string {
  if (spin.x === 0 && spin.y === 0) return "Center (no spin)";
  const parts: string[] = [];
  if (spin.y > 0) parts.push("Follow");
  else if (spin.y < 0) parts.push("Draw");
  if (spin.x > 0) parts.push("right english");
  else if (spin.x < 0) parts.push("left english");
  return parts.join(" + ");
}

/** Short coaching line for the next turn after a shot resolves. */
function turnBanner(state: FullState, shooter: Side, scratched: boolean): string {
  if (scratched) {
    return state.turn === "player"
      ? "Computer scratched — cue re-spotted, your turn"
      : "Scratch! Cue re-spotted — Computer's turn";
  }
  if (state.turn === shooter) {
    return shooter === "player" ? "Potted! Go again" : "Computer potted — it shoots again";
  }
  return state.turn === "player" ? "Your turn" : "Computer's turn";
}
