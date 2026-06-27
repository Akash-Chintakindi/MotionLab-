import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Spinner } from "../components/Spinner";
import { RichText } from "../components/RichText";
import { LabEndLeaderboard } from "../components/lab/LabEndLeaderboard";
import {
  useLabSurvival,
  MAX_TIME_MINUTES,
  MIN_TIME_MINUTES,
  type LabMode,
  type LabRunConfig,
} from "../hooks/useLabSurvival";
import { useHighScore } from "../games/arcade/useHighScore";
import { useMastery } from "../services/masteryStore";
import { practiceTopics } from "../ai/topics";
import { DIFFICULTY_LABEL, type Difficulty } from "../ai/practiceTypes";
import type { LabQuestion, WeakArea } from "../lib/labAdaptive";

const GAME_ID = "lab";

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function LabPage() {
  const lab = useLabSurvival();
  const { highScore, submit: submitHighScore } = useHighScore(GAME_ID);
  const { record } = useMastery();

  // Feed every graded Lab answer into the spaced-repetition mastery model.
  // We track how many records we've already recorded so each answer counts once;
  // a shrinking array means a new run started, so reset the cursor.
  const recordedRef = useRef(0);
  useEffect(() => {
    if (lab.records.length < recordedRef.current) recordedRef.current = 0;
    for (let i = recordedRef.current; i < lab.records.length; i++) {
      const r = lab.records[i];
      record(r.topicId, r.correct, r.difficulty);
    }
    recordedRef.current = lab.records.length;
  }, [lab.records, record]);

  const topics = useMemo(() => practiceTopics(), []);
  const topicTitle = useMemo(() => {
    const map = new Map(topics.map((t) => [t.id, t.title] as const));
    return (id: string) => map.get(id) ?? id;
  }, [topics]);

  // A pending config means we are mid-countdown: the run begins when it ends.
  const [pendingConfig, setPendingConfig] = useState<LabRunConfig | null>(null);
  const lastConfigRef = useRef<LabRunConfig | null>(null);

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

  function startRun(config: LabRunConfig) {
    lastConfigRef.current = config;
    setPendingConfig(config);
  }

  function changeMode() {
    setPendingConfig(null);
    lab.toMenu();
  }

  const showMenu = lab.phase === "menu" && !pendingConfig;
  const inGame = !showMenu && !pendingConfig;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl">
        {showMenu && <ModeMenu onStart={startRun} best={best} />}

        {pendingConfig && (
          <Countdown
            onDone={() => {
              lab.begin(pendingConfig);
              setPendingConfig(null);
            }}
          />
        )}

        {inGame && (
          <>
            <Hud
              mode={lab.mode}
              score={lab.score}
              best={best}
              strikes={lab.strikes}
              maxStrikes={lab.maxStrikes}
              timeRemaining={lab.timeRemaining}
              difficulty={lab.difficulty}
              showStatus={lab.phase !== "over"}
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
                mode={lab.mode}
                score={lab.score}
                best={best}
                prevBest={prevBest}
                report={lab.report}
                topicTitle={topicTitle}
                onPlayAgain={() =>
                  lastConfigRef.current && startRun(lastConfigRef.current)
                }
                onChangeMode={changeMode}
              />
            )}
          </>
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

function ModeMenu({
  onStart,
  best,
}: {
  onStart: (config: LabRunConfig) => void;
  best: number;
}) {
  const [selected, setSelected] = useState<LabMode>("survival");
  const [minutes, setMinutes] = useState(5);

  const minutesValid =
    Number.isFinite(minutes) &&
    minutes >= MIN_TIME_MINUTES &&
    minutes <= MAX_TIME_MINUTES;

  function start() {
    if (selected === "time") {
      if (!minutesValid) return;
      onStart({ mode: "time", durationSec: minutes * 60 });
    } else {
      onStart({ mode: "survival" });
    }
  }

  return (
    <div data-testid="lab-menu">
      <header className="mb-6 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
          Lab
        </h1>
        <p className="mt-1.5 text-base text-slate-500">
          Adaptive AP Physics drills that get harder as you do. Pick a mode.
        </p>
        <p className="mt-1 text-sm font-medium text-slate-400">
          Personal best {best}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <ModeCard
          testid="lab-mode-survival"
          active={selected === "survival"}
          onSelect={() => setSelected("survival")}
          emoji="🎯"
          title="Survival"
          blurb="Keep answering until you miss three. How far can you go?"
        />
        <ModeCard
          testid="lab-mode-time"
          active={selected === "time"}
          onSelect={() => setSelected("time")}
          emoji="⏱️"
          title="Time Attack"
          blurb="Race the clock — score as many as you can before time runs out."
        />
      </div>

      {selected === "time" && (
        <div className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <label
            htmlFor="lab-minutes"
            className="block text-sm font-semibold text-slate-700"
          >
            How many minutes? ({MIN_TIME_MINUTES}–{MAX_TIME_MINUTES})
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="lab-minutes"
              data-testid="lab-time-minutes"
              type="number"
              min={MIN_TIME_MINUTES}
              max={MAX_TIME_MINUTES}
              value={Number.isNaN(minutes) ? "" : minutes}
              onChange={(e) => setMinutes(Math.floor(Number(e.target.value)))}
              className="w-24 rounded-xl border border-slate-200 px-4 py-2.5 text-base text-slate-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <span className="text-base text-slate-500">minutes</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[3, 5, 10, 15].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                  minutes === m
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                ].join(" ")}
              >
                {m}m
              </button>
            ))}
          </div>
          {!minutesValid && (
            <p className="mt-2 text-sm text-rose-600">
              Enter a whole number from {MIN_TIME_MINUTES} to {MAX_TIME_MINUTES}.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        data-testid="lab-start"
        onClick={start}
        disabled={selected === "time" && !minutesValid}
        className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-3.5 text-lg font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        Start {selected === "time" ? "Time Attack" : "Survival"}
      </button>
    </div>
  );
}

