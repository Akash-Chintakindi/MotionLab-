import { RichText } from "../RichText";

export type FeedbackState = "correct" | "incorrect" | "info" | null;

interface Props {
  state: FeedbackState;
  message: string;
  hint?: string;
}

export function Feedback({ state, message, hint }: Props) {
  if (!state || !message) return null;

  const styles: Record<Exclude<FeedbackState, null>, string> = {
    correct: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    incorrect: "bg-amber-50 text-amber-900 ring-amber-200",
    info: "bg-brand-50 text-brand-800 ring-brand-200",
  };

  const label: Record<Exclude<FeedbackState, null>, string> = {
    correct: "Correct",
    incorrect: "Not quite",
    info: "Note",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`animate-pop-in rounded-xl px-4 py-3 text-[15px] ring-1 ${styles[state]}`}
    >
      <div className="text-base font-semibold">{label[state]}</div>
      <p className="mt-1 leading-relaxed">
        <RichText>{message}</RichText>
      </p>
      {state === "incorrect" && hint && (
        <p className="mt-2 text-[14px] leading-relaxed text-amber-800">
          <span className="font-semibold">Hint:</span> <RichText>{hint}</RichText>
        </p>
      )}
    </div>
  );
}
