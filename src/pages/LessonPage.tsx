import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getLesson } from "../content/course";
import { useLessonEngine, type CompletionResult } from "../hooks/useLessonEngine";
import type { LessonSummary } from "../lib/lessonEngine";
import { AppShell } from "../components/AppShell";
import { Spinner } from "../components/Spinner";
import { StepRenderer } from "../components/steps/StepRenderer";
import { Feedback } from "../components/feedback/Feedback";
import { RichText } from "../components/RichText";
import { getMilestone } from "../lib/milestones";

export default function LessonPage() {
  const { lessonId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const lesson = getLesson(lessonId);
  const engine = useLessonEngine(user, lesson);

  const steps = lesson?.steps ?? [];
  const step = steps[engine.index];

  if (!lesson) {
    return (
      <AppShell>
        <Empty title="Lesson not found">
          <Link to="/" className="font-semibold text-brand-600">
            Back to course
          </Link>
        </Empty>
      </AppShell>
    );
  }

  if (!engine.ready) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner label="Loading lesson…" />
        </div>
      </AppShell>
    );
  }

  if (!engine.authorized) {
    return (
      <AppShell>
        <Empty title="This lesson is locked">
          <p className="mb-4 text-slate-500">
            Finish the earlier lessons to unlock it.
          </p>
          <Link to="/" className="font-semibold text-brand-600">
            Back to course
          </Link>
        </Empty>
      </AppShell>
    );
  }

  if (lesson.steps.length === 0) {
    return (
      <AppShell>
        <Empty title={lesson.title}>
          <p className="mb-4 text-slate-500">
            This lesson's interactive steps are coming soon.
          </p>
          <Link to="/" className="font-semibold text-brand-600">
            Back to course
          </Link>
        </Empty>
      </AppShell>
    );
  }

  if (engine.completion) {
    return (
      <AppShell streak={engine.completion.streak}>
        <CompletionScreen
          lessonTitle={lesson.title}
          result={engine.completion}
        />
      </AppShell>
    );
  }

  if (engine.phase === "summary" && engine.summary) {
    return (
      <AppShell>
        <SummaryScreen
          lessonTitle={lesson.title}
          summary={engine.summary}
          onReview={engine.onReview}
          onRestart={engine.onRestart}
        />
      </AppShell>
    );
  }

  const reviewing = engine.phase === "review";
  const showContinue = engine.isAuto || engine.locked;

  return (
    <AppShell>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-3 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Course
        </button>
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-2 font-semibold uppercase tracking-wide">
            {lesson.title}
            {reviewing && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                Review
              </span>
            )}
          </span>
          <span data-testid="step-counter">
            Step {engine.index + 1} of {steps.length}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${engine.progressPct}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        {engine.canGoBack && (
          <button
            type="button"
            data-testid="back-button"
            onClick={engine.onBack}
            className="mb-3 inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-700"
          >
            ← Previous step
          </button>
        )}
        <h2 className="mb-4 text-lg font-semibold leading-snug">
          <RichText>{step.prompt}</RichText>
        </h2>

        <StepRenderer
          key={step.id}
          step={step}
          locked={engine.locked}
          prefillCorrect={engine.prefillCorrect}
          onAnswer={engine.onAnswer}
        />

        <div className="mt-4 space-y-3">
          {engine.isAuto && step.feedback.correct && (
            <Feedback state="info" message={step.feedback.correct} />
          )}
          {!engine.isAuto && (
            <Feedback
              state={engine.feedback.state}
              message={engine.feedback.message}
              hint={engine.feedback.hint}
            />
          )}

          {showContinue && (
            <button
              type="button"
              data-testid="continue-button"
              onClick={engine.onContinue}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700"
            >
              {reviewing
                ? engine.isLastStep
                  ? "Back to summary"
                  : "Next"
                : engine.isLastStep
                  ? "Finish lesson"
                  : "Continue"}
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-xl font-bold">{title}</h1>
      {children}
    </div>
  );
}

