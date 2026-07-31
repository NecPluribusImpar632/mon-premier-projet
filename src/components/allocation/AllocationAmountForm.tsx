"use client";

import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";

interface AllocationAmountFormProps {
  amounts: Record<string, number>;
  percentages: Record<string, number>;
  onChange: (categoryId: string, amount: number) => void;
}

export function AllocationAmountForm({
  amounts,
  percentages,
  onChange,
}: AllocationAmountFormProps) {
  return (
    <div className="flex flex-col gap-3">
      {ASSET_CATEGORIES.map((category) => (
        <label
          key={category.id}
          className="flex items-center justify-between gap-4"
        >
          <span className="flex items-center gap-2 text-sm text-ink">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {category.label}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-slate">
              {percentages[category.id] ?? 0}%
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
      ))}
    </div>
  );
}
