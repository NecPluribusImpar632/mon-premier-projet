"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  REFERENCE_INDICES,
  REFERENCE_INDEX_LABELS,
  DEFAULT_REFERENCE_INDEX,
  isReferenceIndex,
  type ReferenceIndex,
} from "@/lib/allocation/referenceIndices";
import {
  actionsIndexBreakdownTotal,
  type ActionsIndexBreakdown,
} from "@/lib/allocation/actionsIndexBreakdown";
import { clampPercentage } from "@/lib/allocation/validation";
import { roundPercent } from "@/lib/format/percent";
import { FIELD_CLASS, NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";

interface ActionsIndexFieldsProps {
  breakdown: ActionsIndexBreakdown;
  onChange: (index: ReferenceIndex, percentage: number) => void;
  statusMessage: string;
  statusColorClass: string;
}

/** Field content only — the collapse/expand chrome around this (and its
 * siblings for the same category) lives in CategoryDetailsToggle now.
 *
 * Progressive disclosure: only indices the advisor has actually picked show
 * a field, starting from just the default. "which rows are visible" is its
 * own local state (not derived from `breakdown[index] > 0`) so a row doesn't
 * vanish mid-edit the moment someone backspaces a value to 0. */
export function ActionsIndexFields({
  breakdown,
  onChange,
  statusMessage,
  statusColorClass,
}: ActionsIndexFieldsProps) {
  const [visibleIndices, setVisibleIndices] = useState<ReferenceIndex[]>(() => {
    const active = REFERENCE_INDICES.filter((index) => breakdown[index] > 0);
    return active.length > 0 ? active : [DEFAULT_REFERENCE_INDEX];
  });
  const [isAdding, setIsAdding] = useState(false);

  const total = actionsIndexBreakdownTotal(breakdown);
  const hiddenIndices = REFERENCE_INDICES.filter((index) => !visibleIndices.includes(index));

  function handleAdd(index: ReferenceIndex) {
    // The reliquat left after whatever the advisor already reduced the
    // existing fields by — a direct consequence of the explicit "Ajouter"
    // click, not a silent default (see WrapperFields "reste non détaillé",
    // which stays a manual action for the same reason).
    const reliquat = Math.max(0, 100 - total);
    setVisibleIndices((prev) => [...prev, index]);
    onChange(index, reliquat);
    setIsAdding(false);
  }

  function handleRemove(index: ReferenceIndex) {
    setVisibleIndices((prev) => prev.filter((i) => i !== index));
    onChange(index, 0);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-medium text-slate">
        Répartition par indice (ex : 40 % CAC 40, 60 % Nasdaq — n&apos;importe quel mix)
      </p>
      {REFERENCE_INDICES.filter((index) => visibleIndices.includes(index)).map((index) => (
        <label key={index} className="flex items-center justify-between gap-4">
          <span className="text-xs text-ink">{REFERENCE_INDEX_LABELS[index]}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={breakdown[index]}
              onChange={(e) => onChange(index, clampPercentage(Number(e.target.value)))}
              onWheel={(e) => e.currentTarget.blur()}
              className={`w-16 ${NUMERIC_FIELD_CLASS}`}
            />
            <span className="w-3 text-xs text-slate">%</span>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => handleRemove(index)}
              aria-label={`Retirer ${REFERENCE_INDEX_LABELS[index]}`}
              className="text-slate transition-colors hover:text-bronze"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </label>
      ))}

      {hiddenIndices.length > 0 &&
        (isAdding ? (
          <span className="flex items-center gap-1.5">
            <select
              autoFocus
              defaultValue=""
              onChange={(e) => {
                if (isReferenceIndex(e.target.value)) handleAdd(e.target.value);
              }}
              className={`w-40 py-1 text-xs ${FIELD_CLASS}`}
            >
              <option value="" disabled>
                Choisir un indice
              </option>
              {hiddenIndices.map((index) => (
                <option key={index} value={index}>
                  {REFERENCE_INDEX_LABELS[index]}
                </option>
              ))}
            </select>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              Annuler
            </button>
          </span>
        ) : (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsAdding(true)}
            className="flex w-fit items-center gap-1 text-xs text-slate transition-colors hover:text-ink"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un indice
          </button>
        ))}

      <p className={`text-xs font-mono tabular-nums ${total === 100 ? "text-emerald-strong" : "text-bronze"}`}>
        Total {roundPercent(total)}%{total !== 100 && " (doit faire 100 %)"}
      </p>
      <p className={`text-xs ${statusColorClass}`}>{statusMessage}</p>
    </div>
  );
}
