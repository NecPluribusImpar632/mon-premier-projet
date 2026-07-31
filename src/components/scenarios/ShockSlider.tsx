interface ShockSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

export function ShockSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "%",
  onChange,
}: ShockSliderProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-sm text-ink">
        <span>{label}</span>
        <span className="font-mono tabular-nums">
          {value > 0 ? "+" : ""}
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: "var(--color-emerald)" }}
      />
    </label>
  );
}
