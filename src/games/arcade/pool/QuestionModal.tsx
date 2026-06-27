import { useState } from "react";
import { RichText } from "../../../components/RichText";
import { gradeQuestion, type QuizAnswer } from "../../../lib/quiz";
import type { QuizQuestion } from "../../../types/content";
import type { BankDifficulty } from "../../../content/practiceBank/types";
import { PERK_INFO, PERK_ORDER, QUESTION_POINTS, type PerkKind } from "./poolPerks";

/**
 * A normalized question for the modal: it satisfies `QuizQuestion` (so the
 * existing `gradeQuestion` grades it) plus the chosen difficulty + where it came
 * from. The parent builds this from `getPracticeQuestion` (AI when the global
 * toggle is on, the static bank otherwise).
 */
export interface PoolQuestion extends QuizQuestion {
  difficulty: BankDifficulty;
  source: "ai" | "bank";
}

/** A perk offered as a reward, possibly disabled (e.g. no clear shot to assist). */
export interface PerkOption {
  kind: PerkKind;
  enabled: boolean;
  /** Shown when disabled, e.g. "No clear shot". */
  reason?: string;
}

interface Props {
  /** Fetches a question for the chosen difficulty (honors the AI toggle). */
  onPickQuestion: (d: BankDifficulty) => Promise<PoolQuestion | null>;
  /** Reports the graded result so the parent can award score + play sfx. */
  onAnswered: (correct: boolean, d: BankDifficulty) => void;
  /** Correct answer: the player banks one perk for this turn. */
  onChoosePerk: (perk: PerkKind) => void;
  /** Perks available to choose from this turn. */
  perkOptions: PerkOption[];
  /** Skip the question entirely (no perk) and go straight to aiming. */
  onSkip: () => void;
  /** Close the modal and resume play. */
  onClose: () => void;
}

type Stage = "pick" | "loading" | "answer" | "reward" | "feedback";

const DIFFS: { id: BankDifficulty; label: string; tone: string }[] = [
  { id: "easy", label: "Easy", tone: "from-emerald-400 to-emerald-600" },
  { id: "medium", label: "Medium", tone: "from-amber-400 to-amber-600" },
  { id: "hard", label: "Hard", tone: "from-rose-400 to-rose-600" },
];

const DIFF_TONE: Record<BankDifficulty, string> = {
  easy: "text-emerald-300",
  medium: "text-amber-300",
  hard: "text-rose-300",
};

