import { AlertTriangle } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import { computeNetWorth } from "@/lib/wealth/netWorth";

interface WealthSummaryProps {
  financialWealthTotal: number;
  immobilierValue: number;
  properties: Property[];
  showConcentrationWarning: boolean;
}

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function WealthSummary({
  financialWealthTotal,
  immobilierValue,
  properties,
  showConcentrationWarning,
}: WealthSummaryProps) {
  const { grossWealth, totalDebt, netWealth } = computeNetWorth(
    financialWealthTotal,
    immobilierValue,
    properties
  );

  const netPct =
    grossWealth > 0 ? Math.max(0, Math.min(100, (netWealth / grossWealth) * 100)) : 0;
  const debtPct = 100 - netPct;

  return (
    <div className="border-b border-line pb-8">
      <h2 className="font-serif text-lg text-ink">Bilan patrimonial</h2>

      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-line">
        {netPct > 0 && (
          <div
            className="h-full bg-emerald"
            style={{ width: `${netPct}%` }}
          />
        )}
        {debtPct > 0 && (
          <div
            className="h-full"
            style={{
              width: `${debtPct}%`,
              backgroundImage:
                "repeating-linear-gradient(45deg, var(--color-slate) 0, var(--color-slate) 2px, transparent 2px, transparent 7px)",
              backgroundColor: "var(--color-line)",
            }}
          />
        )}
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-slate">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald" />
          Patrimoine net
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, var(--color-slate) 0, var(--color-slate) 1px, transparent 1px, transparent 3px)",
              backgroundColor: "var(--color-line)",
            }}
          />
          Dette
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate">Patrimoine brut</p>
          <p className="mt-1 font-mono text-lg tabular-nums text-ink">
            {currencyFormatter.format(grossWealth)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate">Dette totale</p>
          <p className="mt-1 font-mono text-lg tabular-nums text-ink">
            {currencyFormatter.format(totalDebt)}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-slate">Patrimoine net</p>
          <p className="mt-1 font-serif text-3xl font-medium tabular-nums text-ink">
            {currencyFormatter.format(netWealth)}
          </p>
        </div>
      </div>

      {showConcentrationWarning && (
        <div className="mt-6 flex items-start gap-2.5 rounded-md border border-bronze bg-bronze-tint p-3 text-sm text-bronze">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Patrimoine et revenus concentrés sur un même actif — risque non
            couvert par les scénarios de marché standards.
          </p>
        </div>
      )}
    </div>
  );
}
