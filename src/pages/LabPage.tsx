import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Spinner } from "../components/Spinner";
import { RichText } from "../components/RichText";
import { LabEndLeaderboard } from "../components/lab/LabEndLeaderboard";
import { useLabSurvival } from "../hooks/useLabSurvival";
import { useHighScore } from "../games/arcade/useHighScore";
import { practiceTopics } from "../ai/topics";
import { DIFFICULTY_LABEL, type Difficulty } from "../ai/practiceTypes";
import type { LabQuestion, WeakArea } from "../lib/labAdaptive";

const GAME_ID = "lab";

export default function LabPage() {
  const lab = useLabSurvival();
  const { highScore, submit: submitHighScore } = useHighScore(GAME_ID);

  const topics = useMemo(() => practiceTopics(), []);
  const topicTitle = useMemo(() => {
    const map = new Map(topics.map((t) => [t.id, t.title] as const));
    return (id: string) => map.get(id) ?? id;
  }, [topics]);

  // Best score from runs BEFORE this one, captured at game-over so we can tell
  // a genuine new record from merely a positive score.
  const [prevBest, setPrevBest] = useState(0);

  // Record the run's score once when the game ends (personal best).
  useEffect(() => {
    if (lab.phase === "over") {
      setPrevBest(highScore);
      void submitHighScore(lab.score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lab.phase]);

  const best = Math.max(highScore, lab.score);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl">
        <Hud
          score={lab.score}
          best={best}
          strikes={lab.strikes}
          maxStrikes={lab.maxStrikes}
          difficulty={lab.difficulty}
          showDifficulty={lab.phase !== "over"}
        />

        {lab.phase === "loading" && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner label="Loading the next problem…" />
          </div>
        )}

        {(lab.phase === "question" || lab.phase === "feedback") &&
          lab.question && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                <p className="text-base font-medium text-slate-800">
                  <RichText>{lab.question.prompt}</RichText>
                </p>

                {lab.phase === "question" ? (
                  <AnswerForm
                    key={lab.question.id}
                    question={lab.question}
                    onSubmit={lab.submit}
                  />
                ) : (
                  <AnswerFeedback
                    question={lab.question}
                    correct={lab.lastCorrect === true}
                    onNext={lab.next}
                  />
                )}
              </div>

              {lab.phase === "feedback" && lab.reviewTopicId && (
                <ReviewBanner
                  topicId={lab.reviewTopicId}
                  title={topicTitle(lab.reviewTopicId)}
                />
              )}
            </div>
          )}

        {lab.phase === "over" && (
          <GameOver
            score={lab.score}
            best={best}
            prevBest={prevBest}
            report={lab.report}
            topicTitle={topicTitle}
            onPlayAgain={lab.restart}
          />
        )}

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Back to course
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Hud({
  score,
  best,
  strikes,
  maxStrikes,
  difficulty,
  showDifficulty,
}: {
  score: number;
  best: number;
  strikes: number;
  maxStrikes: number;
  difficulty: Difficulty;
  showDifficulty: boolean;
}) {
  return (
    <header className="mb-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Lab
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Survival mode — how far can you go?
          </p>
        </div>
        <div className="text-right">
          <div
            className="font-display text-3xl font-bold tabular-nums text-brand-600"
            data-testid="lab-score"
          >
            {score}
          </div>
          <div className="text-xs font-medium text-slate-400">
            Best {best}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-1.5"
          role="status"
          aria-label={`${strikes} of ${maxStrikes} strikes used`}
          data-testid="lab-strikes"
        >
          {Array.from({ length: maxStrikes }).map((_, i) => {
            const used = i < strikes;
            return (
              <span
                key={i}
                aria-hidden
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-xl border text-lg font-bold transition",
                  used
                    ? "border-rose-300 bg-rose-50 text-rose-600"
                    : "border-slate-200 bg-white text-slate-300",
                ].join(" ")}
              >
                {used ? "✕" : ""}
              </span>
            );
          })}
        </div>

        {showDifficulty && (
          <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
            {DIFFICULTY_LABEL[difficulty]}
          </span>
        )}
      </div>
    </header>
  );
}

