import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Quiz, QuizQuestion } from "../../types/content";
import type { QuizAnswer } from "../../lib/quiz";
import { useQuiz, type QuizController } from "../../hooks/useQuiz";
import { PositionTimeGraph } from "../graph/PositionTimeGraph";
import { StaticPlot } from "../graph/StaticPlot";
import { Feedback } from "../feedback/Feedback";
import { RichText } from "../RichText";

export function QuizRunner({
  quiz,
  onComplete,
  onResults,
  next,
  passThreshold = 0,
}: {
  quiz: Quiz;
  /** Called once with the final score percentage when the quiz finishes. */
  onComplete?: (scorePct: number) => void;
  /**
   * Called once when the quiz finishes with the per-question results, so the
   * caller can feed them into the spaced-repetition mastery model.
   */
  onResults?: (results: { questionId: string; correct: boolean }[]) => void;
  /** Where to send the learner after the quiz, if anywhere. */
  next?: { href: string; label: string };
  /**
   * Minimum score (0–100) required to advance. Below it, the "next" CTA is
   * hidden and the learner is asked to retake the quiz. Defaults to 0 (no gate).
   */
  passThreshold?: number;
}) {
  const q = useQuiz(quiz.questions);
  const reported = useRef(false);

  useEffect(() => {
    if (q.phase === "done" && !reported.current) {
      reported.current = true;
      onComplete?.(q.scorePct);
      onResults?.(q.results.map((r) => ({ questionId: r.questionId, correct: r.correct })));
    }
  }, [q.phase, q.scorePct, q.results, onComplete, onResults]);

  if (q.phase === "done") {
    return (
      <ScoreScreen
        quiz={quiz}
        controller={q}
        next={next}
        passThreshold={passThreshold}
        onRetry={() => {
          reported.current = false;
          q.restart();
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wide">Quiz</span>
          <span data-testid="quiz-counter">
            Question {q.index + 1} of {q.total}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${(q.index / q.total) * 100}%` }}
          />
        </div>
      </div>

      <QuestionCard
        key={q.question.id}
        question={q.question}
        phase={q.phase}
        lastCorrect={q.lastCorrect}
        onSubmit={q.submit}
        onContinue={q.next}
        isLast={q.isLast}
      />
    </div>
  );
}

function QuestionCard({
  question,
  phase,
  lastCorrect,
  onSubmit,
  onContinue,
  isLast,
}: {
  question: QuizQuestion;
  phase: "answering" | "feedback";
  lastCorrect: boolean | null;
  onSubmit: (answer: QuizAnswer) => void;
  onContinue: () => void;
  isLast: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const locked = phase === "feedback";

  function submit() {
    if (locked) return;
    if (question.type === "multipleChoice") {
      if (selected === null) return;
      onSubmit({ kind: "option", optionId: selected });
    } else {
      if (value.trim() === "") return;
      onSubmit({ kind: "numeric", value });
    }
  }

  const canSubmit =
    question.type === "multipleChoice" ? selected !== null : value.trim() !== "";

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
      <div className="mb-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-brand-600">
          {question.category}
        </span>
      </div>
      <h2 className="mb-4 text-lg font-semibold leading-snug">
        <RichText>{question.prompt}</RichText>
      </h2>

      <div className="space-y-4">
        {question.graph && (
          <PositionTimeGraph config={question.graph} mode="static" />
        )}
        {question.plot && <StaticPlot config={question.plot} />}

        {question.type === "multipleChoice" ? (
          <div
            className="grid gap-2.5"
            role="radiogroup"
            aria-label={question.prompt}
          >
            {question.options!.map((opt) => {
              const isSelected = selected === opt.id;
              const showCorrect = locked && opt.id === question.correctOptionId;
              const showWrong =
                locked && isSelected && opt.id !== question.correctOptionId;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={locked}
                  onClick={() => setSelected(opt.id)}
                  className={[
                    "rounded-xl border px-4 py-3 text-left text-base transition",
                    showCorrect
                      ? "border-emerald-400 bg-emerald-50"
                      : showWrong
                        ? "border-red-300 bg-red-50"
                        : isSelected
                          ? "border-brand-400 bg-brand-50"
                          : "border-slate-200 bg-white hover:border-brand-300",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              inputMode="decimal"
              disabled={locked}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder={question.placeholder ?? "Your answer"}
              aria-label="Numeric answer"
              className="w-40 rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
            {question.unit && (
              <span className="text-slate-600">{question.unit}</span>
            )}
          </div>
        )}

        {locked && (
          <Feedback
            state={lastCorrect ? "correct" : "incorrect"}
            message={question.explanation}
          />
        )}

        {!locked ? (
          <button
            type="button"
            data-testid="quiz-submit"
            onClick={submit}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            Submit
          </button>
        ) : (
          <button
            type="button"
            data-testid="quiz-continue"
            onClick={onContinue}
            className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700"
          >
            {isLast ? "See results" : "Next question"}
          </button>
        )}
      </div>
    </div>
  );
}

function ScoreScreen({
  quiz,
  controller,
  next,
  passThreshold,
  onRetry,
}: {
  quiz: Quiz;
  controller: QuizController;
  next?: { href: string; label: string };
  passThreshold: number;
  onRetry: () => void;
}) {
  const { scorePct, correctCount, total, results } = controller;
  const resultById = new Map(results.map((r) => [r.questionId, r.correct]));
  const passed = scorePct >= passThreshold;
  const showNext = passed && Boolean(next);
  const tone =
    scorePct >= 80
      ? "text-emerald-500"
      : scorePct >= 50
        ? "text-amber-500"
        : "text-rose-500";

  return (
    <div data-testid="quiz-results">
      <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200 sm:p-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-brand-600">
          Quiz complete
        </p>
        <div className={`mt-2 font-display text-5xl font-bold ${tone}`}>
          {scorePct}%
        </div>
        <p className="mt-1 text-slate-500">
          {correctCount} of {total} correct
        </p>
        {!passed && passThreshold > 0 && (
          <p
            data-testid="quiz-retry-notice"
            className="mx-auto mt-4 max-w-sm rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200"
          >
            You need <span className="font-semibold">{passThreshold}%</span> to
            move on. Review the explanations below and retake the quiz.
          </p>
        )}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {showNext && next && (
            <Link
              to={next.href}
              data-testid="next-step"
              className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white transition hover:bg-brand-700"
            >
              {next.label}
            </Link>
          )}
          <button
            type="button"
            data-testid="quiz-retry"
            onClick={onRetry}
            className={
              showNext
                ? "rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:border-slate-400"
                : "rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white transition hover:bg-brand-700"
            }
          >
            {passed ? "Try again" : "Retake quiz"}
          </button>
          <Link
            to="/"
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:border-slate-400"
          >
            Back to course
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Review</h2>
        <ul className="space-y-2">
          {quiz.questions.map((question, i) => {
            const correct = resultById.get(question.id) ?? false;
            return (
              <li
                key={question.id}
                className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    correct ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  aria-hidden
                >
                  {correct ? "✓" : "✗"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug text-ink">
                    {i + 1}. <RichText>{question.prompt}</RichText>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    <RichText>{question.explanation}</RichText>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
