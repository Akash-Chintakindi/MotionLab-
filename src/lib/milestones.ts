export type Rarity = "rare" | "legendary";

export interface Milestone {
  id: string;
  label: string;
  emoji: string;
  /** One-line explanation of how the badge is earned (shown on the profile). */
  description: string;
  /** Standout achievements get a richer visual treatment. */
  rarity?: Rarity;
}

interface StreakTier {
  threshold: number;
  milestone: Milestone;
}
interface CourseTier {
  lessonsCompleted: number;
  milestone: Milestone;
}
interface MasteryTier {
  /** Minimum lesson mastery (0–1) required to earn the badge. */
  minMastery: number;
  milestone: Milestone;
}

export const STREAK_TIERS: StreakTier[] = [
  {
    threshold: 3,
    milestone: {
      id: "streak-3",
      label: "3-day streak",
      emoji: "🔥",
      description: "Practice 3 days in a row",
    },
  },
  {
    threshold: 7,
    milestone: {
      id: "streak-7",
      label: "7-day streak",
      emoji: "🔥",
      description: "Practice 7 days in a row",
    },
  },
  {
    threshold: 14,
    milestone: {
      id: "streak-14",
      label: "2-week streak",
      emoji: "⚡",
      description: "Practice 14 days in a row",
    },
  },
  {
    threshold: 30,
    milestone: {
      id: "streak-30",
      label: "30-day streak",
      emoji: "🌟",
      description: "Practice 30 days in a row",
    },
  },
  {
    threshold: 60,
    milestone: {
      id: "streak-60",
      label: "Marathoner",
      emoji: "🏅",
      description: "Practice 60 days in a row",
      rarity: "legendary",
    },
  },
];

export const COURSE_TIERS: CourseTier[] = [
  {
    lessonsCompleted: 1,
    milestone: {
      id: "first-lesson",
      label: "First lesson complete",
      emoji: "🎯",
      description: "Finish your first lesson",
    },
  },
  {
    lessonsCompleted: 4,
    milestone: {
      id: "halfway",
      label: "Halfway there",
      emoji: "⛰️",
      description: "Complete 4 lessons",
    },
  },
  {
    lessonsCompleted: 7,
    milestone: {
      id: "course-complete",
      label: "Course complete",
      emoji: "🏆",
      description: "Finish all 7 lessons",
    },
  },
];

/** Per-lesson accuracy badges (earned if ANY single lesson clears the bar). */
export const MASTERY_TIERS: MasteryTier[] = [
  {
    minMastery: 0.8,
    milestone: {
      id: "sharp",
      label: "Sharp Shooter",
      emoji: "🎖️",
      description: "Score 80% or higher on a lesson",
    },
  },
  {
    minMastery: 1,
    milestone: {
      id: "flawless",
      label: "Flawless",
      emoji: "💎",
      description: "Ace a lesson with 100% mastery",
      rarity: "rare",
    },
  },
];

/** Course-wide accuracy goals that span multiple lessons. */
export const TRIPLE_ACE: Milestone = {
  id: "triple-ace",
  label: "Triple Ace",
  emoji: "🥇",
  description: "Earn 100% on three different lessons",
};
export const HONOR_ROLL: Milestone = {
  id: "honor-roll",
  label: "Honor Roll",
  emoji: "📜",
  description: "Score 80%+ on every lesson",
};
export const PERFECTIONIST: Milestone = {
  id: "perfectionist",
  label: "Perfectionist",
  emoji: "👑",
  description: "100% mastery on all 7 lessons",
  rarity: "legendary",
};

export const COMEBACK: Milestone = {
  id: "comeback",
  label: "Comeback Kid",
  emoji: "💪",
  description: "Replay a finished lesson and beat your old score",
};

// ---- Quiz badges --------------------------------------------------------

/** Default score (0–100) that counts as a high-accuracy quiz pass. */
export const QUIZ_PASS_THRESHOLD = 80;

export const QUIZ_SHARP: Milestone = {
  id: "quiz-sharp",
  label: "Sharp Mind",
  emoji: "🧠",
  description: "Score 80% or higher on any quiz",
};
export const QUIZ_ACE: Milestone = {
  id: "quiz-ace",
  label: "Quiz Ace",
  emoji: "🎓",
  description: "Score 100% on any quiz",
  rarity: "rare",
};
export const QUIZ_HAT_TRICK: Milestone = {
  id: "quiz-hat-trick",
  label: "Hat Trick",
  emoji: "🎩",
  description: "Score 100% on three different quizzes",
};
export const QUIZ_HONOR_ROLL: Milestone = {
  id: "quiz-honor-roll",
  label: "Quiz Honor Roll",
  emoji: "📚",
  description: "Score 80%+ on every quiz",
};
export const QUIZ_CHAMPION: Milestone = {
  id: "quiz-champion",
  label: "Quiz Champion",
  emoji: "✅",
  description: "Finish all 7 quizzes",
};
export const QUIZ_PERFECTIONIST: Milestone = {
  id: "quiz-perfectionist",
  label: "Quiz Perfectionist",
  emoji: "💯",
  description: "Score 100% on all 7 quizzes",
  rarity: "legendary",
};

const QUIZ_MILESTONES: Milestone[] = [
  QUIZ_SHARP,
  QUIZ_ACE,
  QUIZ_HAT_TRICK,
  QUIZ_HONOR_ROLL,
  QUIZ_CHAMPION,
  QUIZ_PERFECTIONIST,
];

