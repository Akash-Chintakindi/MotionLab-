# MotionLab — Boss Fight Mode PRD

**Status:** Built (Shadow Fight-style revision)
**Owner:** Engineering (with design + content support via subagents)
**Last updated:** 2026-06-28

## 1. Summary

Boss Fight Mode turns lesson + quiz completion into a Super-Mario-style boss ladder. After a learner passes a lesson's quiz (>=70%), a themed **mini-boss** unlocks. Defeating all 10 mini-bosses unlocks **The Singularity**, a multi-phase finale. Combat is a **Shadow Fight 2-style 2D silhouette brawler**: two fighters on a side-view arena who walk, jump, crouch, block, and trade light/heavy punches and kicks (high / mid / low / overhead) plus a meter Special. Win by draining the boss's single HP bar. A better quiz score grants a stronger **weapon tier** for that lesson's boss.

Bosses are a **reward**, not a gate: losing or skipping a boss never blocks lessons. Only the finale is gated (on all 10 mini-boss wins).

Theme: **Cosmic "Force" villains** — each boss is a stylized embodiment of a physics phenomenon from its lesson; the finale is a black hole. All art is **programmatic Canvas 2D vector/silhouette** (no external image assets), matching the existing arcade games.

## 2. Goals & non-goals

### Goals
- Create a strong completion incentive: "beat the boss" as the payoff for each lesson+quiz.
- Ship a single **data-driven combat engine**; each boss is a config, not bespoke code.
- Make combat feel juicy and fair (clear telegraphs, generous-but-tightening windows, screen-shake/particles, satisfying audio).
- Reuse the existing arcade stack (`useGameLoop`, audio engine, particles, `useHighScore`, Firestore progress).
- Reward mastery: higher quiz scores -> better weapons.

### Non-goals
- No learning content inside the fights (combat is purely for fun).
- No external art/audio assets, no WebGL/3D, no physics engine library.
- No PvP / multiplayer (single-player vs AI bosses only).
- Mini-bosses do NOT gate lesson progression.

## 3. Player fantasy & narrative

The player is **Vektor**, a being of pure motion who must reclaim the laws of physics from rogue "Forces" that have escaped into the void. Each lesson the learner masters "stabilizes" a concept, weakening the Force that corrupts it — letting Vektor confront it. Beat all ten Forces and the void collapses into **The Singularity**, the final boss.

This framing is light flavor only (intro card + 1-2 line boss taunt). It is never required reading and carries no quiz content.

## 4. Core combat design (Shadow Fight brawler)

### 4.1 Stage layout
- **Side-view, single-screen arena** with a ground plane. Vektor (player) starts on the left facing right; the boss starts on the right facing left. Fighters move freely along the ground between two arena walls and auto-face each other.
- HUD: player HP (left, draining toward center), boss HP (right, draining toward center), a **Special meter** under each fighter, combo counter, score/best, phase pips, mute button.

