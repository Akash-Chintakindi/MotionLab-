export function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-50" : ""}`}>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-mono text-slate-600">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-600 disabled:cursor-not-allowed"
        aria-label={label}
      />
    </label>
  );
}
