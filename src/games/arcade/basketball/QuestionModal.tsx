import { useState } from "react";
import { RichText } from "../../../components/RichText";
import { gradeQuestion, type QuizAnswer } from "../../../lib/quiz";
import type { BankDifficulty, BankQuestion } from "../../../content/practiceBank/types";
import { TIME_BONUS, WRONG_PENALTY } from "./basketballPhysics";

interface Props {
  /** Pulls a question for the chosen difficulty (parent tracks exclusions). */
  onPickQuestion: (d: BankDifficulty) => BankQuestion | null;
  /** Reports the graded result so the parent can adjust the clock + sfx. */
  onAnswered: (correct: boolean, d: BankDifficulty) => void;
  /** Closes the modal and resumes play. */
  onClose: () => void;
}

type Stage = "pick" | "answer" | "feedback";

const DIFFS: { id: BankDifficulty; label: string; tone: string }[] = [
  { id: "easy", label: "Easy", tone: "from-emerald-400 to-emerald-600" },
  { id: "medium", label: "Medium", tone: "from-amber-400 to-amber-600" },
  { id: "hard", label: "Hard", tone: "from-rose-400 to-rose-600" },
];

export function QuestionModal({ onPickQuestion, onAnswered, onClose }: Props) {
  const [stage, setStage] = useState<Stage>("pick");
  const [difficulty, setDifficulty] = useState<BankDifficulty>("medium");
  const [question, setQuestion] = useState<BankQuestion | null>(null);
  const [numeric, setNumeric] = useState("");
  const [correct, setCorrect] = useState(false);

  function pick(d: BankDifficulty) {
    const q = onPickQuestion(d);
    if (!q) {
      onClose();
      return;
    }
    setDifficulty(d);
    setQuestion(q);
    setNumeric("");
    setStage("answer");
  }

  function submit(answer: QuizAnswer) {
    if (!question) return;
    const isCorrect = gradeQuestion(question, answer);
    setCorrect(isCorrect);
    setStage("feedback");
    onAnswered(isCorrect, difficulty);
  }

  return (
    <div
      data-testid="bball-question"
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900/95 p-5 text-left shadow-2xl ring-1 ring-white/15">
        {stage === "pick" && (
          <>
            <p className="text-center font-mono text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
              Buzzer beater bonus
            </p>
            <h3 className="mt-1 text-center font-display text-xl font-bold text-white">
              Bank extra seconds
            </h3>
            <p className="mt-1 text-center text-sm text-slate-300">
              Pick a difficulty — harder questions add more time, but a wrong
              answer costs you {WRONG_PENALTY}s.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {DIFFS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  data-testid={`bball-diff-${d.id}`}
                  onClick={() => pick(d.id)}
                  className={`flex flex-col items-center rounded-xl bg-gradient-to-b ${d.tone} px-2 py-3 font-bold text-white shadow-lg transition active:scale-95`}
                >
                  <span className="text-sm">{d.label}</span>
                  <span className="mt-0.5 text-xs font-semibold text-white/90">
                    +{TIME_BONUS[d.id]}s
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {stage === "answer" && question && (
          <AnswerStage
            question={question}
            numeric={numeric}
            setNumeric={setNumeric}
            onSubmit={submit}
          />
        )}

        {stage === "feedback" && question && (
          <div className="text-center">
            <p
              className={`font-display text-2xl font-bold ${
                correct ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {correct ? `Swish! +${TIME_BONUS[difficulty]}s` : `Brick! −${WRONG_PENALTY}s`}
            </p>
            <p className="mt-3 rounded-xl bg-black/30 p-3 text-left text-sm leading-relaxed text-slate-200">
              <RichText>{question.explanation}</RichText>
            </p>
            <button
              type="button"
              data-testid="bball-question-continue"
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 px-5 py-3 font-display font-bold text-white shadow-lg transition active:scale-95"
            >
              Back to the court ▸
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
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
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
              data-testid={`bball-opt-${o.id}`}
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
            data-testid="bball-numeric"
            className="min-w-0 flex-1 rounded-xl bg-slate-800 px-4 py-3 text-base font-semibold text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {question.unit && (
            <span className="text-sm font-semibold text-slate-400">
              {question.unit}
            </span>
          )}
          <button
            type="submit"
            data-testid="bball-numeric-submit"
            className="rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 px-4 py-3 font-bold text-white shadow-lg transition active:scale-95"
          >
            Submit
          </button>
        </form>
      )}
    </>
  );
}
