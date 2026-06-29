// ---------------------------------------------------------------------------
// Content-complete boss roster: 10 mini-bosses (one per course lesson, ordered
// by `course.order`) plus the 3-phase finale, "The Singularity". Each boss is
// DATA, not code — its silhouette (visual.shape), palette, and taunt layer onto
// the shared brawler engine. HP, damage, and AI are pulled from the index-based
// difficulty curve (bossDifficulty.ts) so the ladder ramps consistently.
// Mini-bosses get index 1..10; the finale is index 11 and its three phases
// escalate along the curve (11/12/13).
// ---------------------------------------------------------------------------

import { course } from "../../../content/course";
import type { BossConfig, BossPhase, BossShape } from "./bossTypes";
import { difficultyFor } from "./bossDifficulty";

/** A boss phase built straight from the difficulty curve at a given index. */
function phaseFor(index: number): BossPhase {
  const d = difficultyFor(index);
  return { hp: d.hp, ai: d.ai };
}

interface BossMeta {
  name: string;
  title: string;
  taunt: string;
  shape: BossShape;
  primary: string;
  secondary: string;
  accent: string;
}

// Indexed 0..9 for boss index 1..10, in course order (matches course.lessons
// sorted by `order`: 1..6 core, free fall, relative motion, oscillations, then
// the mastery challenge as the gatekeeper).
const BOSS_META: BossMeta[] = [
  {
    name: "Gradient",
    title: "the Slope Wraith",
    taunt: "Every line has a slope. Read mine.",
    shape: "slopeWraith",
    primary: "#38e1ff",
    secondary: "#0a6c8a",
    accent: "#d6f9ff",
  },
  {
    name: "Acceleron",
    title: "the Quickening",
    taunt: "Each blow is faster than the last. Keep up.",
    shape: "accelArrow",
    primary: "#ffb347",
    secondary: "#b25c00",
    accent: "#fff0d6",
  },
  {
    name: "Sigma",
    title: "the Accumulator",
    taunt: "Brick by brick, my wall only grows.",
    shape: "riemannTower",
    primary: "#2fd6c3",
    secondary: "#0a6b63",
    accent: "#d6fff8",
  },
  {
    name: "Tempus",
    title: "the Sequencer",
    taunt: "Acceleration, velocity, position — defend in order.",
    shape: "ringCore",
    primary: "#b47dff",
    secondary: "#5b1fa8",
    accent: "#ecd9ff",
  },
  {
    name: "Vectra",
    title: "the Component Twins",
    taunt: "Two axes, two threats. Mind them both.",
    shape: "componentCross",
    primary: "#ff5cc8",
    secondary: "#9be600",
    accent: "#ffd6f1",
  },
  {
    name: "Ballista",
    title: "the Arc",
    taunt: "Watch the parabola. It always lands.",
    shape: "arcComet",
    primary: "#ff6a3d",
    secondary: "#b21f00",
    accent: "#ffd9c2",
  },
  {
    name: "Gravitas",
    title: "the Pull",
    taunt: "Everything falls. Even you.",
    shape: "gravityOrb",
    primary: "#5b6bff",
    secondary: "#1a1f6e",
    accent: "#c9cfff",
  },
  {
    name: "Parallax",
    title: "the Frame-Shifter",
    taunt: "Trust the glyph, not the scenery.",
    shape: "framePrism",
    primary: "#7df9ff",
    secondary: "#c77dff",
    accent: "#f0ffff",
  },
  {
    name: "Harmonia",
    title: "the Oscillator",
    taunt: "Feel the beat. Strike on the beat.",
    shape: "sineSerpent",
    primary: "#2fe57a",
    secondary: "#0a7a44",
    accent: "#d6ffe8",
  },
  {
    name: "Apex",
    title: "the Mirror",
    taunt: "I am you, sharpened. Prove you are more.",
    shape: "mirror",
    primary: "#d7d7e0",
    secondary: "#3a3a44",
    accent: "#8be9ff",
  },
];

// Mini-bosses, derived by mapping the course's lessons (already sorted by
// `order`) onto indices 1..10. Anchoring to the course keeps the roster correct
// if lessons are reordered.
export const miniBosses: BossConfig[] = course.lessons.map((lesson, i) => {
  const index = i + 1;
  const meta = BOSS_META[i];
  return {
    id: lesson.id,
    lessonId: lesson.id,
    index,
    name: meta.name,
    title: meta.title,
    taunt: meta.taunt,
    visual: {
      shape: meta.shape,
      primary: meta.primary,
      secondary: meta.secondary,
      accent: meta.accent,
    },
    phases: [phaseFor(index)],
    musicTrack: "boss",
  };
});

// The finale: three full HP bars escalating on the curve (indices 11/12/13).
export const finale: BossConfig = {
  id: "finale",
  lessonId: null,
  index: 11,
  name: "The Singularity",
  title: "the Event Horizon",
  taunt: "All motion ends here. Collapse with me.",
  visual: {
    shape: "singularity",
    primary: "#c08bff",
    secondary: "#1a0a2e",
    accent: "#ff7de0",
  },
  phases: [phaseFor(11), phaseFor(12), phaseFor(13)],
  musicTrack: "finale",
};

export const allBosses: BossConfig[] = [...miniBosses, finale];

const byId: ReadonlyMap<string, BossConfig> = new Map(
  allBosses.map((b) => [b.id, b]),
);

/** Look up a boss config by its stable id (lessonId, or "finale"). */
export function bossById(id: string): BossConfig | undefined {
  return byId.get(id);
}
