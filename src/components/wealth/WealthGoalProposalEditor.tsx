"use client";

import { useState } from "react";
import type { ReferenceIndex } from "@/lib/allocation/referenceIndices";
import { actionsIndexBreakdownTotal } from "@/lib/allocation/actionsIndexBreakdown";
import { ActionsIndexFields } from "@/components/allocation/ActionsIndexFields";
import { AnnualFeesFields } from "@/components/wealth/AnnualFeesFields";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { formatCurrency } from "@/lib/format/currency";
import {
  PROPOSAL_CATEGORY_IDS,
  PROPOSAL_CATEGORY_LABELS,
  PROPOSAL_TOTAL_TOLERANCE,
  proposalTotal,
  type WealthGoalProposalData,
} from "@/lib/wealth/wealthGoalProposal";

interface WealthGoalProposalEditorProps {
  draft: WealthGoalProposalData;
  onDraftChange: (next: WealthGoalProposalData) => void;
  /** The six-poste total the proposal must match. */
  reallocatableTotal: number;
  currentAmounts: Record<string, number>;
  onStartFromCurrent: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  errorMessage: string | null;
}

export function WealthGoalProposalEditor({
  draft,
  onDraftChange,
  reallocatableTotal,
  currentAmounts,
  onStartFromCurrent,
  onSave,
  onCancel,
  isSaving,
  errorMessage,
}: WealthGoalProposalEditorProps) {
  const [showFees, setShowFees] = useState(false);
  const total = proposalTotal(draft.amounts);
  const remaining = reallocatableTotal - total;
  const totalOk = Math.abs(remaining) <= PROPOSAL_TOTAL_TOLERANCE;
  const breakdownOk = actionsIndexBreakdownTotal(draft.actionsIndexBreakdown) === 100;
  const canSave = totalOk && breakdownOk && !isSaving;

  function setAmount(id: (typeof PROPOSAL_CATEGORY_IDS)[number], value: number) {
    onDraftChange({ ...draft, amounts: { ...draft.amounts, [id]: Math.max(0, value) } });
  }

  function setIndex(index: ReferenceIndex, percentage: number) {
    onDraftChange({
      ...draft,
      actionsIndexBreakdown: { ...draft.actionsIndexBreakdown, [index]: percentage },
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink">Allocation proposée</p>
        <button
          type="button"
          onClick={onStartFromCurrent}
          className="text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          Partir de l&apos;allocation actuelle
        </button>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate">
            <th className="pb-1 font-normal">Poste</th>
            <th className="pb-1 text-right font-normal">Situation actuelle</th>
            <th className="pb-1 text-right font-normal">Proposition</th>
          </tr>
        </thead>
        <tbody className="text-ink">
          {PROPOSAL_CATEGORY_IDS.map((id) => (
            <tr key={id} className="border-t border-line/50">
              <td className="py-1">{PROPOSAL_CATEGORY_LABELS[id]}</td>
              <td className="py-1 text-right font-mono tabular-nums text-slate">
                {formatCurrency(currentAmounts[id] ?? 0)}
              </td>
              <td className="py-1 text-right">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={draft.amounts[id]}
                  onChange={(e) => setAmount(id, Number(e.target.value))}
                  onWheel={(e) => e.currentTarget.blur()}
                  className={`w-32 ${NUMERIC_FIELD_CLASS}`}
                />
              </td>
            </tr>
          ))}
          <tr className="border-t border-line">
            <td className="py-1.5 font-medium">Total</td>
            <td className="py-1.5 text-right font-mono tabular-nums text-slate">
              {formatCurrency(reallocatableTotal)}
            </td>
            <td
              className={`py-1.5 text-right font-mono tabular-nums ${
                totalOk ? "text-emerald-strong" : "text-bronze"
              }`}
            >
              {formatCurrency(total)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className={`text-xs ${totalOk ? "text-slate" : "text-bronze"}`}>
        {totalOk
          ? "Le total est égal à la poche financière actuelle."
          : remaining > 0
            ? `Reste à répartir : ${formatCurrency(remaining)}.`
            : `Dépassement de ${formatCurrency(-remaining)} : on réalloue, on ne crée pas d'argent.`}
      </p>

      <div className="border-t border-line pt-3">
        <ActionsIndexFields
          breakdown={draft.actionsIndexBreakdown}
          onChange={setIndex}
          statusMessage=""
          statusColorClass="text-slate"
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setShowFees((v) => !v)}
          className="w-fit text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          {showFees ? "Masquer les frais annuels" : "Frais annuels par poste de la proposition"}
        </button>
        {showFees && (
          <AnnualFeesFields
            fees={draft.fees}
            onChange={(fees) => onDraftChange({ ...draft, fees })}
          />
        )}
      </div>

      {errorMessage && <p className="text-xs text-bronze">{errorMessage}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Enregistrement..." : "Enregistrer la proposition"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
