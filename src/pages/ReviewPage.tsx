import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Spinner } from "../components/Spinner";
import { RichText } from "../components/RichText";
import { useMastery } from "../services/masteryStore";
import { getGameQuestion } from "../ai/practiceQuestion";
import { practiceTopics } from "../ai/topics";
import { course } from "../content/course";
import { gradeQuestion, type QuizAnswer } from "../lib/quiz";
import type { BankDifficulty, BankQuestion } from "../content/practiceBank/types";

// How many topics a single review session covers at most.
const MAX_SESSION = 8;
// When nothing is strictly "due", review this many of the weakest topics anyway.
const FALLBACK_COUNT = 5;

type Phase = "loading" | "question" | "feedback" | "done" | "empty";

/** Map a topic's mastery tier to the difficulty we quiz it at. */
function difficultyFor(mastery: number, attempts: number): BankDifficulty {
  if (attempts === 0 || mastery < 35) return "easy";
  if (mastery < 70) return "medium";
  return "hard";
}

export default function ReviewPage() {
  const { map, dueTopicIds, record } = useMastery();
  const topics = useMemo(() => practiceTopics(), []);
  const topicById = useMemo(
    () => new Map(topics.map((t) => [t.id, t] as const)),
    [topics],
  );
  const titleById = useMemo(
    () => new Map(course.lessons.map((l) => [l.id, l.title] as const)),
    [],
  );

  // Freeze the queue once on mount so it doesn't reshuffle as we record results.
  const queueRef = useRef<string[] | null>(null);
  if (queueRef.current === null) {
    const due = dueTopicIds.slice(0, MAX_SESSION);
    if (due.length > 0) {
      queueRef.current = due;
    } else {
      // Nothing due → review the weakest practiced topics; if the learner is
      // brand new, fall back to the first few lessons so review is never empty.
      const practiced = course.lessons
        .map((l) => ({ id: l.id, m: map[l.id] }))
        .filter((x) => x.m && x.m.attempts > 0)
        .sort((a, b) => (a.m!.mastery ?? 0) - (b.m!.mastery ?? 0))
        .map((x) => x.id);
      const base =
        practiced.length > 0
          ? practiced
          : course.lessons.map((l) => l.id);
      queueRef.current = base.slice(0, FALLBACK_COUNT);
    }
  }
  const queue = queueRef.current;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(queue.length === 0 ? "empty" : "loading");
  const [question, setQuestion] = useState<BankQuestion | null>(null);
  const [topicId, setTopicId] = useState<string>("");
  const [lastCorrect, setLastCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const reqRef = useRef(0);

  const loadAt = useCallback(
    (i: number) => {
      if (i >= queue.length) {
        setPhase("done");
        return;
      }
      const tId = queue[i];
      const topic = topicById.get(tId);
      if (!topic) {
        setPhase("done");
        return;
      }
      const entry = map[tId];
      const difficulty = difficultyFor(entry?.mastery ?? 0, entry?.attempts ?? 0);
      const reqId = (reqRef.current += 1);
      setTopicId(tId);
      setPhase("loading");
      void getGameQuestion({ difficulty, topics: [topic] }).then((res) => {
        if (reqId !== reqRef.current) return;
        if (!res) {
          // Skip a topic we couldn't fetch rather than dead-ending the session.
          setIndex(i + 1);
          loadAt(i + 1);
          return;
        }
        setQuestion(res.question);
        setPhase("question");
      });
    },
    // map/topicById are stable enough for a frozen queue; difficulty reads live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queue],
  );

  useEffect(() => {
    if (queue.length > 0) loadAt(0);
    // Run once for the frozen queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback(
    (answer: QuizAnswer) => {
      if (!question) return;
      const correct = gradeQuestion(question, answer);
      record(topicId, correct, question.difficulty);
      setLastCorrect(correct);
      if (correct) setCorrectCount((c) => c + 1);
      setPhase("feedback");
    },
    [question, topicId, record],
  );

  const next = useCallback(() => {
    const i = index + 1;
    setIndex(i);
    loadAt(i);
  }, [index, loadAt]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-5">
          <Link
            to="/"
            className="mb-3 inline-block text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Course
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Review
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Spaced practice on the topics you most need — answers update your
            mastery.
          </p>
        </header>

        {phase === "empty" && (
          <EmptyState />
        )}

        {phase !== "empty" && phase !== "done" && (
          <p
            className="mb-3 text-sm font-medium text-slate-500"
            data-testid="review-progress"
          >
            Topic {Math.min(index + 1, queue.length)} of {queue.length}
            {titleById.get(topicId) ? ` · ${titleById.get(topicId)}` : ""}
          </p>
        )}

        {phase === "loading" && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner label="Loading a review question…" />
          </div>
        )}

        {(phase === "question" || phase === "feedback") && question && (
          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200" data-testid="review-card">
            <p className="text-base font-medium text-slate-800">
              <RichText>{question.prompt}</RichText>
            </p>
            {phase === "question" ? (
              <AnswerForm key={question.id} question={question} onSubmit={submit} />
            ) : (
              <Feedback
                question={question}
                correct={lastCorrect}
                onNext={next}
                last={index + 1 >= queue.length}
              />
            )}
          </div>
        )}

        {phase === "done" && (
          <DoneState correct={correctCount} total={queue.length} />
        )}
      </div>
    </AppShell>
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
                data-testid={`review-opt-${opt.id}`}
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
          data-testid="review-submit"
          onClick={() => onSubmit({ kind: "option", optionId: selected })}
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
        if (selected.trim()) onSubmit({ kind: "numeric", value: selected.trim() });
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
          data-testid="review-numeric"
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
        data-testid="review-submit"
        className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        Submit
      </button>
    </form>
  );
}

function Feedback({
  question,
  correct,
  onNext,
  last,
}: {
  question: BankQuestion;
  correct: boolean;
  onNext: () => void;
  last: boolean;
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
        aria-live="polite"
      >
        {correct ? "Correct!" : "Not quite."}
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 p-4 text-base leading-relaxed text-slate-700">
        <RichText>{question.explanation}</RichText>
      </div>
      <button
        type="button"
        data-testid="review-next"
        onClick={onNext}
        className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-700"
      >
        {last ? "Finish review" : "Next topic"}
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200"
      data-testid="review-empty"
    >
      <div className="text-4xl" aria-hidden>
        ✅
      </div>
      <h2 className="mt-2 font-display text-xl font-bold text-ink">
        Nothing to review yet
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Play the Lab or a game to build up your topic mastery — then come back
        for spaced review.
      </p>
      <Link
        to="/lab"
        className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-brand-700"
      >
        Go to the Lab
      </Link>
    </div>
  );
}

function DoneState({ correct, total }: { correct: number; total: number }) {
  return (
    <div
      className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200"
      data-testid="review-done"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-500">
        Review complete
      </p>
      <div className="mt-2 font-display text-5xl font-bold tabular-nums text-ink">
        {correct}/{total}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Mastery and review schedule updated.
      </p>
      <Link
        to="/"
        className="mt-5 inline-block rounded-xl bg-brand-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-brand-700"
      >
        Back to course
      </Link>
    </div>
  );
}