export const TRIPLE_THREAT: Milestone = {
  id: "triple-threat",
  label: "Triple Threat",
  emoji: "🔱",
  description: "Master a lesson (80%+), take its quiz, and complete it",
};

const ACCURACY_MILESTONES: Milestone[] = [
  ...MASTERY_TIERS.map((t) => t.milestone),
  TRIPLE_ACE,
  HONOR_ROLL,
  PERFECTIONIST,
];

const BY_ID: Record<string, Milestone> = Object.fromEntries(
  [
    ...STREAK_TIERS.map((t) => t.milestone),
    ...COURSE_TIERS.map((t) => t.milestone),
    ...ACCURACY_MILESTONES,
    ...QUIZ_MILESTONES,
    COMEBACK,
    TRIPLE_THREAT,
  ].map((m) => [m.id, m]),
);

export function getMilestone(id: string): Milestone | undefined {
  return BY_ID[id];
}

/** Milestone ids earned for reaching the given current streak length. */
export function streakMilestonesFor(streak: number): string[] {
  return STREAK_TIERS.filter((t) => streak >= t.threshold).map(
    (t) => t.milestone.id,
  );
}

/** Milestone ids earned for completing the given number of lessons. */
export function courseMilestonesFor(lessonsCompleted: number): string[] {
  return COURSE_TIERS.filter((t) => lessonsCompleted >= t.lessonsCompleted).map(
    (t) => t.milestone.id,
  );
}

/** Per-lesson accuracy ids earned for finishing one lesson at this mastery. */
export function masteryMilestonesFor(mastery: number): string[] {
  return MASTERY_TIERS.filter((t) => mastery >= t.minMastery).map(
    (t) => t.milestone.id,
  );
}

/**
 * All accuracy badges given the learner's per-lesson mastery map. Covers the
 * per-lesson badges plus the course-wide goals (3× perfect, honor roll, and the
 * legendary all-perfect run).
 */
export function accuracyMilestonesFor(
  masteryByLesson: Record<string, number>,
  totalLessons: number,
): string[] {
  const vals = Object.values(masteryByLesson);
  const ids = new Set<string>();

  const best = vals.length ? Math.max(...vals) : 0;
  for (const id of masteryMilestonesFor(best)) ids.add(id);

  const perfectCount = vals.filter((v) => v >= 1).length;
  if (perfectCount >= 3) ids.add(TRIPLE_ACE.id);

  // Course-wide goals require every lesson to have been completed.
  if (totalLessons > 0 && vals.length >= totalLessons) {
    if (vals.every((v) => v >= 0.8)) ids.add(HONOR_ROLL.id);
    if (vals.every((v) => v >= 1)) ids.add(PERFECTIONIST.id);
  }

  return Array.from(ids);
}

/**
 * Quiz badges from the learner's best quiz scores (0–100 per lesson). A lesson
 * having an entry in the map means its quiz was finished at least once.
 */
export function quizMilestonesFor(
  quizScores: Record<string, number>,
  totalLessons: number,
  threshold: number = QUIZ_PASS_THRESHOLD,
): string[] {
  const vals = Object.values(quizScores);
  if (vals.length === 0) return [];
  const ids = new Set<string>();

  const best = Math.max(...vals);
  if (best >= threshold) ids.add(QUIZ_SHARP.id);
  if (best >= 100) ids.add(QUIZ_ACE.id);

  if (vals.filter((v) => v >= 100).length >= 3) ids.add(QUIZ_HAT_TRICK.id);

  // Course-wide quiz goals require every quiz to have been finished.
  if (totalLessons > 0 && vals.length >= totalLessons) {
    ids.add(QUIZ_CHAMPION.id);
    if (vals.every((v) => v >= threshold)) ids.add(QUIZ_HONOR_ROLL.id);
    if (vals.every((v) => v >= 100)) ids.add(QUIZ_PERFECTIONIST.id);
  }

  return Array.from(ids);
}

/**
 * Triple Threat: earned once any single lesson has its Learn completed AND a
 * recorded quiz score AND high mastery (>= 80%) on that lesson. (The standalone
 * Practice tab was folded into Learn, so mastery now stands in for it.)
 */
export function tripleThreatMilestonesFor(
  completedLessonIds: string[],
  quizScores: Record<string, number>,
  masteryByLesson: Record<string, number>,
  masteryThreshold = 0.8,
): string[] {
  const did = (m: Record<string, number>, id: string) =>
    Object.prototype.hasOwnProperty.call(m, id);
  const earned = completedLessonIds.some(
    (id) =>
      did(quizScores, id) && (masteryByLesson[id] ?? 0) >= masteryThreshold,
  );
  return earned ? [TRIPLE_THREAT.id] : [];
}

export interface MilestoneGroup {
  title: string;
  milestones: Milestone[];
}

/** The full badge catalog, grouped for display on the profile page. */
export function milestoneCatalog(): MilestoneGroup[] {
  return [
    { title: "Accuracy", milestones: ACCURACY_MILESTONES },
    { title: "Quizzes", milestones: QUIZ_MILESTONES },
    { title: "Course progress", milestones: COURSE_TIERS.map((t) => t.milestone) },
    { title: "Streaks", milestones: STREAK_TIERS.map((t) => t.milestone) },
    { title: "Challenges", milestones: [COMEBACK, TRIPLE_THREAT] },
  ];
}
