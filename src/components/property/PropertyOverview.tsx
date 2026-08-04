import { totalRemainingDebt, type PropertyWithLoans } from "@/lib/property/loanCalculations";
import { formatCurrency } from "@/lib/format/currency";

interface PropertyOverviewProps {
  properties: PropertyWithLoans[];
}

export function PropertyOverview({ properties }: PropertyOverviewProps) {
  if (properties.length === 0) return null;

  const totalValue = properties.reduce((sum, p) => sum + p.currentValue, 0);
  const totalDebt = properties.reduce((sum, p) => sum + totalRemainingDebt(p), 0);
  const netEquity = totalValue - totalDebt;
  const ltvRatio = totalValue > 0 ? (totalDebt / totalValue) * 100 : 0;

  const stats = [
    { label: "Valeur totale", value: formatCurrency(totalValue) },
    { label: "Dette totale", value: formatCurrency(totalDebt) },
    { label: "Équité nette totale", value: formatCurrency(netEquity) },
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
