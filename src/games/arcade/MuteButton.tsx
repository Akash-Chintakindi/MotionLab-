interface Props {
  muted: boolean;
  onToggle: () => void;
  className?: string;
}

/** Small speaker toggle for the arcade games. */
export function MuteButton({ muted, onToggle, className }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={muted ? "Unmute" : "Mute"}
      aria-pressed={muted}
      data-testid="mute-button"
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg text-white transition hover:bg-white/25 ${
        className ?? ""
      }`}
    >
      <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
    </button>
  );
}