function AnswerForm({
  question,
  onSubmit,
}: {
  question: LabQuestion;
  onSubmit: (answer: string) => void;
}) {
  const [selected, setSelected] = useState<string>("");

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
          disabled={!selected}
          onClick={() => onSubmit(selected)}
          className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (selected.trim()) onSubmit(selected.trim());
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
        disabled={!selected.trim()}
        className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        Submit
      </button>
    </form>
  );
}

function AnswerFeedback({
  question,
  correct,
  onNext,
}: {
  question: LabQuestion;
  correct: boolean;
  onNext: () => void;
}) {
  const correctAnswer =
    question.type === "multipleChoice"
      ? question.options?.find((o) => o.id === question.correctOptionId)
          ?.label ?? ""
      : `${question.value ?? ""}${question.unit ? ` ${question.unit}` : ""}`;

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
        aria-live="polite"
      >
        {correct ? "Correct! +1" : "Not quite — that's a strike."}
      </div>

      {!correct && correctAnswer && (
        <p className="mt-3 text-base text-slate-700">
          <span className="font-semibold text-slate-800">Answer: </span>
          <RichText>{correctAnswer}</RichText>
        </p>
      )}

      <div className="mt-3 rounded-xl bg-slate-50 p-4 text-base leading-relaxed text-slate-700">
        <RichText>{question.explanation}</RichText>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-700"
      >
        Next question
      </button>
    </div>
  );
}

function ReviewBanner({ topicId, title }: { topicId: string; title: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-base font-medium text-sky-900">
        Stuck on the basics? Review <span className="font-semibold">{title}</span>.
      </p>
      <Link
        to={`/lesson/${topicId}`}
        className="shrink-0 rounded-xl bg-sky-600 px-4 py-2.5 text-center text-base font-semibold text-white transition hover:bg-sky-700"
      >
        Review this lesson
      </Link>
    </div>
  );
}

function GameOver({
  score,
  best,
  prevBest,
  report,
  topicTitle,
  onPlayAgain,
}: {
  score: number;
  best: number;
  prevBest: number;
  report: WeakArea[];
  topicTitle: (id: string) => string;
  onPlayAgain: () => void;
}) {
  const newBest = score > prevBest && score > 0;

  return (
    <div className="space-y-4" data-testid="lab-game-over">
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">
          Game over
        </p>
        <div className="mt-2 font-display text-5xl font-bold tabular-nums text-ink">
          {score}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {newBest ? "New personal best! 🎉" : `Personal best ${best}`}
        </p>
        <button
          type="button"
          data-testid="lab-play-again"
          onClick={onPlayAgain}
          className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-700"
        >
          Play again
        </button>
      </div>

      <ImprovementReport report={report} topicTitle={topicTitle} />

      <LabEndLeaderboard score={score} />
    </div>
  );
}

function ImprovementReport({
  report,
  topicTitle,
}: {
  report: WeakArea[];
  topicTitle: (id: string) => string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <h2 className="text-base font-bold text-slate-800">How to improve</h2>
      {report.length === 0 ? (
        <p className="mt-1.5 text-sm text-slate-500">
          No misses to review — clean run. Push for an even higher score!
        </p>
      ) : (
        <>
          <p className="mt-1.5 text-sm text-slate-500">
            Topics to revisit, by where you slipped up:
          </p>
          <ul className="mt-3 space-y-2.5">
            {report.map((area) => (
              <li
                key={area.topicId}
                className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-800">
                    {topicTitle(area.topicId)}
                  </div>
                  <div className="mt-0.5 text-sm text-slate-500">
                    Missed {area.missed} of {area.total} ·{" "}
                    {area.difficulties
                      .map((d) => DIFFICULTY_LABEL[d])
                      .join(", ")}
                  </div>
                </div>
                <Link
                  to={`/lesson/${area.topicId}`}
                  className="shrink-0 rounded-lg bg-brand-600 px-3.5 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Review lesson
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