export function QuestionModal({
  onPickQuestion,
  onAnswered,
  onChoosePerk,
  perkOptions,
  onSkip,
  onClose,
}: Props) {
  const [stage, setStage] = useState<Stage>("pick");
  const [difficulty, setDifficulty] = useState<BankDifficulty>("medium");
  const [question, setQuestion] = useState<PoolQuestion | null>(null);
  const [numeric, setNumeric] = useState("");

  async function pick(d: BankDifficulty) {
    setDifficulty(d);
    setStage("loading");
    const q = await onPickQuestion(d);
    if (!q) {
      // Never soft-lock: if no question is available, skip the perk and play on.
      onSkip();
      onClose();
      return;
    }
    setQuestion(q);
    setNumeric("");
    setStage("answer");
  }

  function submit(answer: QuizAnswer) {
    if (!question) return;
    const isCorrect = gradeQuestion(question, answer);
    onAnswered(isCorrect, difficulty);
    setStage(isCorrect ? "reward" : "feedback");
  }

  function skip() {
    onSkip();
    onClose();
  }

  function takePerk(kind: PerkKind) {
    onChoosePerk(kind);
    onClose();
  }

  return (
    <div
      data-testid="pool-question-modal"
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900/95 p-5 text-left shadow-2xl ring-1 ring-white/15">
        {stage === "pick" && (
          <>
            <p className="text-center font-mono text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
              Pre-shot physics
            </p>
            <h3 className="mt-1 text-center font-display text-xl font-bold text-white">
              Answer for a perk
            </h3>
            <p className="mt-1 text-center text-sm text-slate-300">
              Pick a difficulty — a correct answer earns one perk for this turn
              (and bonus points). Harder questions score more.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {DIFFS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  data-testid={`pool-q-difficulty-${d.id}`}
                  onClick={() => pick(d.id)}
                  className={`flex flex-col items-center rounded-xl bg-gradient-to-b ${d.tone} px-2 py-3 font-bold text-white shadow-lg transition active:scale-95`}
                >
                  <span className="text-sm">{d.label}</span>
                  <span className="mt-0.5 text-xs font-semibold text-white/90">
                    +{QUESTION_POINTS[d.id]}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              data-testid="pool-q-skip"
              onClick={skip}
              className="mt-3 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/20"
            >
              Skip — just shoot
            </button>
          </>
        )}

        {stage === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
            <p className="text-sm font-semibold text-slate-300">
              Loading a {difficulty} question…
            </p>
          </div>
        )}

        {stage === "answer" && question && (
          <AnswerStage
            question={question}
            numeric={numeric}
            setNumeric={setNumeric}
            onSubmit={submit}
            onSkip={skip}
          />
        )}

        {stage === "reward" && question && (
          <div className="mt-1 text-center">
            <p className="font-display text-2xl font-bold text-emerald-300">
              Correct! +{QUESTION_POINTS[difficulty]}
            </p>
            <p className="mt-1 text-sm text-slate-300">Choose your perk for this turn.</p>
            <div className="mt-4 grid gap-2">
              {PERK_ORDER.map((kind) => {
                const opt = perkOptions.find((o) => o.kind === kind);
                const enabled = opt ? opt.enabled : true;
                const info = PERK_INFO[kind];
                return (
                  <button
                    key={kind}
                    type="button"
                    data-testid={`pool-perk-${kind}`}
                    onClick={() => enabled && takePerk(kind)}
                    disabled={!enabled}
                    className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-left ring-1 ring-white/10 transition hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="text-2xl" aria-hidden>
                      {info.icon}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-white">
                        {info.label}
                      </span>
                      <span className="block text-xs text-slate-300">
                        {enabled ? info.blurb : opt?.reason ?? "Unavailable"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 rounded-xl bg-black/30 p-3 text-left text-sm leading-relaxed text-slate-200">
              <RichText>{question.explanation}</RichText>
            </p>
          </div>
        )}

        {stage === "feedback" && question && (
          <div className="mt-1 text-center">
            <p className="font-display text-2xl font-bold text-rose-300">
              Not quite — no perk
            </p>
            <p className="mt-3 rounded-xl bg-black/30 p-3 text-left text-sm leading-relaxed text-slate-200">
              <RichText>{question.explanation}</RichText>
            </p>
            <button
              type="button"
              data-testid="pool-q-continue"
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-5 py-3 font-display font-bold text-amber-950 shadow-lg transition active:scale-95"
            >
              Back to the table ▸
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AnswerStage({
  question,
  numeric,
  setNumeric,
  onSubmit,
  onSkip,
}: {
  question: PoolQuestion;
  numeric: string;
  setNumeric: (v: string) => void;
  onSubmit: (a: QuizAnswer) => void;
  onSkip: () => void;
}) {
  return (
    <>
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
        {question.difficulty} ·{" "}
        <span className={DIFF_TONE[question.difficulty]}>
          {question.source === "ai" ? "AI question" : "Practice bank"}
        </span>
      </p>
      <p className="mt-2 text-base font-medium leading-relaxed text-white">
        <RichText>{question.prompt}</RichText>
      </p>

      {question.type === "multipleChoice" && question.options ? (
        <div className="mt-4 grid gap-2">
          {question.options.map((o) => (
            <button
              key={o.id}
              type="button"
              data-testid={`pool-q-opt-${o.id}`}
              onClick={() => onSubmit({ kind: "option", optionId: o.id })}
              className="rounded-xl bg-slate-800 px-4 py-3 text-left text-sm font-semibold text-slate-100 ring-1 ring-white/10 transition hover:bg-slate-700 active:scale-[0.98]"
            >
              <RichText>{o.label}</RichText>
            </button>
          ))}
        </div>
      ) : (
        <form
          className="mt-4 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (numeric.trim() === "") return;
            onSubmit({ kind: "numeric", value: numeric });
          }}
        >
          <input
            type="number"
            step="any"
            inputMode="decimal"
            autoFocus
            value={numeric}
            onChange={(e) => setNumeric(e.target.value)}
            placeholder={question.placeholder ?? "Your answer"}
            data-testid="pool-q-numeric"
            className="min-w-0 flex-1 rounded-xl bg-slate-800 px-4 py-3 text-base font-semibold text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {question.unit && (
            <span className="text-sm font-semibold text-slate-400">{question.unit}</span>
          )}
          <button
            type="submit"
            data-testid="pool-q-numeric-submit"
            className="rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-3 font-bold text-amber-950 shadow-lg transition active:scale-95"
          >
            Submit
          </button>
        </form>
      )}

      <button
        type="button"
        data-testid="pool-q-skip"
        onClick={onSkip}
        className="mt-3 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/20"
      >
        Skip — just shoot
      </button>
    </>
  );
}
