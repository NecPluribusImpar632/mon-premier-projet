"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Loan } from "@/generated/prisma/client";
import { RATE_TYPES, RATE_TYPE_LABELS } from "@/lib/property/rateType";
import {
  AMORTIZATION_TYPES,
  AMORTIZATION_TYPE_LABELS,
  type AmortizationType,
} from "@/lib/property/loanTypes";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";
import { FIELD_CLASS, NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";

interface LoanFieldsProps {
  defaultLoans?: Loan[];
}

interface LoanRow {
  key: string;
  loan?: Loan;
  amortizationType: AmortizationType;
}

let rowCounter = 0;
function newRowKey() {
  rowCounter += 1;
  return `new-${rowCounter}`;
}

// Each row's fields are named `loan.<key>.<field>` — the server groups
// FormData entries by that key to reconstruct each loan, so a stable
// client-generated key (not the array index) is what lets rows survive
// add/remove without mixing up which value belongs to which row.
export function LoanFields({ defaultLoans = [] }: LoanFieldsProps) {
  const [rows, setRows] = useState<LoanRow[]>(() =>
    defaultLoans.map((loan) => ({
      key: loan.id,
      loan,
      amortizationType: loan.amortizationType as AmortizationType,
    }))
  );

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: newRowKey(), amortizationType: "amortissable" },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((row) => row.key !== key));
  }

  function setRowAmortizationType(key: string, amortizationType: AmortizationType) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, amortizationType } : row))
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate">Prêts</span>
        <button
          type="button"
          onClick={addRow}
          className="rounded-full border border-line px-3 py-1 text-xs font-medium text-slate transition-colors hover:border-emerald hover:text-emerald"
        >
          + Ajouter un prêt
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-slate">Aucun prêt sur ce bien.</p>
      )}

      {rows.map((row) => (
        <div
          key={row.key}
          className="flex flex-col gap-3 rounded-md border border-line p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <input
              name={`loan.${row.key}.label`}
              type="text"
              placeholder="Nom du prêt (optionnel)"
              defaultValue={row.loan?.label ?? ""}
              className={`${FIELD_CLASS} flex-1`}
            />
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              aria-label="Supprimer ce prêt"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate transition-colors hover:bg-bronze-tint hover:text-bronze"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-slate">
              Montant initial (€)
              <FormattedNumberInput
                name={`loan.${row.key}.originalAmount`}
                required
                placeholder="0"
                value={row.loan?.originalAmount}
                className={NUMERIC_FIELD_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-slate">
              Capital restant dû (€)
              <FormattedNumberInput
                name={`loan.${row.key}.remainingAmount`}
                required
                placeholder="0"
                value={row.loan?.remainingAmount}
                className={NUMERIC_FIELD_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-slate">
              Taux (%)
              <input
                name={`loan.${row.key}.rate`}
                type="number"
                min={0}
                step="0.1"
                defaultValue={row.loan?.rate ?? 0}
                className={NUMERIC_FIELD_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-slate">
              Durée (années)
              <input
                name={`loan.${row.key}.termYears`}
                type="number"
                min={1}
                step={1}
                required
                defaultValue={row.loan?.termYears ?? 20}
                className={NUMERIC_FIELD_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-slate">
              Type de taux
              <select
                name={`loan.${row.key}.rateType`}
                defaultValue={row.loan?.rateType ?? "fixed"}
                className={FIELD_CLASS}
              >
                {RATE_TYPES.map((rateType) => (
                  <option key={rateType} value={rateType}>
                    {RATE_TYPE_LABELS[rateType]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-slate">
              Type d&apos;amortissement
              <select
                name={`loan.${row.key}.amortizationType`}
                value={row.amortizationType}
                onChange={(e) =>
                  setRowAmortizationType(
                    row.key,
                    e.target.value as AmortizationType
                  )
                }
                className={FIELD_CLASS}
              >
                {AMORTIZATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {AMORTIZATION_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            {row.amortizationType === "partiel" && (
              <label className="col-span-2 flex flex-col gap-1.5 text-xs text-slate">
                Capital résiduel à l&apos;échéance (€)
                <FormattedNumberInput
                  name={`loan.${row.key}.residualAmount`}
                  required
                  placeholder="0"
                  value={row.loan?.residualAmount ?? undefined}
                  className={NUMERIC_FIELD_CLASS}
                />
              </label>
            )}
          </div>
        </div>
      ))}

      {/* Lets the server know exactly which loan keys were submitted (including
          "none" when every row was deleted), rather than inferring it from
          which loan.* fields happen to be present. */}
      <input type="hidden" name="loanKeys" value={rows.map((r) => r.key).join(",")} />
    </div>
  );
}
