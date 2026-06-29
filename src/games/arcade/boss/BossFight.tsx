// ---------------------------------------------------------------------------
// BossFight.tsx — the Shadow Fight 2-style brawler shell. React owns the refs;
// the pure engine (bossEngine) advances a CombatState on a fixed timestep via
// useGameLoop, and each frame we build an immutable BossScene and hand it to the
// canvas renderer (bossRender.drawScene). Input flows through BossControls
// (on-screen buttons, primary on mobile) and a keyboard mirror into applyIntent.
// The shell owns a small dust particle pool (spawned on landings + hits) and
// reads frame-over-frame state deltas to fire SFX. Overlays (intro / victory /
// defeat) are DOM layers above the canvas. Honors reduced motion + the audio bus.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import { useGameLoop } from "../useGameLoop";
import { useArcadeAudio } from "../audio/useArcadeAudio";
import { BOSS_TRACK, FINALE_TRACK } from "../audio/audioEngine";
import { MuteButton } from "../MuteButton";
import { EndLeaderboard } from "../basketball/EndLeaderboard";
import type { ArcadeLeaderboard } from "../types";
import { applyIntent, createCombat, starsFor, stepCombat } from "./bossEngine";
import { buildScene, makeLayout, type BossSceneParticle } from "./bossScene";
import { drawScene } from "./bossRender";
import { BossControls } from "./BossControls";
import { keyDownToIntent, keyUpToIntent, resetInput } from "./bossInput";
import type {
  BossConfig,
  BossFightResult,
  BossIntent,
  CombatPhase,
  CombatState,
  WeaponConfig,
  WeaponTier,
} from "./bossTypes";

// Side-view arena: a wide-ish portrait that still leaves room for the controls.
const ASPECT_W = 360;
const ASPECT_H = 420;
const BACK_TO_MAP = "/games/bosses";

interface BossFightProps {
  config: BossConfig;
  weapon: WeaponConfig;
  tier: WeaponTier;
  highScore: number;
  leaderboard?: ArcadeLeaderboard;
  onResult: (r: BossFightResult) => void;
}

type Screen = "intro" | "fighting" | "victory" | "defeat";

interface EndSnapshot {
  defeated: boolean;
  score: number;
  stars: 1 | 2 | 3;
}

const HIT_COLORS = ["#ffffff", "#ffe9a8", "#ffd23f"];
const DUST_COLORS = ["rgba(214,214,224,0.9)", "rgba(170,170,190,0.7)", "rgba(255,255,255,0.6)"];

