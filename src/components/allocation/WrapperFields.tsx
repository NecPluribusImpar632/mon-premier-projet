"use client";

import {
  WRAPPERS,
  WRAPPER_LABELS,
  wrapperBreakdownTotal,
  type Wrapper,
  type WrapperBreakdown as Breakdown,
} from "@/lib/allocation/wrappers";
import {
  compatibleWrappers,
  WRAPPER_COMPATIBILITY_NOTES,
} from "@/lib/allocation/wrapperCompatibility";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { formatCurrency } from "@/lib/format/currency";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface WrapperFieldsProps {
  categoryId: string;
  breakdown: Breakdown;
  categoryAmount: number;
  onChange: (wrapper: Wrapper, amount: number) => void;
  statusMessage: string;
  statusColorClass: string;
}

/** Field content only — the collapse/expand chrome around this (and its
 * siblings for the same category) lives in CategoryDetailsToggle now.
 *
 * Only shows the wrappers actually usable for this category (see
 * wrapperCompatibility.ts) — plus any wrapper that already has a nonzero
 * amount saved from before this restriction existed, so old data is never
 * silently hidden. Those legacy-only rows are visually flagged rather than
 * offered as a normal choice. */
export function WrapperFields({
  categoryId,
  breakdown,
  categoryAmount,
  onChange,
  statusMessage,
  statusColorClass,
}: WrapperFieldsProps) {
  const total = wrapperBreakdownTotal(breakdown);
  const remaining = categoryAmount - total;
  const allowed = compatibleWrappers(categoryId);
  const notes = WRAPPER_COMPATIBILITY_NOTES[categoryId];
  const visibleWrappers = WRAPPERS.filter(
    (wrapper) => allowed.includes(wrapper) || breakdown[wrapper] > 0
  );

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-medium text-slate">Enveloppes fiscales</p>
      {visibleWrappers.map((wrapper) => {
        const isLegacy = !allowed.includes(wrapper);
        const note = notes?.[wrapper];
        return (
          <label
            key={wrapper}
            className={`flex items-center justify-between gap-4 ${isLegacy ? "opacity-60" : ""}`}
          >
            <span className="flex items-center gap-1.5 text-xs text-ink">
              {WRAPPER_LABELS[wrapper]}
              {note && (
                <InfoTooltip label="Précision">
                  <p>{note}</p>
                </InfoTooltip>
              )}
              {isLegacy && (
                <InfoTooltip label="Donnée historique">
                  <p>
                    Cette combinaison n&apos;est plus proposée pour les nouvelles saisies,
                    mais reste affichée car déjà enregistrée.
                  </p>
                </InfoTooltip>
              )}
            </span>
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
        );
      })}
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
