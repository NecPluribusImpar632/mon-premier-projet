"use client";

import { ASSET_CATEGORIES, FINANCIAL_CATEGORY_IDS } from "@/lib/allocation/categories";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { ActionsProfileBreakdown } from "@/components/allocation/ActionsProfileBreakdown";
import { formatCurrency } from "@/lib/format/currency";
import { roundPercent } from "@/lib/format/percent";
import type { ActionsProfileBreakdown as Breakdown } from "@/lib/allocation/stockProfiles";

interface AllocationAmountFormProps {
  amounts: Record<string, number>;
  percentages: Record<string, number>;
  onChange: (categoryId: string, amount: number) => void;
  immobilierPct: number;
  totalPropertyValue: number;
  actionsBreakdown: Breakdown;
  onActionsBreakdownChange: (profile: keyof Breakdown, percentage: number) => void;
  actionsStatusMessage: string;
  actionsStatusColorClass: string;
}

export function AllocationAmountForm({
  amounts,
  percentages,
  onChange,
  immobilierPct,
  totalPropertyValue,
  actionsBreakdown,
  onActionsBreakdownChange,
  actionsStatusMessage,
  actionsStatusColorClass,
}: AllocationAmountFormProps) {
  return (
    <div className="flex flex-col gap-3">
      {ASSET_CATEGORIES.filter((category) =>
        FINANCIAL_CATEGORY_IDS.includes(category.id)
      ).map((category) => {
        return (
          <div key={category.id} className="flex flex-col gap-2">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm text-ink">{category.label}</span>
              <span className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-slate">
                  {roundPercent(percentages[category.id] ?? 0)}%
                </span>
                <span className="flex items-center gap-1.5">
                  <FormattedNumberInput
                    value={amounts[category.id] ?? 0}
                    onChange={(amount) => onChange(category.id, amount)}
                    placeholder="0"
                    className={`w-28 ${NUMERIC_FIELD_CLASS}`}
                  />
                  <span className="text-sm text-slate">€</span>
                </span>
              </span>
            </label>
            {category.id === "actions" && (
              <ActionsProfileBreakdown
                breakdown={actionsBreakdown}
                onChange={onActionsBreakdownChange}
                statusMessage={actionsStatusMessage}
                statusColorClass={actionsStatusColorClass}
              />
            )}
          </div>
        );
      })}

      <div className="flex flex-col gap-1 border-t border-line pt-3">
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm text-ink">Immobilier</span>
          <span className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-slate">
              {roundPercent(immobilierPct)}%
            </span>
            <span className="w-28 rounded-md border border-dashed border-line bg-paper px-2 py-1 text-right font-mono text-sm tabular-nums text-slate">
              {formatCurrency(totalPropertyValue)}
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