export function BossFight({
  config,
  weapon,
  tier,
  highScore,
  leaderboard,
  onResult,
}: BossFightProps) {
  const reduced = usePrefersReducedMotion();
  const { muted, toggleMute, start: startTrack, stop: stopTrack, sfx, resumeAudio } =
    useArcadeAudio();

  const [screen, setScreen] = useState<Screen>("intro");
  const [playing, setPlaying] = useState(false);
  const [specialReady, setSpecialReady] = useState(false);
  const [end, setEnd] = useState<EndSnapshot | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<CombatState | null>(null);
  const particlesRef = useRef<BossSceneParticle[]>([]);
  const endedRef = useRef(false);
  // Hit-sparks already handled (so each new contact fires its SFX exactly once).
  const seenSparks = useRef<WeakSet<object>>(new WeakSet());

  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const screenRef = useRef<Screen>(screen);
  screenRef.current = screen;

  // Frame-over-frame snapshot used to detect events (SFX + dust).
  const prevRef = useRef({
    playerAction: "idle" as CombatState["player"]["action"],
    playerOnGround: true,
    bossOnGround: true,
    playerHp: 0,
    bossHp: 0,
    combatPhase: "intro" as CombatPhase,
    specialReady: false,
  });

  // --- particle pool -------------------------------------------------------

  const burst = useCallback(
    (x: number, y: number, count: number, colors: string[], speed: number, gravity: number) => {
      if (reducedRef.current) return;
      const pool = particlesRef.current;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = speed * (0.35 + Math.random() * 0.85);
        const life = 0.35 + Math.random() * 0.45;
        pool.push({
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - gravity * 0.12,
          life,
          maxLife: life,
          size: 1.5 + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          gravity,
        });
      }
    },
    [],
  );

  /** Spawns a low, spreading puff of ground dust at a fighter's feet. */
  const dust = useCallback(
    (x: number, y: number, scale: number) => {
      if (reducedRef.current) return;
      const pool = particlesRef.current;
      for (let i = 0; i < 9; i++) {
        const life = 0.3 + Math.random() * 0.35;
        pool.push({
          x: x + (Math.random() - 0.5) * scale * 18,
          y,
          vx: (Math.random() - 0.5) * 70,
          vy: -Math.random() * 40,
          life,
          maxLife: life,
          size: 2 + Math.random() * 3.5,
          color: DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)],
          gravity: 120,
        });
      }
    },
    [],
  );

  // --- canvas geometry helpers ---------------------------------------------

  const cssSize = useCallback(() => {
    const cssW = canvasRef.current?.clientWidth || ASPECT_W;
    const cssH = (cssW * ASPECT_H) / ASPECT_W;
    return { cssW, cssH };
  }, []);

  // --- canvas paint --------------------------------------------------------

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const s = stateRef.current;
    if (!canvas || !s) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const { cssW, cssH } = cssSize();
    const nw = Math.round(cssW * dpr);
    const nh = Math.round(cssH * dpr);
    if (canvas.width !== nw) canvas.width = nw;
    if (canvas.height !== nh) canvas.height = nh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // The renderer owns shake (it reads scene.shake); we just scale for DPR.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const layout = makeLayout(cssW, cssH);
    const scene = buildScene(s, layout, s.elapsed, {
      reduced: reducedRef.current,
      highScore,
      particles: particlesRef.current,
    });
    drawScene(ctx, scene);
  }, [cssSize, highScore]);

  const paintRef = useRef(paint);
  paintRef.current = paint;

  // --- end of fight --------------------------------------------------------

  const finish = useCallback(() => {
    const s = stateRef.current;
    if (!s || endedRef.current) return;
    endedRef.current = true;
    const defeated = s.result === "win";
    const stars = starsFor(s);
    setPlaying(false);
    setEnd({ defeated, score: s.score, stars });
    setScreen(defeated ? "victory" : "defeat");
    sfx("ko");
    sfx(defeated ? "bossVictory" : "bossDefeat");
    stopTrack();
    if (defeated && !reducedRef.current) {
      const layout = makeLayout(cssSize().cssW, cssSize().cssH);
      burst(
        s.boss.x,
        layout.groundY - s.boss.y - layout.scale * 70,
        56,
        [config.visual.primary, config.visual.accent, "#fff"],
        280,
        140,
      );
    }
    onResultRef.current({
      bossId: config.id,
      defeated,
      score: s.score,
      stars,
      weaponTierUsed: tier,
    });
    paintRef.current();
  }, [sfx, stopTrack, burst, cssSize, config.id, config.visual.primary, config.visual.accent, tier]);

  // --- main loop -----------------------------------------------------------

  useGameLoop((dt) => {
    const s = stateRef.current;
    if (!s) return;

    stepCombat(s, dt);

    // Advance the dust pool (gravity + drag + decay).
    const pool = particlesRef.current;
    if (pool.length) {
      for (const p of pool) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.vx *= 0.985;
        p.life -= dt;
      }
      particlesRef.current = pool.filter((p) => p.life > 0);
    }

    // --- event detection from frame deltas (SFX + dust) --------------------
    const prev = prevRef.current;
    const layout = makeLayout(cssSize().cssW, cssSize().cssH);
    const chestPlayer = layout.groundY - s.player.y - layout.scale * 55;
    const chestBoss = layout.groundY - s.boss.y - layout.scale * 60;

    // Swing on the player committing a new attack.
    if (s.player.action === "attack" && prev.playerAction !== "attack") {
      sfx("swing");
    }
    // Jump on take-off, land (+ dust) on touchdown.
    if (prev.playerOnGround && !s.player.onGround) sfx("jump");
    if (!prev.playerOnGround && s.player.onGround) {
      sfx("land");
      dust(s.player.x, layout.groundY, layout.scale);
    }
    if (!prev.bossOnGround && s.boss.onGround) dust(s.boss.x, layout.groundY, layout.scale);

    // Light/heavy hits read from each fighter's HP dropping; the active move's
    // strength picks the SFX (light = crisp "strike", heavy = weighty "heavy").
    if (s.boss.hp < prev.bossHp - 0.001) {
      sfx(s.player.move?.strength === "heavy" ? "heavy" : "strike");
      burst(s.boss.x, chestBoss, 9, [config.visual.accent, ...HIT_COLORS], 170, 60);
    }
    if (s.player.hp < prev.playerHp - 0.001) {
      sfx(s.boss.move?.strength === "heavy" ? "heavy" : "strike");
      burst(s.player.x, chestPlayer, 7, ["#7df9ff", ...HIT_COLORS], 150, 60);
    }

    // Blocked / KO / special contacts surface as engine hit-sparks; fire each
    // exactly once as new spark objects appear.
    const seen = seenSparks.current;
    for (const spark of s.hitSparks) {
      if (seen.has(spark)) continue;
      seen.add(spark);
      if (spark.kind === "block") {
        sfx("block");
        burst(spark.x, spark.y, 6, ["#cfe9ff", "#ffffff"], 120, 30);
      }
    }

    prev.playerAction = s.player.action;
    prev.playerOnGround = s.player.onGround;
    prev.bossOnGround = s.boss.onGround;
    prev.playerHp = s.player.hp;
    prev.bossHp = s.boss.hp;
    prev.combatPhase = s.combatPhase;

    const ready = s.player.meter >= 1 && s.stats.specialUnlocked;
    if (ready !== prev.specialReady) {
      prev.specialReady = ready;
      setSpecialReady(ready);
    }

    paintRef.current();

    if (s.result && !endedRef.current) finish();
  }, playing);

  // --- input ---------------------------------------------------------------

  const sendIntent = useCallback((intent: BossIntent) => {
    const s = stateRef.current;
    if (!s || endedRef.current || screenRef.current !== "fighting") return;
    applyIntent(s, intent);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const intent = keyDownToIntent(e);
      if (!intent) return;
      // Keep the page from scrolling/searching while fighting.
      if (e.key === " " || e.key.startsWith("Arrow") || e.key === "/") e.preventDefault();
      sendIntent(intent);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      // Always process keyup so held state stays balanced; sendIntent gates it.
      const intent = keyUpToIntent(e);
      if (intent) sendIntent(intent);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [sendIntent]);

  // --- lifecycle -----------------------------------------------------------

  const buildState = useCallback(
    () => createCombat({ config, weapon, tier, seed: (Math.random() * 1e9) | 0 }),
    [config, weapon, tier],
  );

  const startFight = useCallback(() => {
    resumeAudio();
    startTrack(config.musicTrack === "finale" ? FINALE_TRACK : BOSS_TRACK);
    resetInput();
    endedRef.current = false;
    particlesRef.current = [];
    seenSparks.current = new WeakSet();
    const fresh = buildState();
    stateRef.current = fresh;
    prevRef.current = {
      playerAction: fresh.player.action,
      playerOnGround: fresh.player.onGround,
      bossOnGround: fresh.boss.onGround,
      playerHp: fresh.player.hp,
      bossHp: fresh.boss.hp,
      combatPhase: fresh.combatPhase,
      specialReady: false,
    };
    setSpecialReady(false);
    setEnd(null);
    setScreen("fighting");
    setPlaying(true);
  }, [resumeAudio, startTrack, config.musicTrack, buildState]);

  // Seed a state on mount so the canvas can pose the boss behind the intro.
  useEffect(() => {
    if (!stateRef.current) stateRef.current = buildState();
    paintRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reduced) paintRef.current();
  }, [reduced, screen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => paintRef.current());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // --- render --------------------------------------------------------------

  const newHigh = end ? end.score > highScore && end.score > 0 : false;

  return (
    <div data-testid="boss-fight" className="flex select-none justify-center">
      <div
        className="w-full"
        style={{ maxWidth: "min(34rem, calc((100svh - 19rem) * 0.857))" }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-[#070612] shadow-xl shadow-black/50 ring-1 ring-white/10">
          <canvas
            ref={canvasRef}
            className="block w-full"
            style={{ aspectRatio: `${ASPECT_W} / ${ASPECT_H}` }}
          />

          <div className="absolute right-2 top-2">
            <MuteButton muted={muted} onToggle={toggleMute} />
          </div>

          {screen === "intro" && (
            <Overlay>
              <p
                className="font-mono text-xs font-semibold uppercase tracking-[0.35em]"
                style={{ color: config.visual.accent }}
              >
                {config.musicTrack === "finale" ? "Final Boss" : `Boss ${config.index}`}
              </p>
              <h2
                className="mt-1 font-display text-4xl font-black tracking-tight"
                style={{ color: config.visual.primary, textShadow: `0 0 24px ${config.visual.primary}66` }}
              >
                {config.name}
              </h2>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                {config.title}
              </p>
              <p className="mt-3 max-w-xs text-sm italic text-slate-200">“{config.taunt}”</p>

              <div className="mt-4 rounded-xl bg-white/5 px-4 py-2 text-xs text-slate-300 ring-1 ring-white/10">
                <span className="text-white/60">Weapon</span>{" "}
                <span className="font-semibold text-white">{weapon.name}</span>
                <span className="mx-1.5 text-white/30">·</span>
                <span className="text-amber-300">Tier {tier}</span>
              </div>
              <p className="mt-3 text-xs font-semibold text-amber-200/90">Best score: {highScore}</p>

              <button
                type="button"
                data-testid="boss-start"
                onClick={startFight}
                className="mt-4 rounded-xl bg-gradient-to-b from-rose-400 to-rose-600 px-9 py-3 font-display text-lg font-bold text-white shadow-lg shadow-rose-900/50 transition hover:from-rose-300 hover:to-rose-500 active:scale-95"
              >
                Fight ▸
              </button>

              <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-slate-400">
                Walk, jump and crouch to find your range. Block to soak a blow,
                then answer with punches and kicks — hold a direction (or crouch /
                jump) as you strike for heavier combos. Fill the meter for your Special.
              </p>
              <ControlsLegend />
            </Overlay>
          )}

          {screen === "victory" && end && (
            <Overlay>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
                Force stabilized
              </p>
              <h2 className="mt-1 font-display text-3xl font-black text-white">
                {config.name} defeated
              </h2>
              <Stars stars={end.stars} />
              <div className="mt-3 font-display text-5xl font-bold text-amber-300">{end.score}</div>
              <p className="mt-1 text-sm text-slate-200">
                {newHigh ? "🏆 New personal best!" : `Best score: ${Math.max(highScore, end.score)}`}
              </p>
              {leaderboard && end.score > 0 && (
                <EndLeaderboard leaderboard={leaderboard} score={end.score} />
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  data-testid="boss-replay"
                  onClick={startFight}
                  className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10 active:scale-95"
                >
                  Fight again
                </button>
                <a
                  href={BACK_TO_MAP}
                  className="rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-300 hover:to-emerald-500 active:scale-95"
                >
                  Back to tower
                </a>
              </div>
            </Overlay>
          )}

          {screen === "defeat" && end && (
            <Overlay>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-rose-400">
                Vektor down
              </p>
              <h2 className="mt-1 font-display text-3xl font-black text-white">
                {config.name} prevails
              </h2>
              <p className="mt-3 max-w-xs text-sm text-slate-300">
                Retries are free — watch the boss's wind-up, block or step out,
                then punish the recovery. Re-take the quiz to forge a stronger weapon.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  data-testid="boss-retry"
                  onClick={startFight}
                  className="rounded-xl bg-gradient-to-b from-rose-400 to-rose-600 px-7 py-3 font-bold text-white shadow-lg shadow-rose-900/50 transition hover:from-rose-300 hover:to-rose-500 active:scale-95"
                >
                  Try again
                </button>
                <a
                  href={BACK_TO_MAP}
                  className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10 active:scale-95"
                >
                  Back to tower
                </a>
              </div>
            </Overlay>
          )}
        </div>

        {screen === "fighting" && (
          <BossControls onIntent={sendIntent} specialReady={specialReady} />
        )}
      </div>
    </div>
  );
}

function ControlsLegend() {
  return (
    <div className="mt-4 hidden flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-slate-400 sm:flex">
      <Legend keys="A / D">Walk</Legend>
      <Legend keys="W">Jump</Legend>
      <Legend keys="S">Crouch</Legend>
      <Legend keys="⇧">Block</Legend>
      <Legend keys="J">Punch</Legend>
      <Legend keys="K">Kick</Legend>
      <Legend keys="L">Special</Legend>
    </div>
  );
}

function Legend({ keys, children }: { keys: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/80">{keys}</kbd>
      {children}
    </span>
  );
}

function Stars({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <div className="mt-2 flex justify-center gap-1.5" aria-label={`${stars} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          aria-hidden
          className={`text-3xl ${i <= stars ? "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" : "text-white/15"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-black/70 via-black/55 to-black/80 p-4 text-center">
      {children}
    </div>
  );
}
