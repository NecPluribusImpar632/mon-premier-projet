"use client";

import { ASSET_CATEGORIES, FINANCIAL_CATEGORY_IDS } from "@/lib/allocation/categories";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { ActionsProfileBreakdown } from "@/components/allocation/ActionsProfileBreakdown";
import { WrapperBreakdown } from "@/components/allocation/WrapperBreakdown";
import { formatCurrency } from "@/lib/format/currency";
import { roundPercent } from "@/lib/format/percent";
import type { ActionsProfileBreakdown as Breakdown } from "@/lib/allocation/stockProfiles";
import type { Wrapper, WrapperBreakdown as WrapperBreakdownType } from "@/lib/allocation/wrappers";

interface AllocationAmountFormProps {
  amounts: Record<string, number>;
  percentages: Record<string, number>;
  onChange: (categoryId: string, amount: number) => void;
  immobilierValue: number;
  hasDetailedProperties: boolean;
  actionsBreakdown: Breakdown;
  onActionsBreakdownChange: (profile: keyof Breakdown, percentage: number) => void;
  actionsStatusMessage: string;
  actionsStatusColorClass: string;
  professionalToolMainIncome: boolean;
  onProfessionalToolMainIncomeChange: (value: boolean) => void;
  wrapperBreakdowns: Record<string, WrapperBreakdownType>;
  onWrapperBreakdownChange: (categoryId: string, wrapper: Wrapper, amount: number) => void;
  wrapperStatusMessages: Record<string, string>;
  wrapperStatusColorClasses: Record<string, string>;
}

export function AllocationAmountForm({
  amounts,
  percentages,
  onChange,
  immobilierValue,
  hasDetailedProperties,
  actionsBreakdown,
  onActionsBreakdownChange,
  actionsStatusMessage,
  actionsStatusColorClass,
  professionalToolMainIncome,
  onProfessionalToolMainIncomeChange,
  wrapperBreakdowns,
  onWrapperBreakdownChange,
  wrapperStatusMessages,
  wrapperStatusColorClasses,
}: AllocationAmountFormProps) {
  return (
    <div className="flex flex-col gap-3">
      {ASSET_CATEGORIES.map((category) => {
        const isLockedImmobilier =
          category.id === "immobilier" && hasDetailedProperties;

        return (
          <div key={category.id} className="flex flex-col gap-2">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm text-ink">{category.label}</span>
              <span className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-slate">
                  {roundPercent(percentages[category.id] ?? 0)}%
                </span>
                {isLockedImmobilier ? (
                  <span className="w-28 rounded-md border border-dashed border-line bg-paper px-2 py-1 text-right font-mono text-sm tabular-nums text-slate">
                    {formatCurrency(immobilierValue)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <FormattedNumberInput
                      value={amounts[category.id] ?? 0}
                      onChange={(amount) => onChange(category.id, amount)}
                      placeholder="0"
                      className={`w-28 ${NUMERIC_FIELD_CLASS}`}
                    />
                    <span className="text-sm text-slate">€</span>
                  </span>
                )}
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
            {category.id === "outil-professionnel" && (
              <div className="ml-4 flex items-center justify-between gap-4">
                <span className="text-xs text-slate">
                  Le client tire-t-il l&apos;essentiel de ses revenus de cette
                  entreprise ?
                </span>
                <span className="inline-flex w-fit shrink-0 gap-1 rounded-full border border-line bg-paper p-1">
                  <button
                    type="button"
                    onClick={() => onProfessionalToolMainIncomeChange(false)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      !professionalToolMainIncome
                        ? "bg-surface text-ink"
                        : "text-slate hover:text-ink"
                    }`}
                  >
                    Non
                  </button>
                  <button
                    type="button"
                    onClick={() => onProfessionalToolMainIncomeChange(true)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      professionalToolMainIncome
                        ? "bg-surface text-ink"
                        : "text-slate hover:text-ink"
                    }`}
                  >
                    Oui
                  </button>
                </span>
              </div>
            )}
            {(FINANCIAL_CATEGORY_IDS as string[]).includes(category.id) && (
              <WrapperBreakdown
                breakdown={wrapperBreakdowns[category.id]}
                categoryAmount={amounts[category.id] ?? 0}
                onChange={(wrapper, amount) =>
                  onWrapperBreakdownChange(category.id, wrapper, amount)
                }
                statusMessage={wrapperStatusMessages[category.id] ?? ""}
                statusColorClass={wrapperStatusColorClasses[category.id] ?? "text-slate"}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
