"use client";

import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import { clampPercentage } from "@/lib/allocation/validation";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
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
            <span className="flex items-center gap-2 text-sm text-ink">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.label}
            </span>
            <span className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={entry?.percentage ?? 0}
                onChange={(e) =>
                  onChange(category.id, clampPercentage(Number(e.target.value)))
                }
                className={`w-20 ${NUMERIC_FIELD_CLASS}`}
              />
              <span className="w-3 text-sm text-slate">%</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
