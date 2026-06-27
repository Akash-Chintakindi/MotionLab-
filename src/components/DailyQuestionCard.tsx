import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useMastery } from "../services/masteryStore";
import { RichText } from "./RichText";
import { course } from "../content/course";
import { dailyQuestion } from "../lib/dailyQuestion";
import { dailyQuestionAnswered } from "../lib/streak";
import { recordDailyQuestionResult } from "../services/progressService";
import { recordDailyResultToSquads } from "../services/squadService";
import { gradeQuestion, type QuizAnswer } from "../lib/quiz";
import type { StreakData } from "../types/progress";
import type { BankQuestion } from "../content/practiceBank/types";

const DIFF_LABEL: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/**
 * Dashboard "Question of the Day" entry point: a big button that opens the
 * shared, date-seeded daily question in a modal. Answerable once per day; locks
 * to a result + a separate daily-question streak. Feeds mastery + the daily-goal
 * ring via the mastery `record` chokepoint.
 */
export function DailyQuestionCard({ streak }: { streak: StreakData | null }) {
  const { user } = useAuth();
  const { record } = useMastery();
  const question = useMemo<BankQuestion>(() => dailyQuestion(), []);

  const topicTitle = useMemo(
    () => course.lessons.find((l) => l.id === question.topicId)?.title,
    [question.topicId],
  );

  const [open, setOpen] = useState(false);
  // When the question modal opened, to measure time-to-answer for the squad board.
  const openedAtRef = useRef<number>(0);
  // Result from answering during this session (optimistic), if any.
  const [session, setSession] = useState<{ correct: boolean; streak: number } | null>(
    null,
  );

  const answeredEarlier = streak ? dailyQuestionAnswered(streak) : false;
  const done = session !== null || answeredEarlier;

  const shownCorrect = session ? session.correct : streak?.dailyQuestionCorrect ?? false;
  const shownStreak = session ? session.streak : streak?.dailyQuestionStreak ?? 0;

  async function handleSubmit(answer: QuizAnswer) {
    if (!user || done) return;
    const correct = gradeQuestion(question, answer);
    const timeMs = openedAtRef.current
      ? Date.now() - openedAtRef.current
      : 0;
    // Persist the daily-question streak first, then fold the answer into mastery
    // + the daily goal (the mastery write targets a different doc; recording the
    // daily-question result first keeps the streak-doc writes ordered).
    let nextStreak = shownStreak + 1;
    try {
      const updated = await recordDailyQuestionResult(user.uid, correct);
      nextStreak = updated.dailyQuestionStreak ?? nextStreak;
    } catch {
      // Optimistic streak still shows; next load reconciles from Firestore.
    }
    record(question.topicId, correct, question.difficulty);
    // Post the result to every squad's daily board (best-effort, ranked by
    // correctness then speed). No-op if the user isn't in any squad.
    const name =
      user.displayName || user.email?.split("@")[0] || "Anonymous";
    void recordDailyResultToSquads(user.uid, name, correct, timeMs).catch(() => {});
    setSession({ correct, streak: nextStreak });
  }

  function openModal() {
    openedAtRef.current = Date.now();
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        data-testid="daily-question-open"
        aria-haspopup="dialog"
        className="group flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-brand-600 to-accent-600 p-4 text-left text-white shadow-sm ring-1 ring-black/5 transition hover:brightness-110 active:brightness-95"
      >
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl"
        >
          {done ? "✅" : "📅"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold leading-tight">
            Daily Question
          </span>
          <span className="mt-0.5 block truncate text-sm text-white/80">
            {done
              ? shownCorrect
                ? "Solved today — tap to review"
                : "Answered today — tap to review"
              : "New problem today — tap to play"}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
          <span aria-hidden>🔥</span>
          <span data-testid="daily-question-streak">{shownStreak}</span>
        </span>
      </button>

      {open && (
        <DailyQuestionModal
          question={question}
          topicTitle={topicTitle}
          done={done}
          shownCorrect={shownCorrect}
          shownStreak={shownStreak}
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function DailyQuestionModal({
  question,
  topicTitle,
  done,
  shownCorrect,
  shownStreak,
  onSubmit,
  onClose,
}: {
  question: BankQuestion;
  topicTitle?: string;
  done: boolean;
  shownCorrect: boolean;
  shownStreak: number;
  onSubmit: (a: QuizAnswer) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Question of the day"
        data-testid="daily-question-modal"
        onClick={(e) => e.stopPropagation()}
        className="animate-rise-in w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Question of the day
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              {topicTitle && <span className="truncate">{topicTitle}</span>}
              <span aria-hidden>·</span>
              <span>{DIFF_LABEL[question.difficulty] ?? question.difficulty}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70"
              title="Daily-question streak — consecutive days answered"
            >
              <span aria-hidden>🔥</span>
              {shownStreak}
            </span>
            <button
              type="button"
              onClick={onClose}
              data-testid="daily-question-close"
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
        </div>

        <p className="mt-5 text-xl font-medium leading-relaxed text-slate-800">
          <RichText>{question.prompt}</RichText>
        </p>

        {done ? (
          <ResultPanel question={question} correct={shownCorrect} onClose={onClose} />
        ) : (
          <AnswerForm question={question} onSubmit={onSubmit} />
        )}
      </div>
    </div>
  );
}

function ResultPanel({
  question,
  correct,
  onClose,
}: {
  question: BankQuestion;
  correct: boolean;
  onClose: () => void;
}) {
  return (
    <div className="mt-4">
      <div
        className={[
          "rounded-xl px-4 py-3 text-base font-semibold",
          correct
            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
            : "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
        ].join(" ")}
        role="status"
      >
        {correct ? "Correct — see you tomorrow!" : "Not quite — back tomorrow!"}
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 p-4 text-base leading-relaxed text-slate-700">
        <RichText>{question.explanation}</RichText>
      </div>
      <div className="mt-4 flex gap-2">
        <Link
          to="/squad"
          onClick={onClose}
          data-testid="daily-squad-link"
          className="flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110"
        >
          See your squad board
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-slate-100 px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function AnswerForm({
  question,
  onSubmit,
}: {
  question: BankQuestion;
  onSubmit: (a: QuizAnswer) => void;
}) {
  const [selected, setSelected] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fire = (a: QuizAnswer) => {
    if (submitting) return;
    setSubmitting(true);
    onSubmit(a);
  };

  if (question.type === "multipleChoice") {
    return (
      <div className="mt-4">
        <div className="space-y-2.5" role="group" aria-label="Answer options">
          {(question.options ?? []).map((opt) => {
            const active = selected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                data-testid={`daily-opt-${opt.id}`}
                onClick={() => setSelected(opt.id)}
                aria-pressed={active}
                className={[
                  "block w-full rounded-xl border px-4 py-3 text-left text-base transition",
                  active
                    ? "border-brand-500 bg-brand-50 font-semibold text-brand-800 ring-1 ring-brand-500"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                ].join(" ")}
              >
                <RichText>{opt.label}</RichText>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={!selected || submitting}
          data-testid="daily-submit"
          onClick={() => fire({ kind: "option", optionId: selected })}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
        >
          Submit answer
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (selected.trim()) fire({ kind: "numeric", value: selected.trim() });
      }}
    >
      <div className="flex items-stretch gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          aria-label="Your numeric answer"
          placeholder="Your answer"
          data-testid="daily-numeric"
          autoFocus
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        {question.unit && (
          <span className="flex items-center rounded-xl bg-slate-100 px-3 text-base font-medium text-slate-600">
            <RichText>{question.unit}</RichText>
          </span>
        )}
      </div>
      <button
        type="submit"
        disabled={!selected.trim() || submitting}
        data-testid="daily-submit"
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
      >
        Submit answer
      </button>
    </form>
  );
}