### 4.2 The loop (real-time footsies)
1. **Spacing** — both fighters walk in and out of range. Every attack has a **reach**; you must close the gap to land it and respect the boss's reach to avoid eating one.
2. **Frame data** — each attack runs **startup -> active -> recovery**. You are vulnerable during recovery (whiff punish), so committing to a slow Heavy out of range is risky.
3. **Heights & blocking** — strikes hit **high / mid / low / overhead**. A standing **Block** stops high/mid; a **crouch-block** stops low/mid; **lows beat a standing block** and **jump-in overheads beat a crouch-block** — a rock-paper-scissors read.
4. **Meter & Special** — landing hits fills the Special meter; when full (and unlocked at weapon tier 3+) the player can unleash a weapon-specific **Special** (long reach, big damage; upgraded at tier 5).
5. **Combos & knockdowns** — chaining hits during hitstun builds a combo; heavy/low finishers can **knock down**, creating an opening as the victim gets up.
6. **Phase shifts** — at HP thresholds (the finale's three phases) the boss's **AI profile escalates** — more aggression, faster reactions, more blocking, longer strings.

### 4.3 Damage, defense, fairness rules
- **Block (vs light attacks)** converts the hit to small chip damage + blockstun (safe but cedes initiative); the correct stance (standing vs crouch) must match the incoming height.
- **Heavy attacks GUARD-BREAK.** A heavy/forward attack that lands on a blocking victim is not chipped — it punches through the guard for real (reduced ~60%) damage, a long stagger, big knockback, a flash, and clears the victim's block. So turtling is not a winning strategy for either side: you must move, poke, and pick your guard.
- **Clean hit** deals full damage, hitstun, pushback, and builds the attacker's combo + meter; one hit per active window.
- **Whiffing** a slow attack out of range leaves you in recovery to be punished.
- **Boss difficulty** scales with index via its AI profile and HP/damage (see Difficulty model), not via cheap unreactable attacks — but bosses attack often, block reads, and use heavies to break a passive guard.
- **Retries are free and instant.** Losing returns to a "Try again / Back to map" overlay; no lives currency.

## 5. Controls & movement

Shadow Fight paradigm: the player has **full footsies** — walk, jump, crouch, block, and a punch/kick moveset. Primary input is **on-screen buttons** (mobile-first) with a keyboard mirror on desktop.

### 5.1 Full move set
- **Walk Left / Walk Right (held)** — move along the ground; manage spacing.
- **Jump** — hop; enables an **overhead jump attack** that beats crouch-blocks.
- **Crouch (held)** — duck high attacks and **crouch-block** lows; enables a low.
- **Block / Guard (held)** — standing guard vs high/mid (crouch while guarding to defend lows).
- **Punch / Kick (two buttons only)** — there is **no separate heavy button**. The engine derives the concrete move from the fighter's **stance + the direction held** (a *directional combo* system):
  - neutral + Punch = fast high jab; neutral + Kick = mid round kick (light, combo-friendly).
  - **toward the opponent** + Punch = heavy **overhead** hook (slow, big pushback, **guard-break**); toward + Kick = advancing heavy kick (knockdown, **guard-break**).
  - **away** + Punch/Kick = a long-reach poke (spacing tool).
  - **crouch** + Punch/Kick = a low; **jump** + Punch/Kick = an overhead.
- **Special / Super** — consumes a full Special meter; weapon-defined effect (tier 3+).

### 5.2 Touch controls (on-screen buttons; primary, mobile-first)
**Decision: on-screen buttons are the one and only touch scheme** (no swipe gestures). Two fixed thumb clusters:
- **Left cluster (movement):** Walk-Left / Walk-Right (held), Jump (tap), Crouch (held), Block (held).
- **Right cluster (attacks):** **Punch**, **Kick** (taps), and Special (enabled only when the meter is full and unlocked). Heaviness comes from the held direction, not extra buttons — a short on-screen tip teaches "hold a direction (or crouch / jump) + Punch / Kick for heavier combos."
- Held buttons fire on pointer-down and release on pointer-up; attack buttons are taps. Large, fixed-position targets with pressed-state feedback and aria labels.

### 5.3 Keyboard controls (desktop mirror)
- Walk Left = `A` / `Left`; Walk Right = `D` / `Right`; Jump = `W` / `Up`; Crouch = `S` / `Down`; Block = hold `Shift`.
- Punch = `J`; Kick = `K`; Special = `L` or `Space`. (Heavy/low/overhead variants come from the held direction + stance, as above.)

### 5.4 Feel / juice
- Hit sparks (distinct for hit / block / KO / special), screen shake, and a white flash on impacts, scaled down (or disabled) under `usePrefersReducedMotion`.
- Dust on landings and pushback; combo banner ("N HITS!"); KO slam.
- All motion-heavy effects degrade gracefully when reduced motion is on (no shake, fewer particles).

## 6. Weapon system (score -> weapon)

### 6.1 How it works (themed restriction, 5 tiers per boss)
- **Each boss is fought with its own lesson's themed weapon** (themed restriction — no cross-boss loadout swapping for mini-bosses). The weapon comes in **5 quality tiers**, and your **best quiz score on that lesson** decides which tier you wield:
  - **Tier 5 (best):** 100%
  - **Tier 4:** 90-99%
  - **Tier 3:** 85-89%
  - **Tier 2:** 80-84%
  - **Tier 1:** 70-79%
  - **Below 70%:** the quiz isn't passed, so the boss stays locked — the learner re-takes the quiz anyway.
- The tier is the **best** score ever recorded on that quiz, so **re-taking a quiz to score higher upgrades the weapon** (the core "get better -> get stronger" incentive).
- Higher tier = better stats (damage, attack speed, reach, meter gain) and unlocks the weapon's **Special** (Tier 3+) and an upgraded Special (Tier 5). Each weapon also has a base **reach** (px) by archetype — heavy weapons reach farther, fast weapons less.

### 6.2 Tier stat scaling (applies to every weapon)
| Tier | Score | Damage x | Attack speed x | Meter/hit | Special |
|------|-------|----------|----------------|-----------|---------|
| 1 | 70-79% | 1.00 | 1.00 | +0% | locked |
| 2 | 80-84% | 1.12 | 1.06 | +8% | locked |
| 3 | 85-89% | 1.24 | 1.12 | +16% | unlocked |
| 4 | 90-99% | 1.38 | 1.20 | +26% | unlocked |
| 5 | 100% | 1.55 | 1.30 | +40% | upgraded |

### 6.3 The 10 themed weapons (one per lesson; each has all 5 tiers)

| # | Lesson | Weapon | Archetype | Signature Special (Tier 3+) |
|---|--------|--------|-----------|------------------------------|
| 1 | Position, Velocity & Slope | **Slope Saber** | Fast blade | "Tangent Slash" — combo finisher that scales with current combo |
| 2 | Velocity, Acceleration | **Accel Gauntlets** | Fast fists | "Ramp" — each consecutive Light hit speeds up & hits harder |
| 3 | Displacement from Area | **Riemann Maul** | Heavy hammer | "Area Slam" — charge then release; damage = charge time |
| 4 | Acceleration -> Position | **Kinematic Chakrams** | Mid throw | "Triple Integral" — three returning ranged hits |
| 5 | Motion in 2D | **Vector Twin Daggers** | Dual fast | "Component Cross" — simultaneous high + low strike |
| 6 | Projectile Motion | **Parabola Bow** | Ranged arc | "Trajectory" — homing arc that ignores guard |
| 7 | Free Fall | **Gravity Hammer** | Slow heavy | "Free Fall" — leap + slam, guaranteed guard-break + stun |
| 8 | Relative Motion | **Frame Blades** | Counter | "Parallax" — perfect-counter that reflects the boss's last attack |
| 9 | Oscillations | **Resonance Whip** | Rhythm | "Harmonic" — on-beat hits ramp damage; off-beat resets |
| 10 | Mastery Challenge | **Apex Edge** | Balanced | "Mastery" — adaptive finisher that scales with total bosses beaten |

### 6.4 Finale loadout (the one exception)
Because the finale is the culmination, **The Singularity is the single fight where the player chooses their weapon** — they bring any one of their 10 earned weapons, at the tier they earned. This rewards the whole journey and lets players pick a favorite for the climax.

### 6.5 Design notes
- Since each mini-boss is locked to its themed weapon, the **incentive is vertical**: replay the quiz to push that weapon's tier up, which makes its boss easier/flashier.
- Archetypes deliberately vary (fast/heavy/ranged/counter/rhythm) so each boss fight feels mechanically distinct from the last.
- A weapon thematically "fits" its boss (e.g., **Frame Blades** vs. the reference-frame boss, **Resonance Whip** vs. the oscillator), so the restriction reinforces theme rather than feeling limiting.

## 7. Boss roster (10 mini-bosses)

All bosses are drawn as glowing **Canvas 2D vector silhouettes**. Each boss is a **visually distinct character** driven by a per-`shape` "skin": its own body build (lean / bulky / towering / wispy / hovering), head + headgear, signature color treatment, an integral aura/motif, and a distinct idle behavior (hover, sway, pulse, twitch, heavy loom). They share one poseable IK skeleton underneath so combat still reads clearly, and fight via a tuned **AI profile** (aggression, reaction time, blocking, jump-ins, combo length) plus their HP/damage on the difficulty curve. The "mechanic / attacks" notes below are the *character* each boss evokes through its look and AI tuning, realized with the shared moveset. Bosses are ordered by lesson (course `order`), each harder than the last (see Difficulty model in section 8).

### Boss 1 — "Gradient," the Slope Wraith (Lesson 1: Position, Velocity & Slope)
- **Look:** a tall, kite-shaped wraith made of stacked slanted line-segments that lean like a tangent line; cyan glow. Tilts left/right to telegraph.
- **Mechanic / role:** the tutorial boss. Slow, fully readable, one defense type at a time.
- **Attacks:** *Lean Swipe* (tilts left -> dodge right), *Rise* (high sweep -> duck). No feints.
- **Weak point:** body center after any dodge.

### Boss 2 — "Acceleron" (Lesson 2: Velocity, Acceleration)
- **Look:** an arrowhead of light that **elongates and brightens** as it charges; amber/orange.
- **Mechanic:** **ramps up** — each successive attack in a cycle is faster than the last (embodies acceleration). Punishes complacency.
- **Attacks:** *Charge Dash* (side -> dodge), *Double Tap* (two quick side hits, accelerating). First feints appear (rare).

### Boss 3 — "Sigma," the Accumulator (Lesson 3: Displacement / Area)
- **Look:** a stack of translucent rectangles (a Riemann sum) that **builds upward** into a tower; teal.
- **Mechanic:** **accumulates a shield** of "area blocks" over time; the player must stagger it to shatter the shield before HP can be dropped.
- **Attacks:** *Block Drop* (overhead -> duck/block), *Sum Sweep* (wide -> dodge). Shield regrows if ignored.

### Boss 4 — "Tempus" (Lesson 4: Acceleration -> Velocity -> Position)
- **Look:** three nested rotating rings (jerk / acceleration / velocity layers) around a core; violet.
- **Mechanic:** attacks come in **escalating 3-hit chains** (a -> v -> x), demanding sequenced defenses.
- **Attacks:** *Chain* (low-side-high in sequence), *Rewind* (a feint that reverses direction mid-telegraph).

### Boss 5 — "Vectra," the Component Twins (Lesson 5: Motion in 2D)
- **Look:** a plus/cross-shaped entity with two perpendicular arms (x-arm, y-arm); magenta + lime.
- **Mechanic:** **two-axis attacks** — frequently requires defending a horizontal and vertical threat near-simultaneously (dodge + duck combos).
- **Attacks:** *Cross Strike* (side + low together), *Component Split* (arms attack on a short delay).

### Boss 6 — "Ballista," the Arc (Lesson 6: Projectile Motion)
- **Look:** a comet-core that lobs glowing projectiles along visible **parabolic arcs**; orange/red trails.
- **Mechanic:** the first **ranged** boss — dodge incoming arcs; the arc preview line shows where shots land. Rewards ranged weapons.
- **Attacks:** *Lob* (single arc -> sidestep landing spot), *Barrage* (3 arcs, staggered), *Direct* (flat fast shot -> block).

### Boss 7 — "Gravitas," the Pull (Lesson 7: Free Fall)
- **Look:** a massive dark orb with an anvil silhouette and downward streaks; deep indigo, heavy.
- **Mechanic:** **weight** — slow but devastating overhead slams; introduces **Step-Back** AoE shockwaves. Gains "downward pull" that shortens dodge distance.
- **Attacks:** *Slam* (overhead -> duck or step-back), *Shockwave* (ground AoE -> step-back), *Crush* (guard-break -> must dodge, not block).

### Boss 8 — "Parallax," the Frame-Shifter (Lesson 8: Relative Motion)
- **Look:** a shifting prism that **drags the background** with it; the arena appears to scroll; iridescent.
- **Mechanic:** **reference-frame mind games** — the background motion creates false reads; the true telegraph is on the boss glyph, not the moving scenery. **Frame Blades** weapon hard-counters it.
- **Attacks:** *Drift* (apparent vs. real direction differ -> read the glyph), *Frame Snap* (sudden reversal).

### Boss 9 — "Harmonia," the Oscillator (Lesson 9: Oscillations / SHM)
- **Look:** an undulating sine-wave serpent that sways as `x = A cos(wt)`; emerald, with a visible metronome pulse.
- **Mechanic:** **rhythm** — attacks land on a steady beat; defenses and counters are most effective **on-beat**. The Resonance Whip weapon thrives here.
- **Attacks:** *Sine Sweep* (alternating left/right on tempo), *Resonate* (tempo doubles at low HP).

### Boss 10 — "Apex," the Mirror (Lesson 10: Kinematics Mastery Challenge)
- **Look:** a dark mirror of **Vektor himself**, wielding a shadow version of the player's currently equipped weapon; monochrome with the player's accent color.
- **Mechanic:** the **gatekeeper** before the finale and the hardest mini-boss. **Combines** patterns sampled from bosses 1-9 and mirrors the player's loadout (its attacks reference your weapon archetype). Multiple poise bars.
- **Attacks:** a rotating "greatest hits" set + a unique *Counter Stance* that punishes blind aggression.

## 8. Difficulty model (each boss slightly harder)

Difficulty is **data-driven** by boss index `n` (1-10; finale phases 11/12/13), so "slightly harder each time" is a tuned curve. `difficultyFor(n)` returns the boss's HP, a damage multiplier, and an **AI profile**; the registry feeds these into each `BossConfig` phase. The curve is monotonic and clamped:

| Parameter | Boss 1 -> far cap | Notes |
|-----------|-------------------|-------|
| Boss HP | `100 + 22*(n-1)` | — |
| Boss damage x | `1 + 0.05*(n-1)` | — |
| Aggression (presses attacks in range) | 0.58 -> <= 0.95 | even Boss 1 attacks regularly |
| Reaction time (ms) | 430 -> >= 130 | sharper reads up the curve |
| Block chance (defends a read strike) | 0.35 -> <= 0.85 | bosses guard the correct height |
| Jump-in chance | 0.08 -> <= 0.55 | more overhead pressure later |
| Combo length (chained strikes) | 2 -> <= 6 | longer strings |
| Walk speed x | rises slightly | faster approach |
| Preferred range (px) | tuned to the boss's reach | — |

Bosses also pick guard-breaking **heavies** more often as they get meaner — and especially when the player turtles (the AI tracks repeated guard reads). Decision cadence is tighter than the raw reaction time so even early bosses feel active rather than passive.

**Layered character (not just numbers):** each boss reads differently through its visual identity + AI bias — early bosses are active but readable; later ones press harder, block more, jump in, and chain longer strings; the mirror (Boss 10) is the meanest before the finale. This keeps the ramp interesting rather than pure stat inflation.

**No assist / get-good model (your call):** there is **no auto-assist or difficulty-easing** after losses. Fights are skill-based and meant to be earned. The two intended paths to "get better" are (a) **practice** the fight (retries are free and instant) and (b) **raise your weapon tier** by re-taking the lesson's quiz for a higher score. Because bosses never gate lessons, a player who can't beat one is never blocked from continuing the course.

## 9. Final boss — "The Singularity"

Unlocked only after all 10 mini-bosses are defeated. A **black-hole entity**: a central event-horizon disc with a swirling **accretion-disk** of particles, gravitational lensing rings, and color-shifting jets. The arena slowly warps toward the center.

**Three phases** (one HP bar per phase; ~3x a normal boss in length, AI difficulty index 11/12/13 on the curve above). As each bar is chipped down, the AI profile escalates:

- **Phase 1 — Accretion:** measured spacing and single reads — the player learns the singularity's range and openings.
- **Phase 2 — Spaghettification:** heavier pressure and aggression; the boss presses in, blocks more, and chains longer strings (echoing Gravitas's weight).
- **Phase 3 — Event Horizon:** maximum aggression, sharpest reactions, frequent jump-ins and combos. The player builds meter and unloads the **Special** to "collapse" the singularity for the finish.

**Spectacle:** a black-hole boss (lensing rings, accretion-disk particles, event-horizon core), boss-specific procedural music, a multi-stage victory sequence + a permanent "Kinematics Master" trophy and course-complete celebration. (Reduced-motion variant tones down warping and shake.)

## 10. Progression, unlock & persistence

- **Unlock a mini-boss:** `quizScores[lessonId] >= 70` (reuses `quizPassed` / `QUIZ_PASS_PERCENT` from `src/lib/gating.ts`).
- **Weapon tier for that boss:** `weaponTierFor(quizScores[lessonId])` returns Tier 1-5 from the score bands in section 6.
- **Unlock the finale:** all 10 mini-bosses recorded as defeated (and the player then picks any earned weapon — see 6.4).
- **Bosses never gate lessons** (optional reward).

### Data model
Extend `CourseProgress` in `src/types/progress.ts`:
```ts
bossDefeats?: Record<string, {     // key = lessonId or "finale"
  defeated: boolean;
  bestScore: number;
  stars?: 1 | 2 | 3;               // fight-performance rating (distinct from weapon tier)
  weaponTierUsed?: 1 | 2 | 3 | 4 | 5;
  defeatedAt?: number;
}>;
```
Persisted in the existing `users/{uid}/courseProgress/kinematics` doc via a new `recordBossResult(uid, bossId, { score, defeated, ... })` in `src/services/progressService.ts` (merge write). Surfaced by `src/hooks/useProgress.ts` with helpers `bossUnlocked(lessonId)`, `bossDefeated(bossId)`, and `finaleUnlocked()`. Personal high score per boss also flows through the existing `useHighScore` (gameId `boss:{lessonId}`). Public **per-boss leaderboards** reuse the existing `leaderboardService` — see section 14.

## 11. Tech stack & architecture

**Stack:** React + TypeScript + **HTML Canvas 2D**, `requestAnimationFrame` via the existing `useGameLoop`, **fixed-timestep** combat update (e.g. 60Hz accumulator) for deterministic, testable logic. Procedural audio via the existing `audioEngine`. No new runtime dependencies.

**Pattern (mirrors `src/games/arcade/basketball/`):** React owns refs -> pure engine advances state -> build immutable scene -> `drawScene(ctx, layout, scene)` each frame. Pure logic is isolated from rendering for unit testing.

### New files (under `src/games/arcade/boss/`)
- `bossTypes.ts` — the shared contract: `AttackMove` (frame data: startup/active/recovery, reach, height, damage, stun, pushback), `BossIntent` (move/jump/crouch/block/attack/special), `BossAIProfile`, `BossPhase` (`{hp, ai}`), `BossConfig`, `WeaponTier`/`WeaponConfig`/`WeaponStats`, `FighterState`, `CombatState`, `BossLayout`.
- `bossRegistry.ts` — array of 10 `BossConfig` keyed by `lessonId` + a 3-phase `finale`; pulls HP/damage/AI from `bossDifficulty.ts`.
- `bossDifficulty.ts` — the index-based difficulty curve (section 8): `difficultyFor(n) -> { hp, bossDamageMult, ai }`, pure functions.
- `weapons.ts` — the 10 weapon definitions (+ base reach) + tier scaling + `weaponStats(weapon, tier)`.
- `bossEngine.ts` — pure, deterministic fighter state machine (fixed timestep: physics/jumps, frame-data moves, height/block resolution, boss AI, combo/meter/scoring, KO). No DOM.
- `bossScene.ts` — immutable render contract (two `FighterPose`s, HP/meter bars, hit-sparks, particles, banners).
- `bossRender.ts` — Canvas 2D side-view arena + two articulated silhouette fighters posed from the scene (boss motif via `bossShape`), HUD, FX.
- `bossInput.ts` — maps on-screen buttons + keyboard to `BossIntent` (held move/crouch/block vs tapped jump/attacks/special; no gestures).
- `BossControls.tsx` — on-screen touch control overlay (movement cluster + attack cluster).
- `BossFight.tsx` — game shell: wires `useGameLoop` -> engine -> scene -> render; overlays (intro, defeat, victory); props `{ config, weapon, tier, highScore, leaderboard?, onResult }`.
- `audio/audioEngine.ts` (edit) — `BOSS_TRACK`, `FINALE_TRACK`, SFX (`swing`, `strike`, `heavy`, `block`, `jump`, `land`, `ko`, `bossVictory`, `bossDefeat`).
- `__tests__/bossEngine.test.ts`, `__tests__/weapons.test.ts`, `__tests__/bossDifficulty.test.ts`, `__tests__/BossFight.test.tsx`.

### New pages / routing
- `src/pages/BossMapPage.tsx` — Mario-style ladder of 11 nodes (locked / available / defeated, with star ratings + per-boss leaderboard access and the Boss Tower meta-board). Route `/games/bosses`.
- `src/pages/BossFightPage.tsx` — resolves `:bossId`, enforces unlock, computes the boss's themed weapon at the earned tier (mini-bosses) or shows the **weapon picker** (finale only, per 6.4), renders `BossFight`, persists via `recordBossResult`. Route `/games/boss/:bossId`.
- `src/App.tsx` (edit) — add both routes under `RequireAuth`.
- `src/pages/GamesPage.tsx` (edit) — add a "Boss Tower" card -> `/games/bosses`.
- Entry CTAs: a "Challenge the Boss" button on the passing-quiz completion screen (`src/pages/QuizPage.tsx`) and a boss link on a completed `src/components/LessonCard.tsx`.

## 12. Subagents & skills

The build is split across focused subagents launched in parallel where dependencies allow. Each subagent is instructed to **read its assigned skill(s) first** and follow them. Skills are chosen from those installed on this machine:

| Subagent | Responsibilities | Skills to read first | Key deliverables |
|----------|------------------|----------------------|------------------|
| **Combat Engine** | Pure combat logic, difficulty curve, weapon stats | `~/.agents/skills/physics-intuition/SKILL.md` (weighty, grounded hit/feel + timing) | `bossEngine.ts`, `bossDifficulty.ts`, `weapons.ts`, `bossTypes.ts` + unit tests |
| **Boss Art & Render** | Side-view arena, two articulated silhouette fighters posed from frame data, per-boss motif/aura, hit-sparks, screen-shake, finale lensing | `~/.agents/skills/game-designer/SKILL.md`, `~/.agents/skills/motion-graphics/SKILL.md`, `~/.claude/skills/frontend-design/SKILL.md` | `bossRender.ts`, `bossScene.ts` |
| **Game Shell & UI** | `BossFight.tsx`, on-screen button + keyboard controls, finale weapon picker, BossMap + BossFight pages, Games hub card, quiz/lesson entry CTAs | `~/.claude/skills/frontend-design/SKILL.md`, `~/.agents/skills/game-designer/SKILL.md` | `BossFight.tsx`, `BossControls.tsx`, `bossInput.ts`, `BossMapPage.tsx`, `BossFightPage.tsx`, route + CTA edits |
| **Persistence & Gating** | `CourseProgress.bossDefeats`, `recordBossResult`, `weaponTierFor`, `useProgress` helpers, `gating.ts` helpers, per-boss + tower leaderboard gameIds, Firestore security rules for the new field/boards | `~/.cursor/plugins/.../firebase-firestore/SKILL.md`, `~/.cursor/plugins/.../firebase-auth-basics/SKILL.md`, `~/.cursor/plugins/.../firebase-basics/SKILL.md` | progress/gating/service edits + leaderboard wiring + rules |
| **Audio** | Boss + finale procedural tracks and combat SFX | `~/.agents/skills/game-designer/SKILL.md` (for game audio feel) | `audioEngine.ts` additions |
| **QA & Review** | Registry-vs-course sync test, e2e (map locked state, fight loads), full review pass | `~/.cursor/skills-cursor/review-bugbot/SKILL.md`, `~/.cursor/skills-cursor/review-security/SKILL.md` | tests + review report |

Notes:
- The **Combat Engine** subagent must finish `bossTypes.ts` first (shared contract) before Render/Shell start in earnest; Persistence and Audio can run fully in parallel.
- Skills intentionally NOT used here (not applicable): canvas (Cursor Canvas artifacts), sdk, automate, loop, statusline, split-to-prs, add-educational-comments, lesson-opening-designer, nessie, the non-Firestore Firebase skills, and xcode setup.

## 13. Accessibility

- **Reduced motion:** honor `usePrefersReducedMotion` — disable screen shake/warping, reduce particles, resolve telegraphs as static states.
- **No color-only / audio-only cues:** every telegraph pairs a **shape glyph** (e.g. arrow for side, down-chevron for low, shield for guard) with color and sound.
- **No difficulty assist** (per design decision) — but fairness is preserved via clear telegraphs, free instant retries, and the quiz-replay path to a stronger weapon; bosses never block lessons.
- **Input:** large touch targets, full keyboard support, no rapid mashing required (combos are timing, not APM).
- **Pause** any time; fights are skippable (optional content).

## 14. Scoring, rewards & leaderboards

### Scoring
- **Per-fight score** = damage dealt + max combo + meter usage + remaining HP - hits taken, scaled by the weapon tier used.
- **Star rating** (1-3 stars) per boss based on score thresholds, shown on the Boss Map node (kept distinct from the 5 weapon tiers to avoid confusion).
- **High score** persisted via `useHighScore` (`boss:{lessonId}`) and surfaced on the map node.
- **Finale** grants a permanent **"Kinematics Master"** trophy + a course-complete celebration.

### Leaderboards for every boss (your #4)
We reuse the existing `leaderboardService` (Firestore `leaderboards/{gameId}/entries/{uid}`) and the opt-in `EndLeaderboard` component, with **one leaderboard per boss**:
- **Per-boss board:** `gameId = boss:{lessonId}` (and `boss:finale`). On victory, the end screen offers "Submit to leaderboard" (opt-in, same consent flow as the arcade games). The Boss Map node shows your rank/best and a "View leaderboard" affordance per boss.
- **Boss Tower meta-board (aggregate):** `gameId = boss:tower` storing the **sum of each boss's best score** (computed client-side from `bossDefeats` and written on each victory). This gives a single "who's the overall champion" ladder on the Boss Map landing page, on top of the individual boards.
- Reduced friction: submission stays optional; personal bests always save locally + to the user's own progress regardless of leaderboard opt-in.
- Ties into the existing milestone/badge system where natural (new boss badges).

## 15. Testing & QA

- **Unit (vitest):** `bossEngine` (hit/block/height resolution, gravity + walls + body overlap, meter/special, combo, KO win/lose, determinism under a seed), `bossDifficulty` (curve monotonic + clamps), `weapons` (tier scaling). Deterministic via fixed-timestep + seeded RNG.
- **Sync test:** assert `bossRegistry` has exactly one boss per `course.lessons` entry plus `finale` (stays correct as lessons are added/reordered).
- **Component smoke (RTL):** `BossFight` renders with canvas + `ResizeObserver` stubbed (mirrors existing basketball test).
- **E2E (Playwright):** fresh user sees locked boss-map nodes; after passing a quiz the matching boss is available; fight page loads its canvas; finale locked until all wins.
- **Manual feel pass:** telegraph readability, fairness of windows per boss, reduced-motion variant, mobile touch ergonomics.

## 16. Phased delivery

1. **Foundations:** `bossTypes`, `bossDifficulty`, `weapons`, `bossEngine` + tests (no UI).
2. **Vertical slice:** Boss 1 ("Gradient") end-to-end — render, controls, one weapon, page + route — playable and fun.
3. **Persistence & gating:** progress field, service, hooks, gating helpers, Boss Map page.
4. **Content fill:** Bosses 2-10 configs + per-boss silhouettes/attacks; weapon roster complete.
5. **Finale:** The Singularity (3 phases) + spectacle + celebration.
6. **Polish & QA:** audio, juice, accessibility, e2e, review (bugbot + security).

## 17. Risks

- **Build size:** 10 bosses + a 3-phase finale is large; the data-driven engine is the key mitigation. Phase 2 (vertical slice) is the go/no-go checkpoint for scope.
- **Touch ergonomics:** a real-time brawler on a phone needs many buttons (movement + attack clusters); the two-thumb layout needs a quick playtest for reachability and accidental presses.
- **Difficulty tuning:** the section 8 AI curve is a starting point; with no assist mode, early bosses must be tuned passive enough to be fair, later bosses aggressive without feeling cheap.
- **Move readability:** with two articulated silhouettes, attack startup/active poses and heights must stay legible at speed; keep the shared skeleton clear and the boss motif behind it.

## 18. Resolved decisions

- **Combat:** Shadow Fight 2-style 2D silhouette brawler (full footsies: walk/jump/crouch/block + **two attack buttons, Punch & Kick**, with heavy/low/overhead variants driven by held direction + stance — *directional combos*; heavies guard-break; meter Special); single HP bar each; **on-screen buttons only** for touch (no swipe gestures); keyboard mirror on desktop.
- **Scope:** 10 mini-bosses (one per lesson) + 3-phase Singularity finale; single data-driven engine.
- **Unlock:** mini-boss unlocks at quiz >=70%; finale unlocks after all 10 mini-bosses defeated; bosses never gate lessons.
- **Weapons:** themed restriction — each mini-boss uses its lesson's weapon at one of **5 tiers** set by best quiz score (100 / 90-99 / 85-89 / 80-84 / 70-79); re-take quizzes to upgrade. Finale is the only fight with a free weapon pick.
- **No assist mode:** skill-based; improve via practice + higher weapon tier.
- **Leaderboards:** per-boss boards + a Boss Tower aggregate (sum of bests), all opt-in via the existing leaderboard service.
- **Narrative:** keep the light "Vektor vs. the Forces" framing (intro line + short per-boss taunt); not theme-only.