function SummaryScreen({
  lessonTitle,
  summary,
  onReview,
  onRestart,
}: {
  lessonTitle: string;
  summary: LessonSummary;
  onReview: () => void;
  onRestart: () => void;
}) {
  const { masteryPct, totalGradable, firstTryCount, retriedCount } = summary;
  const ring =
    masteryPct >= 80
      ? "text-emerald-500"
      : masteryPct >= 50
        ? "text-amber-500"
        : "text-rose-500";

  return (
    <div data-testid="lesson-summary">
      <Link
        to="/"
        className="mb-4 inline-block text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        ← Course
      </Link>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-brand-600">
          Lesson complete
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
          {lessonTitle}
        </h1>

        <div className="mt-5 flex items-center gap-5">
          <MasteryDial pct={masteryPct} colorClass={ring} />
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-ink">{firstTryCount}</span>
              <span className="text-slate-500">solved first try</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="font-semibold text-ink">{retriedCount}</span>
              <span className="text-slate-500">took a few tries</span>
            </div>
            <div className="text-xs text-slate-400">
              {totalGradable} graded {totalGradable === 1 ? "step" : "steps"}
            </div>
          </div>
        </div>
      </div>

      {totalGradable > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">
            How you did
          </h2>
          <ul className="space-y-2">
            {summary.steps
              .filter((s) => s.gradable)
              .map((s) => (
                <li
                  key={s.id}
                  className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      s.outcome === "first-try"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                    aria-hidden
                  >
                    {s.outcome === "first-try" ? "✓" : "↻"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm leading-snug text-ink">
                      <RichText>{s.prompt}</RichText>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {s.outcome === "first-try"
                        ? "Nailed it first try"
                        : `Solved after ${s.attempts} attempts`}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          data-testid="review-button"
          onClick={onReview}
          className="flex-1 rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700"
        >
          Review answers
        </button>
        <button
          type="button"
          data-testid="restart-button"
          onClick={onRestart}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:border-slate-400"
        >
          Restart lesson
        </button>
      </div>

      <Link
        to="/"
        className="mt-5 block text-center text-sm font-semibold text-slate-500 hover:text-slate-700"
      >
        Back to course
      </Link>
    </div>
  );
}

function MasteryDial({ pct, colorClass }: { pct: number; colorClass: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <div className="relative h-[84px] w-[84px] shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-100"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={`${colorClass} transition-all`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-bold text-ink">{pct}%</span>
        <span className="text-[10px] font-medium uppercase text-slate-400">
          mastery
        </span>
      </div>
    </div>
  );
}

function CompletionScreen({
  lessonTitle,
  result,
}: {
  lessonTitle: string;
  result: CompletionResult;
}) {
  const nextTitle = result.unlockedLessonId
    ? getLesson(result.unlockedLessonId)?.title
    : null;
  return (
    <div
      data-testid="lesson-complete"
      className="flex min-h-[70vh] flex-col items-center justify-center text-center"
    >
      <div className="mb-4 text-6xl" aria-hidden>
        🎉
      </div>
      <h1 className="text-2xl font-bold">Lesson complete!</h1>
      <p className="mt-1 text-slate-500">{lessonTitle}</p>

      <div className="mt-6 flex gap-3">
        <Stat label="Mastery" value={`${Math.round(result.mastery * 100)}%`} />
        <Stat label="Day streak" value={`${result.streak} 🔥`} />
      </div>

      {result.earnedMilestones.length > 0 && (
        <div
          data-testid="earned-milestones"
          className="mt-6 w-full max-w-sm space-y-2"
        >
          <p className="text-sm font-semibold text-slate-600">
            New milestone{result.earnedMilestones.length > 1 ? "s" : ""}!
          </p>
          {result.earnedMilestones.map((id) => {
            const m = getMilestone(id);
            if (!m) return null;
            return (
              <div
                key={id}
                className="flex animate-pop-in items-center gap-3 rounded-xl bg-amber-50 px-4 py-2.5 text-left ring-1 ring-amber-200"
              >
                <span className="text-2xl" aria-hidden>
                  {m.emoji}
                </span>
                <span className="font-medium text-amber-900">{m.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {nextTitle && result.unlockedLessonId && (
        <div
          data-testid="unlock-next"
          className="mt-8 w-full max-w-sm rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200"
        >
          <p className="text-sm text-brand-800">Unlocked next lesson</p>
          <p className="mb-3 font-semibold text-ink">{nextTitle}</p>
          <Link
            to={`/lesson/${result.unlockedLessonId}`}
            className="block w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
          >
            Start next lesson
          </Link>
        </div>
      )}

      <Link
        to="/"
        className="mt-6 text-sm font-semibold text-slate-500 hover:text-slate-700"
      >
        Back to course
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-5 py-3 ring-1 ring-slate-200">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