function ModeCard({
  testid,
  active,
  onSelect,
  emoji,
  title,
  blurb,
}: {
  testid: string;
  active: boolean;
  onSelect: () => void;
  emoji: string;
  title: string;
  blurb: string;
}) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onSelect}
      aria-pressed={active}
      className={[
        "flex flex-col rounded-2xl border p-5 text-left transition",
        active
          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500"
          : "border-slate-200 bg-white hover:border-slate-300",
      ].join(" ")}
    >
      <span className="text-3xl" aria-hidden>
        {emoji}
      </span>
      <span className="mt-2 font-display text-xl font-bold text-ink">
        {title}
      </span>
      <span className="mt-1 text-sm leading-relaxed text-slate-500">
        {blurb}
      </span>
    </button>
  );
}

function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const seq = [3, 2, 1];
    let i = 0;
    setN(seq[0]);
    const tick = () => {
      i += 1;
      if (i < seq.length) {
        setN(seq[i]);
        timer = setTimeout(tick, 800);
      } else {
        setN(0); // shows "Go!"
        timer = setTimeout(() => doneRef.current(), 650);
      }
    };
    let timer = setTimeout(tick, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      data-testid="lab-countdown"
      className="flex min-h-[55vh] flex-col items-center justify-center"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
        Get ready
      </p>
      <div
        key={n}
        className="mt-3 animate-pop-in font-display text-8xl font-bold tabular-nums text-brand-600"
      >
        {n > 0 ? n : "Go!"}
      </div>
    </div>
  );
}

function Hud({
  mode,
  score,
  best,
  strikes,
  maxStrikes,
  timeRemaining,
  difficulty,
  showStatus,
}: {
  mode: LabMode | null;
  score: number;
  best: number;
  strikes: number;
  maxStrikes: number;
  timeRemaining: number | null;
  difficulty: Difficulty;
  showStatus: boolean;
}) {
  const isTime = mode === "time";
  const lowTime = isTime && (timeRemaining ?? 0) <= 10;

  return (
    <header className="mb-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Lab
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isTime ? "Time Attack — beat the clock" : "Survival — how far can you go?"}
          </p>
        </div>
        <div className="text-right">
          <div
            className="font-display text-3xl font-bold tabular-nums text-brand-600"
            data-testid="lab-score"
          >
            {score}
          </div>
          <div className="text-xs font-medium text-slate-400">Best {best}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {isTime ? (
          <div
            className={[
              "flex items-center gap-2 rounded-xl px-3 py-1.5 text-lg font-bold tabular-nums transition",
              lowTime
                ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200"
                : "bg-slate-100 text-slate-700",
            ].join(" ")}
            role="timer"
            aria-label="Time remaining"
            data-testid="lab-timer"
          >
            <span aria-hidden>⏱️</span>
            {formatClock(timeRemaining ?? 0)}
          </div>
        ) : (
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
        )}

        {showStatus && (
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
        {correct ? "Correct! +1" : "Not quite."}
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
  mode,
  score,
  best,
  prevBest,
  report,
  topicTitle,
  onPlayAgain,
  onChangeMode,
}: {
  mode: LabMode | null;
  score: number;
  best: number;
  prevBest: number;
  report: WeakArea[];
  topicTitle: (id: string) => string;
  onPlayAgain: () => void;
  onChangeMode: () => void;
}) {
  const newBest = score > prevBest && score > 0;

  return (
    <div className="space-y-4" data-testid="lab-game-over">
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">
          {mode === "time" ? "Time's up" : "Game over"}
        </p>
        <div className="mt-2 font-display text-5xl font-bold tabular-nums text-ink">
          {score}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {newBest ? "New personal best! 🎉" : `Personal best ${best}`}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            data-testid="lab-play-again"
            onClick={onPlayAgain}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-700"
          >
            Play again
          </button>
          <button
            type="button"
            data-testid="lab-change-mode"
            onClick={onChangeMode}
            className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Change mode
          </button>
        </div>
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
