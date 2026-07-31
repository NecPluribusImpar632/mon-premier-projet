"use client";

import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import { clampPercentage } from "@/lib/allocation/validation";
import type { AllocationEntry } from "@/types/allocation";

interface AllocationFormProps {
  entries: AllocationEntry[];
  onChange: (categoryId: string, percentage: number) => void;
}

export function AllocationForm({ entries, onChange }: AllocationFormProps) {
  return (
    <div className="flex flex-col gap-3">
      {ASSET_CATEGORIES.map((category) => {
        const entry = entries.find((e) => e.categoryId === category.id);
        return (
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
            <span className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={entry?.percentage ?? 0}
                onChange={(e) =>
                  onChange(category.id, clampPercentage(Number(e.target.value)))
                }
                className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-right text-sm tabular-nums transition-shadow focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-zinc-50/10"
              />
              <span className="text-sm text-zinc-500">%</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
