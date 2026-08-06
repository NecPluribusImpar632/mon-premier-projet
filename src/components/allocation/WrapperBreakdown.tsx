"use client";

import { useState } from "react";
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

interface WrapperBreakdownProps {
  breakdown: Breakdown;
  categoryAmount: number;
  onChange: (wrapper: Wrapper, amount: number) => void;
  statusMessage: string;
  statusColorClass: string;
}

export function WrapperBreakdown({
  breakdown,
  categoryAmount,
  onChange,
  statusMessage,
  statusColorClass,
}: WrapperBreakdownProps) {
  const [expanded, setExpanded] = useState(wrapperBreakdownTotal(breakdown) > 0);

  const total = wrapperBreakdownTotal(breakdown);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="ml-4 w-fit text-left text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
      >
        Détailler les enveloppes
      </button>
    );
  }

  const remaining = categoryAmount - total;

  return (
    <div className="ml-4 flex flex-col gap-2.5 rounded-md border border-line bg-paper p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate">Enveloppes fiscales</p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          Réduire
        </button>
      </div>
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
