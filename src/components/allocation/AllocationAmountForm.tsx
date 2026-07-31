"use client";

import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";

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
          <span className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {category.label}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-400">
              {percentages[category.id] ?? 0}%
            </span>
            <span className="flex items-center gap-1">
              <FormattedNumberInput
                value={amounts[category.id] ?? 0}
                onChange={(amount) => onChange(category.id, amount)}
                placeholder="0"
                className="w-28 rounded-md border border-zinc-300 bg-white px-2 py-1 text-right text-sm tabular-nums transition-shadow focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-zinc-50/10"
              />
              <span className="text-sm text-zinc-500">€</span>
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
