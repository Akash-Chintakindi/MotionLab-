import { useState } from "react";
import { RichText } from "../RichText";
import { Leaderboard } from "./Leaderboard";
import { gradeQuestion, type QuizAnswer } from "../../lib/quiz";
import {
  answerPoints,
  QUESTION_SECONDS,
  type LivePlayer,
} from "../../lib/liveGame";
import type { BankQuestion } from "../../content/practiceBank/types";

export function QuestionStage({
  question,
  role,
  phase,
  meUid,
  questionNumber,
  totalQuestions,
  secondsLeft,
  questionStartedAt,
  players,
  answeredCount,
  totalPlayers,
  onAnswered,
  onReveal,
  onNext,
  isLast,
}: {
  question: BankQuestion;
  role: "host" | "player";
  phase: "question" | "reveal";
  meUid?: string;
  questionNumber: number;
  totalQuestions: number;
  secondsLeft: number;
  questionStartedAt: number;
  players: LivePlayer[];
  answeredCount: number;
  totalPlayers: number;
  onAnswered: (correct: boolean, points: number) => void;
  onReveal: () => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const [selected, setSelected] = useState("");
  const [answered, setAnswered] = useState(false);
  const [myCorrect, setMyCorrect] = useState<boolean | null>(null);
  const [myPoints, setMyPoints] = useState(0);

  const submit = (answer: QuizAnswer, picked: string) => {
    if (answered) return;
    const correct = gradeQuestion(question, answer);
    const points = answerPoints(correct, Date.now() - questionStartedAt);
    setSelected(picked);
    setAnswered(true);
    setMyCorrect(correct);
    setMyPoints(points);
    onAnswered(correct, points);
  };

  const isReveal = phase === "reveal";
  const pctLeft = Math.round((secondsLeft / QUESTION_SECONDS) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-500">
        <span>
          Question {questionNumber} / {totalQuestions}
        </span>
        {!isReveal && (
          <span data-testid="live-timer" className="tabular-nums">
            {secondsLeft}s
          </span>
        )}
      </div>

      {!isReveal && (
        <>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-500 ease-linear"
              style={{ width: `${pctLeft}%` }}
            />
          </div>
          {role === "player" && !answered && (
            <p className="text-center text-xs font-medium text-slate-400">
              Answer fast — up to 1000 points, less as the clock runs.
            </p>
          )}
        </>
      )}

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <p className="text-xl font-medium leading-snug text-slate-800">
          <RichText>{question.prompt}</RichText>
        </p>

        {question.type === "multipleChoice" ? (
          <div className="mt-4 space-y-2.5">
            {(question.options ?? []).map((opt) => {
              const isCorrect = opt.id === question.correctOptionId;
              const isMine = selected === opt.id;
              const tone = isReveal
                ? isCorrect
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500"
                  : isMine
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white text-slate-500"
                : isMine
                  ? "border-brand-500 bg-brand-50 font-semibold text-brand-800 ring-1 ring-brand-500"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300";
              const interactive = role === "player" && !answered && !isReveal;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!interactive}
                  data-testid={`live-opt-${opt.id}`}
                  onClick={() =>
                    interactive &&
                    submit({ kind: "option", optionId: opt.id }, opt.id)
                  }
                  className={`block w-full rounded-xl border px-4 py-3 text-left text-base transition ${tone} ${
                    interactive ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <RichText>{opt.label}</RichText>
                  {isReveal && isCorrect && <span className="ml-2">✅</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <NumericAnswer
            question={question}
            role={role}
            answered={answered}
            isReveal={isReveal}
            selected={selected}
            onSubmit={(val) => submit({ kind: "numeric", value: val }, val)}
          />
        )}

        {/* Player status line */}
        {role === "player" && !isReveal && answered && (
          <p
            className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-600"
            data-testid="live-answer-locked"
          >
            Answer locked in — hang tight…
          </p>
        )}

        {/* Host status line */}
        {role === "host" && !isReveal && (
          <p className="mt-4 text-center text-sm font-semibold text-slate-500">
            {answeredCount} / {totalPlayers} answered
          </p>
        )}
      </div>

      {isReveal && (
        <>
          {role === "player" && myCorrect !== null && (
            <div
              className={[
                "rounded-2xl px-4 py-3 text-center text-base font-bold",
                myCorrect
                  ? "animate-score-pop bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
              ].join(" ")}
            >
              {myCorrect
                ? `+${myPoints.toLocaleString()} points!`
                : "No points this round"}
            </div>
          )}
          {role === "player" && myCorrect === null && (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-500">
              You didn't answer in time.
            </div>
          )}
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
            <Leaderboard players={players} meUid={meUid} count={5} />
          </div>
        </>
      )}

      {/* Host controls */}
      {role === "host" && (
        <div className="flex justify-end">
          {!isReveal ? (
            <button
              type="button"
              onClick={onReveal}
              data-testid="live-reveal"
              className="rounded-xl bg-slate-900 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-700"
            >
              Reveal answers
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              data-testid="live-next"
              className="rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              {isLast ? "Finish & show podium" : "Next question"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NumericAnswer({
  question,
  role,
  answered,
  isReveal,
  selected,
  onSubmit,
}: {
  question: BankQuestion;
  role: "host" | "player";
  answered: boolean;
  isReveal: boolean;
  selected: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  if (isReveal) {
    return (
      <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800 ring-1 ring-emerald-200">
        <span className="font-semibold">Answer: </span>
        {question.value}
        {question.unit ? ` ${question.unit}` : ""}
        {role === "player" && selected !== "" && (
          <span className="ml-2 text-sm text-slate-500">(you said {selected})</span>
        )}
      </div>
    );
  }

  if (role === "host") {
    return (
      <p className="mt-4 text-sm text-slate-400">
        Players are entering a numeric answer…
      </p>
    );
  }

  return (
    <form
      className="mt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!answered && value.trim()) onSubmit(value.trim());
      }}
    >
      <div className="flex items-stretch gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          disabled={answered}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Your numeric answer"
          placeholder="Your answer"
          data-testid="live-numeric"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50"
        />
        {question.unit && (
          <span className="flex items-center rounded-xl bg-slate-100 px-3 text-base font-medium text-slate-600">
            <RichText>{question.unit}</RichText>
          </span>
        )}
      </div>
      <button
        type="submit"
        disabled={answered || !value.trim()}
        data-testid="live-submit"
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
      >
        Lock in answer
      </button>
    </form>
  );
}
