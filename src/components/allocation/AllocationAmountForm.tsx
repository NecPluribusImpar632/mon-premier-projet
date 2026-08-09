"use client";

import { useEffect, useRef } from "react";
import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { CategoryDetailsToggle } from "@/components/allocation/CategoryDetailsToggle";
import { formatCurrency } from "@/lib/format/currency";
import { roundPercent } from "@/lib/format/percent";
import type { ActionsIndexBreakdown } from "@/lib/allocation/actionsIndexBreakdown";
import type { ReferenceIndex } from "@/lib/allocation/referenceIndices";
import type {
  PreciousMetal,
  PreciousMetalsBreakdown as PreciousMetalsBreakdownType,
} from "@/lib/allocation/preciousMetals";

interface AllocationAmountFormProps {
  amounts: Record<string, number>;
  percentages: Record<string, number>;
  onChange: (categoryId: string, amount: number) => void;
  immobilierValue: number;
  hasDetailedProperties: boolean;
  actionsIndexBreakdown: ActionsIndexBreakdown;
  onActionsIndexChange: (index: ReferenceIndex, percentage: number) => void;
  actionsStatusMessage: string;
  actionsStatusColorClass: string;
  professionalToolMainIncome: boolean;
  onProfessionalToolMainIncomeChange: (value: boolean) => void;
  preciousMetalsBreakdown: PreciousMetalsBreakdownType;
  onPreciousMetalsBreakdownChange: (metal: PreciousMetal, amount: number) => void;
  preciousMetalsStatusMessage: string;
  preciousMetalsStatusColorClass: string;
}

export function AllocationAmountForm({
  amounts,
  percentages,
  onChange,
  immobilierValue,
  hasDetailedProperties,
  actionsIndexBreakdown,
  onActionsIndexChange,
  actionsStatusMessage,
  actionsStatusColorClass,
  professionalToolMainIncome,
  onProfessionalToolMainIncomeChange,
  preciousMetalsBreakdown,
  onPreciousMetalsBreakdownChange,
  preciousMetalsStatusMessage,
  preciousMetalsStatusColorClass,
}: AllocationAmountFormProps) {
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // The tab switch that mounts this form is a mouse click on the sidebar —
  // without this, the next Tab press would go to the next sidebar item, not
  // into the form, forcing a CGP filling this in under time pressure back
  // to the mouse. Landing focus on the first field lets Tab alone carry
  // them through every amount.
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const firstCategoryId = ASSET_CATEGORIES[0].id;

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
                      ref={category.id === firstCategoryId ? firstFieldRef : undefined}
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
            {category.id === "outil-professionnel" && (
              <div className="ml-4 flex items-center justify-between gap-4">
                <span className="text-xs text-slate">
                  Le client tire-t-il l&apos;essentiel de ses revenus de cette
                  entreprise ?
                </span>
                <span className="inline-flex w-fit shrink-0 gap-1 rounded-full border border-line bg-paper p-1">
                  <button
                    type="button"
                    tabIndex={-1}
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
                    tabIndex={-1}
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
            <CategoryDetailsToggle
              categoryId={category.id}
              categoryAmount={amounts[category.id] ?? 0}
              actionsIndexBreakdown={
                category.id === "actions" ? actionsIndexBreakdown : undefined
              }
              onActionsIndexChange={
                category.id === "actions" ? onActionsIndexChange : undefined
              }
              actionsStatusMessage={category.id === "actions" ? actionsStatusMessage : undefined}
              actionsStatusColorClass={
                category.id === "actions" ? actionsStatusColorClass : undefined
              }
              preciousMetalsBreakdown={
                category.id === "matieres-premieres" ? preciousMetalsBreakdown : undefined
              }
              onPreciousMetalsChange={
                category.id === "matieres-premieres" ? onPreciousMetalsBreakdownChange : undefined
              }
              preciousMetalsStatusMessage={
                category.id === "matieres-premieres" ? preciousMetalsStatusMessage : undefined
              }
              preciousMetalsStatusColorClass={
                category.id === "matieres-premieres" ? preciousMetalsStatusColorClass : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}
