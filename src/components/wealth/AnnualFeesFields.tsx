"use client";

import {
  ANNUAL_FEES_LABELS,
  DEFAULT_ANNUAL_FEES_PCT,
  type AnnualFeesPct,
} from "@/lib/wealth/monteCarloAssumptions";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";

export const FEE_KEYS = Object.keys(ANNUAL_FEES_LABELS) as (keyof AnnualFeesPct)[];

export function feesAreDefault(fees: AnnualFeesPct): boolean {
  return FEE_KEYS.every((key) => fees[key] === DEFAULT_ANNUAL_FEES_PCT[key]);
}

interface AnnualFeesFieldsProps {
  fees: AnnualFeesPct;
  onChange: (next: AnnualFeesPct) => void;
  /** Called when a field loses focus, for sections that persist on blur. */
  onCommit?: (next: AnnualFeesPct) => void;
}

/** The per-poste annual fees inputs, shared by the current situation and the
 * proposal editor so both sides edit the same five rates the same way. */
export function AnnualFeesFields({ fees, onChange, onCommit }: AnnualFeesFieldsProps) {
  const isDefault = feesAreDefault(fees);
  return (
    <div className="flex flex-wrap gap-4 rounded-md border border-line bg-paper p-3">
      {FEE_KEYS.map((key) => (
        <label key={key} className="flex flex-col gap-1.5 text-xs text-ink">
          {ANNUAL_FEES_LABELS[key]}
          <span className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={fees[key]}
              onChange={(e) => onChange({ ...fees, [key]: Number(e.target.value) })}
              onBlur={() => onCommit?.(fees)}
              className={`w-20 ${NUMERIC_FIELD_CLASS}`}
            />
            <span className="text-slate">% / an</span>
          </span>
        </label>
      ))}
      {!isDefault && (
        <button
          type="button"
          onClick={() => {
            const next = { ...DEFAULT_ANNUAL_FEES_PCT };
            onChange(next);
            onCommit?.(next);
          }}
          className="self-end pb-2 text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          Rétablir les défauts
        </button>
      )}
    </div>
  );
}
