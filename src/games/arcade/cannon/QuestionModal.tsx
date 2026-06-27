import { useEffect, useRef, useState } from "react";
import { RichText } from "../../../components/RichText";
import { gradeQuestion, type QuizAnswer } from "../../../lib/quiz";
import type {
  BankDifficulty,
  BankQuestion,
} from "../../../content/practiceBank/types";
import type { RewardChoice } from "./cannonPhysics";

interface Props {
  /** Difficulty the GAME chose from how close the duel is. */
  difficulty: BankDifficulty;
  /** False when the player already holds the max shield (offer ammo only). */
  canTakeShield: boolean;
  /**
   * Pulls a question for the chosen difficulty (parent tracks exclusions).
   * Async because it may call the AI Cloud Function when the AI toggle is on.
   */
  onPickQuestion: (d: BankDifficulty) => Promise<BankQuestion | null>;
  /** Reports the graded result (parent handles sfx + the AI's wrong-answer shield). */
  onAnswered: (correct: boolean) => void;
  /** Correct answer: the player banks their chosen reward. */
  onChooseReward: (choice: RewardChoice) => void;
  /** Closes the modal and resumes the duel. */
  onClose: () => void;
}

type Stage = "loading" | "answer" | "reward" | "feedback";

const DIFF_LABEL: Record<BankDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const DIFF_TONE: Record<BankDifficulty, string> = {
  easy: "text-emerald-300",
  medium: "text-amber-300",
  hard: "text-rose-300",
};

export function QuestionModal({
  difficulty,
  canTakeShield,
  onPickQuestion,
  onAnswered,
  onChooseReward,
  onClose,
}: Props) {
  const [question, setQuestion] = useState<BankQuestion | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [numeric, setNumeric] = useState("");
  const startedRef = useRef(false);

  // Fetch the question once on mount (may be an async AI call). The duel is
  // already paused, so the network round-trip costs no game time.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let active = true;
    void onPickQuestion(difficulty).then((q) => {
      if (!active) return;
      if (!q) {
        // No question available — never soft-lock; resume the duel.
        onClose();
        return;
      }
      setQuestion(q);
      setStage("answer");
    });
    return () => {
      active = false;
    };
  }, [difficulty, onPickQuestion, onClose]);

  function submit(answer: QuizAnswer) {
    if (!question) return;
    const isCorrect = gradeQuestion(question, answer);
    onAnswered(isCorrect);
    setStage(isCorrect ? "reward" : "feedback");
  }

  function takeReward(choice: RewardChoice) {
    onChooseReward(choice);
    onClose();
  }

  return (
    <div
      data-testid="cannon-question"
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900/95 p-5 text-left shadow-2xl ring-1 ring-white/15">
        <p className="text-center font-mono text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
          Supply run ·{" "}
          <span className={DIFF_TONE[difficulty]}>{DIFF_LABEL[difficulty]}</span>
        </p>

        {stage === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
            <p className="text-sm font-semibold text-slate-300">
              Loading a {DIFF_LABEL[difficulty].toLowerCase()} question…
            </p>
          </div>
        )}

        {stage === "answer" && question && (
          <AnswerStage
            question={question}
            numeric={numeric}
            setNumeric={setNumeric}
            onSubmit={submit}
          />
        )}

        {stage === "reward" && question && (
          <div className="mt-2 text-center">
            <p className="font-display text-2xl font-bold text-emerald-300">
              Direct hit on the question!
            </p>
            <p className="mt-1 text-sm text-slate-300">Choose your supply.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="cannon-reward-ammo"
                onClick={() => takeReward("ammo")}
                className="flex flex-col items-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-3 py-4 font-bold text-white shadow-lg transition active:scale-95"
              >
                <span className="text-2xl" aria-hidden>
                  🎯
                </span>
                <span className="mt-1 text-sm">+1 Cannonball</span>
              </button>
              <button
                type="button"
                data-testid="cannon-reward-shield"
                onClick={() => canTakeShield && takeReward("shield")}
                disabled={!canTakeShield}
                className="flex flex-col items-center rounded-xl bg-gradient-to-b from-sky-400 to-sky-600 px-3 py-4 font-bold text-white shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="text-2xl" aria-hidden>
                  🛡️
                </span>
                <span className="mt-1 text-sm">
                  {canTakeShield ? "+1 Shield" : "Shield full"}
                </span>
              </button>
            </div>
            <p className="mt-4 rounded-xl bg-black/30 p-3 text-left text-sm leading-relaxed text-slate-200">
              <RichText>{question.explanation}</RichText>
            </p>
          </div>
        )}

        {stage === "feedback" && question && (
          <div className="mt-2 text-center">
            <p className="font-display text-2xl font-bold text-rose-300">
              Misfire!
            </p>
            <p className="mt-1 text-sm text-slate-300">
              The rival fortifies — they gain a shield.
            </p>
            <p className="mt-3 rounded-xl bg-black/30 p-3 text-left text-sm leading-relaxed text-slate-200">
              <RichText>{question.explanation}</RichText>
            </p>
            <button
              type="button"
              data-testid="cannon-question-continue"
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 px-5 py-3 font-display font-bold text-white shadow-lg transition active:scale-95"
            >
              Back to the duel ▸
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
}: {
  question: BankQuestion;
  numeric: string;
  setNumeric: (v: string) => void;
  onSubmit: (a: QuizAnswer) => void;
}) {
  return (
    <>
      <h3 className="mt-1 text-center font-display text-lg font-bold text-white">
        Answer to resupply
      </h3>
      <p className="mt-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
        {question.difficulty} · {question.category}
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
              data-testid={`cannon-opt-${o.id}`}
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
            data-testid="cannon-numeric"
            className="min-w-0 flex-1 rounded-xl bg-slate-800 px-4 py-3 text-base font-semibold text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {question.unit && (
            <span className="text-sm font-semibold text-slate-400">
              {question.unit}
            </span>
          )}
          <button
            type="submit"
            data-testid="cannon-numeric-submit"
            className="rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 px-4 py-3 font-bold text-white shadow-lg transition active:scale-95"
          >
            Fire
          </button>
        </form>
      )}
    </>
  );
}
