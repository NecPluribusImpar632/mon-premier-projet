"use client";

interface SyncedRangeProps {
  value: number;
  min: number;
  max: number;
  step: number;
  /** Fired on every move, for live recalculation. */
  onChange: (value: number) => void;
  /** Fired once when the thumb is released (pointer, touch or keyboard),
   * for persistence. */
  onCommit: () => void;
  ariaLabel: string;
  className?: string;
}

/**
 * A bare range input kept in sync with a numeric field above it: the field
 * stays the place for an exact value, the slider is for exploring. A value
 * typed outside the slider's bounds simply pins the thumb at the edge.
 */
export function SyncedRange({
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  ariaLabel,
  className = "",
}: SyncedRangeProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={Math.min(max, Math.max(min, value))}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerUp={onCommit}
      onTouchEnd={onCommit}
      onKeyUp={(e) => {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)) {
          onCommit();
        }
      }}
      className={`w-full ${className}`}
      style={{ accentColor: "var(--color-emerald)" }}
    />
  );
}
