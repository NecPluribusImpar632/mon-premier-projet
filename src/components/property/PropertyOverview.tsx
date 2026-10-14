import { totalRemainingDebt, type PropertyWithLoans } from "@/lib/property/loanCalculations";
import { formatCurrency } from "@/lib/format/currency";
import { isPartialOwnership, ownedValue } from "@/lib/property/ownership";

interface PropertyOverviewProps {
  properties: PropertyWithLoans[];
}

export function PropertyOverview({ properties }: PropertyOverviewProps) {
  if (properties.length === 0) return null;

  // Quote-part du client sur chaque bien (voir ownership.ts).
  const totalValue = properties.reduce((sum, p) => sum + ownedValue(p), 0);
  const totalDebt = properties.reduce((sum, p) => sum + totalRemainingDebt(p), 0);
  const netEquity = totalValue - totalDebt;
  const ltvRatio = totalValue > 0 ? (totalDebt / totalValue) * 100 : 0;
  const hasPartial = properties.some(isPartialOwnership);
  const shareSuffix = hasPartial ? " (quote-part)" : "";

  const stats = [
    { label: `Valeur${shareSuffix}`, value: formatCurrency(totalValue) },
    { label: `Dette${shareSuffix}`, value: formatCurrency(totalDebt) },
    { label: "Équité nette", value: formatCurrency(netEquity) },
    {
      label: "Ratio d'endettement",
      value: `${ltvRatio.toFixed(0)}%`,
      warn: ltvRatio > 80,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1">
          <span className="text-xs text-slate">{stat.label}</span>
          <span
            className={`font-mono text-xl tabular-nums ${
              stat.warn ? "text-bronze" : "text-ink"
            }`}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}
