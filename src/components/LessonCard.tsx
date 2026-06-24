import { Link } from "react-router-dom";
import type { Lesson } from "../types/content";
import type { LessonStatus } from "../types/progress";

interface Props {
  lesson: Lesson;
  status: LessonStatus;
  unlocked: boolean;
  mastery?: number;
  prerequisiteTitle?: string;
}

export function LessonCard({
  lesson,
  status,
  unlocked,
  mastery,
  prerequisiteTitle,
}: Props) {
  const locked = !unlocked;

  const badge =
    status === "completed"
      ? { text: "Completed", cls: "bg-emerald-100 text-emerald-700" }
      : status === "in_progress"
        ? { text: "In progress", cls: "bg-brand-100 text-brand-700" }
        : locked
          ? { text: "Locked", cls: "bg-slate-200 text-slate-500" }
          : { text: "Start", cls: "bg-amber-100 text-amber-700" };

  const inner = (
    <div
      className={[
        "flex items-center gap-4 rounded-2xl border p-4 transition",
        locked
          ? "border-slate-200 bg-slate-100 opacity-80"
          : "border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold",
          status === "completed"
            ? "bg-emerald-500 text-white"
            : locked
              ? "bg-slate-300 text-slate-600"
              : "bg-brand-600 text-white",
        ].join(" ")}
        aria-hidden
      >
        {locked ? "🔒" : status === "completed" ? "✓" : lesson.order}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-ink">{lesson.title}</h3>
        </div>
        <p className="truncate text-sm text-slate-500">{lesson.subtitle}</p>
        {locked && prerequisiteTitle && (
          <p className="mt-1 text-xs text-slate-500">
            Complete <span className="font-medium">{prerequisiteTitle}</span> to
            unlock.
          </p>
        )}
        {!locked && typeof mastery === "number" && status === "completed" && (
          <p className="mt-1 text-xs text-emerald-600">
            Mastery {Math.round(mastery * 100)}%
          </p>
        )}
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}
      >
        {badge.text}
      </span>
    </div>
  );

  if (locked) {
    return (
      <div aria-disabled className="cursor-not-allowed">
        {inner}
      </div>
    );
  }

  return (
    <Link to={`/lesson/${lesson.id}`} className="block">
      {inner}
    </Link>
  );
}
