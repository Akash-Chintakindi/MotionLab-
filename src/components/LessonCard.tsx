import { useState } from "react";
import { Link } from "react-router-dom";
import type { Lesson } from "../types/content";
import type { LessonStatus } from "../types/progress";
import { hasQuiz } from "../content/quizzes";
import { hasGame } from "../games/registry";
import { LESSON_MASTERY_THRESHOLD } from "../lib/gating";

interface Props {
  lesson: Lesson;
  status: LessonStatus;
  unlocked: boolean;
  mastery?: number;
  quizBest?: number;
  practiceBest?: number;
  prerequisiteTitle?: string;
}

export function LessonCard({
  lesson,
  status,
  unlocked,
  mastery,
  quizBest,
  practiceBest,
  prerequisiteTitle,
}: Props) {
  const locked = !unlocked;
  const [open, setOpen] = useState(false);

  // Practice + Quiz open only after the learner masters Learn (>= 80%).
  const modesUnlocked = (mastery ?? 0) >= LESSON_MASTERY_THRESHOLD;
  const practiceReady = hasGame(lesson.id) && modesUnlocked;
  const quizReady = hasQuiz(lesson.id) && modesUnlocked;

  const badge =
    status === "completed"
      ? { text: "Completed", cls: "bg-emerald-100 text-emerald-700" }
      : status === "in_progress"
        ? { text: "In progress", cls: "bg-brand-100 text-brand-700" }
        : locked
          ? { text: "Locked", cls: "bg-slate-200 text-slate-500" }
          : { text: "Start", cls: "bg-amber-100 text-amber-700" };

  const learnStatus =
    status === "completed"
      ? "Completed"
      : status === "in_progress"
        ? "Continue"
        : "Start";

  const header = (
    <div className="flex items-center gap-4 p-4">
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold",
          status === "completed"
            ? "bg-emerald-500 text-white"
            : locked
              ? "bg-slate-300 text-slate-600"
              : "bg-brand-600 text-white",
        ].join(" ")}
        aria-hidden
      >
        {locked ? "🔒" : status === "completed" ? "✓" : lesson.order}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-ink">{lesson.title}</h3>
        <p className="truncate text-sm text-slate-500">{lesson.subtitle}</p>
        {locked && prerequisiteTitle && (
          <p className="mt-1 text-xs text-slate-500">
            Complete <span className="font-medium">{prerequisiteTitle}</span> to
            unlock.
          </p>
        )}
        {!locked && typeof mastery === "number" && status === "completed" && (
          <p className="mt-1 text-xs text-emerald-600">
            Mastery {Math.round(mastery * 100)}%
          </p>
        )}
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}
      >
        {badge.text}
      </span>
      {!locked && (
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );

  if (locked) {
    return (
      <div
        aria-disabled
        className="cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 opacity-80"
      >
        {header}
      </div>
    );
  }

  return (
    <div
      className={[
        "overflow-hidden rounded-2xl border transition",
        open
          ? "border-brand-300 bg-white shadow-sm"
          : "border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left"
      >
        {header}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <ModeAction
              to={`/lesson/${lesson.id}`}
              emoji="📘"
              label="Learn"
              note={learnStatus}
              accent="brand"
            />
            <ModeAction
              to={practiceReady ? `/lesson/${lesson.id}/practice` : null}
              emoji="🎮"
              label="Practice"
              note={
                !hasGame(lesson.id)
                  ? "Coming soon"
                  : !modesUnlocked
                    ? "🔒 Master Learn (80%)"
                    : typeof practiceBest === "number"
                      ? `Best ${practiceBest}%`
                      : "Play"
              }
              accent="violet"
            />
            <ModeAction
              to={quizReady ? `/lesson/${lesson.id}/quiz` : null}
              emoji="📝"
              label="Quiz"
              note={
                !hasQuiz(lesson.id)
                  ? "Coming soon"
                  : !modesUnlocked
                    ? "🔒 Master Learn (80%)"
                    : typeof quizBest === "number"
                      ? `Best ${quizBest}%`
                      : "Start"
              }
              accent="emerald"
            />
          </div>
        </div>
      )}
    </div>
  );
}

const ACCENTS: Record<string, string> = {
  brand: "hover:border-brand-300 hover:bg-brand-50",
  violet: "hover:border-violet-300 hover:bg-violet-50",
  emerald: "hover:border-emerald-300 hover:bg-emerald-50",
};

function ModeAction({
  to,
  emoji,
  label,
  note,
  accent,
}: {
  to: string | null;
  emoji: string;
  label: string;
  note: string;
  accent: string;
}) {
  const body = (
    <div className="flex items-center gap-3">
      <span className="text-xl" aria-hidden>
        {emoji}
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-ink">{label}</div>
        <div className="truncate text-xs text-slate-500">{note}</div>
      </div>
    </div>
  );

  if (!to) {
    return (
      <div
        aria-disabled
        className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 opacity-60"
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      to={to}
      aria-label={label}
      data-testid={`lesson-mode-${label.toLowerCase()}`}
      className={`rounded-xl border border-slate-200 px-3 py-2.5 transition ${ACCENTS[accent]}`}
    >
      {body}
    </Link>
  );
}
