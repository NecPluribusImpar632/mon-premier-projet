"use client";

import {
  WRAPPERS,
  WRAPPER_LABELS,
  wrapperBreakdownTotal,
  type Wrapper,
  type WrapperBreakdown as Breakdown,
} from "@/lib/allocation/wrappers";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { formatCurrency } from "@/lib/format/currency";

interface WrapperFieldsProps {
  breakdown: Breakdown;
  categoryAmount: number;
  onChange: (wrapper: Wrapper, amount: number) => void;
  statusMessage: string;
  statusColorClass: string;
}

/** Field content only — the collapse/expand chrome around this (and its
 * siblings for the same category) lives in CategoryDetailsToggle now. */
export function WrapperFields({
  breakdown,
  categoryAmount,
  onChange,
  statusMessage,
  statusColorClass,
}: WrapperFieldsProps) {
  const total = wrapperBreakdownTotal(breakdown);
  const remaining = categoryAmount - total;

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-medium text-slate">Enveloppes fiscales</p>
      {WRAPPERS.map((wrapper) => (
        <label key={wrapper} className="flex items-center justify-between gap-4">
          <span className="text-xs text-ink">{WRAPPER_LABELS[wrapper]}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <FormattedNumberInput
              value={breakdown[wrapper]}
              onChange={(amount) => onChange(wrapper, amount)}
              placeholder="0"
              className={`w-24 ${NUMERIC_FIELD_CLASS}`}
            />
            <span className="text-xs text-slate">€</span>
          </span>
        </label>
      ))}
      {total > 0 && (
        <p
          className={`text-xs font-mono tabular-nums ${
            remaining === 0
              ? "text-emerald-strong"
              : remaining > 0
                ? "text-slate"
                : "text-bronze"
          }`}
        >
          {remaining === 0
            ? "Entièrement détaillé"
            : remaining > 0
              ? `Reste non détaillé : ${formatCurrency(remaining)}`
              : `Dépasse le montant de la catégorie (${formatCurrency(categoryAmount)})`}
        </p>
      )}
      <p className={`text-xs ${statusColorClass}`}>{statusMessage}</p>
    </div>
  );
}
