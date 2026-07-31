import type { CombinedNetWorthResult } from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";

interface CombinedImpactBannerProps {
  result: CombinedNetWorthResult;
}

export function CombinedImpactBanner({ result }: CombinedImpactBannerProps) {
  const isNegative = result.deltaAmount < 0;

  return (
    <div className="sticky top-0 z-10 -mx-6 border-b border-line bg-surface px-6 py-4 sm:-mx-0 sm:rounded-lg sm:border sm:px-6">
      <p className="text-xs text-slate">
        Impact combiné de tous les curseurs actifs
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <div className="flex flex-col">
          <span className="text-xs text-slate">Patrimoine net avant</span>
          <span className="font-mono text-xl tabular-nums text-ink">
            {formatCurrency(result.totalBefore)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate">Patrimoine net après</span>
          <span className="font-mono text-xl tabular-nums text-ink">
            {formatCurrency(result.totalAfter)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate">Variation</span>
          <span
            className={`font-mono text-xl tabular-nums ${
              isNegative ? "text-bronze" : "text-emerald-strong"
            }`}
          >
            {isNegative ? "" : "+"}
            {formatCurrency(result.deltaAmount)} (
            {isNegative ? "" : "+"}
            {result.deltaPct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
