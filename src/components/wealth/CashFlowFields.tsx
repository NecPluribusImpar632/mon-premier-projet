"use client";

import type { ClientFlowsData } from "@/lib/actions/clients";
import type { CashFlowYear } from "@/lib/wealth/cashFlows";
import { INCOME_TAX_SCALE_2025 } from "@/lib/fiscal/incomeTax";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { formatCurrency } from "@/lib/format/currency";

interface CashFlowFieldsProps {
  flows: ClientFlowsData;
  onChange: (next: ClientFlowsData) => void;
  /** Called when a field loses focus, the section persists on blur. */
  onCommit: (next: ClientFlowsData) => void;
  /** Year 1 of the schedule computed from the current fields, today's euros. */
  firstYear: CashFlowYear;
  fiscalParts: number;
  rentedPropertyCount: number;
  loanCount: number;
}

function signed(value: number): string {
  if (Math.round(value) === 0) return formatCurrency(0);
  return `${value > 0 ? "+" : "−"}${formatCurrency(Math.abs(value))}`;
}

/**
 * The three annual amounts the advisor enters, and the resulting year-1
 * balance line by line (rents and loan instalments come from the saisie des
 * biens, the income tax from the foyer fiscal), so the computed savings can
 * be checked at a glance before it feeds the simulation.
 */
export function CashFlowFields({
  flows,
  onChange,
  onCommit,
  firstYear,
  fiscalParts,
  rentedPropertyCount,
  loanCount,
}: CashFlowFieldsProps) {
  function field(
    key: "incomeFranceAnnual" | "incomeForeignAnnual" | "livingExpensesAnnual",
    label: string
  ) {
    return (
      <label className="flex flex-col gap-1.5 text-xs text-ink">
        {label}
        <span className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            step={1000}
            value={flows[key]}
            onChange={(e) => onChange({ ...flows, [key]: Math.max(0, Number(e.target.value)) })}
            onBlur={() => onCommit(flows)}
            className={`w-32 ${NUMERIC_FIELD_CLASS}`}
          />
          <span className="text-slate">€ / an</span>
        </span>
      </label>
    );
  }

  const taxes = firstYear.incomeTax + firstYear.socialContributions;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-paper p-3">
      <div className="flex flex-wrap gap-4">
        {field("incomeFranceAnnual", "Revenus nets perçus, imposables en France")}
        {field("incomeForeignAnnual", "Revenus nets de source étrangère, déjà imposés")}
        {field("livingExpensesAnnual", "Dépenses de train de vie")}
      </div>
      <p className="text-xs text-slate">
        Revenus supposés constants jusqu&apos;à l&apos;échéance (indexés sur l&apos;inflation
        retenue, sans progression de carrière ni départ en retraite).
      </p>

      <table className="w-full max-w-md text-xs">
        <tbody className="font-mono tabular-nums text-ink">
          <tr>
            <td className="py-0.5 font-sans text-slate">Revenus France</td>
            <td className="py-0.5 text-right">{signed(firstYear.incomeFrance)}</td>
          </tr>
          <tr>
            <td className="py-0.5 font-sans text-slate">Revenus étrangers</td>
            <td className="py-0.5 text-right">{signed(firstYear.incomeForeign)}</td>
          </tr>
          <tr>
            <td className="py-0.5 font-sans text-slate">
              Loyers bruts
              {rentedPropertyCount === 0
                ? " (aucun bien loué)"
                : ` (${rentedPropertyCount} bien${rentedPropertyCount > 1 ? "s" : ""} loué${rentedPropertyCount > 1 ? "s" : ""})`}
            </td>
            <td className="py-0.5 text-right">{signed(firstYear.grossRents)}</td>
          </tr>
          <tr>
            <td className="py-0.5 font-sans text-slate">Dépenses de train de vie</td>
            <td className="py-0.5 text-right">{signed(-firstYear.livingExpenses)}</td>
          </tr>
          <tr>
            <td className="py-0.5 font-sans text-slate">
              Mensualités des prêts
              {loanCount === 0 ? " (aucun prêt)" : ` (${loanCount} prêt${loanCount > 1 ? "s" : ""})`}
            </td>
            <td className="py-0.5 text-right">{signed(-firstYear.loanPayments)}</td>
          </tr>
          <tr>
            <td className="py-0.5 font-sans text-slate">
              Impôt sur le revenu et prélèvements sociaux ({fiscalParts.toLocaleString("fr-FR")}{" "}
              part{fiscalParts > 1 ? "s" : ""}, {INCOME_TAX_SCALE_2025.label.toLowerCase()})
            </td>
            <td className="py-0.5 text-right">{signed(-taxes)}</td>
          </tr>
          <tr className="border-t border-line">
            <td className="py-1 font-sans text-ink">Épargne annuelle résultante</td>
            <td
              className={`py-1 text-right ${firstYear.balance < 0 ? "text-bronze" : "text-emerald-strong"}`}
            >
              {signed(firstYear.balance)}
            </td>
          </tr>
          <tr>
            <td className="py-0.5 font-sans text-slate">soit par mois</td>
            <td className="py-0.5 text-right text-slate">{signed(firstYear.balance / 12)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-slate">
        Les parts fiscales viennent de la situation familiale de la vue d&apos;ensemble. Les
        revenus étrangers sont exclus du barème français, sans gestion de convention fiscale.
        Les loyers sont imposés en micro-foncier (70 % de leur montant au barème, plus 17,2 % de
        prélèvements sociaux).
      </p>
    </div>
  );
}
