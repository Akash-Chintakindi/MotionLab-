import { Link } from "react-router-dom";
import { course } from "../content/course";
import { useMastery } from "../services/masteryStore";
import {
  MASTERY_TIER_LABEL,
  masteryTier,
  type MasteryTier,
  type TopicMasteryEntry,
} from "../lib/srs";

// Tailwind classes per tier for the meter fill + label chip.
const TIER_BAR: Record<MasteryTier, string> = {
  new: "bg-slate-300",
  learning: "bg-rose-400",
  familiar: "bg-amber-400",
  strong: "bg-sky-400",
  mastered: "bg-emerald-500",
};

const TIER_TEXT: Record<MasteryTier, string> = {
  new: "text-slate-400",
  learning: "text-rose-600",
  familiar: "text-amber-600",
  strong: "text-sky-600",
  mastered: "text-emerald-600",
};

/**
 * Until a topic's Quiz has been taken, its mastery bar is held below the
 * "Mastered" tier — finishing the Learn section alone shouldn't read as fully
 * mastered. The Quiz answers (also recorded into the store) then let it climb
 * the rest of the way.
 */
const PRE_QUIZ_MASTERY_CAP = 80;

/**
 * Dashboard panel: a "review due" call-to-action plus a per-topic mastery meter
 * for all course lessons. Reads the live mastery store, so it updates as soon as
 * answers are recorded anywhere in the app.
 *
 * `quizScores` (per lesson id) is used only to gate the display: a topic can't
 * show as fully "Mastered" until its quiz has actually been taken.
 */
export function MasteryPanel({
  quizScores,
}: {
  quizScores?: Record<string, number>;
}) {
  const { map, dueTopicIds } = useMastery();
  const dueCount = dueTopicIds.length;

  return (
    <div className="mt-3" data-testid="mastery-panel">
      <Link
        to="/review"
        data-testid="review-cta"
        className={[
          "flex items-center justify-between rounded-2xl px-4 py-3 ring-1 transition",
          dueCount > 0
            ? "bg-brand-50 text-brand-900 ring-brand-200 hover:bg-brand-100"
            : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
        ].join(" ")}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden className="text-lg">
            {dueCount > 0 ? "🧠" : "✅"}
          </span>
          <span className="text-sm font-semibold">
            {dueCount > 0
              ? `Review · ${dueCount} topic${dueCount === 1 ? "" : "s"} due`
              : "Review — all caught up"}
          </span>
        </span>
        <span className="text-sm font-medium opacity-70">
          {dueCount > 0 ? "Start ▸" : "Practice ▸"}
        </span>
      </Link>

      <div className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          Topic mastery
        </h2>
        <ul className="space-y-2.5">
          {course.lessons.map((lesson) => {
            const entry: TopicMasteryEntry | undefined = map[lesson.id];
            const rawPct = entry?.mastery ?? 0;
            // Hold the bar below "Mastered" until the quiz has been taken.
            const quizTaken = quizScores?.[lesson.id] !== undefined;
            const pct = quizTaken
              ? rawPct
              : Math.min(rawPct, PRE_QUIZ_MASTERY_CAP);
            const tier = masteryTier(
              entry && pct !== rawPct ? { ...entry, mastery: pct } : entry,
            );
            const due = dueTopicIds.includes(lesson.id);
            return (
              <li key={lesson.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-slate-700">
                    {lesson.title}
                  </span>
                  <span
                    className={`shrink-0 text-[11px] font-semibold ${TIER_TEXT[tier]}`}
                  >
                    {due && (
                      <span
                        aria-label="due for review"
                        className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-500 align-middle"
                      />
                    )}
                    {MASTERY_TIER_LABEL[tier]}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${TIER_BAR[tier]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
