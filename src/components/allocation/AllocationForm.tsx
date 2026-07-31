"use client";

import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import { clampPercentage } from "@/lib/allocation/validation";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { ActionsProfileBreakdown } from "@/components/allocation/ActionsProfileBreakdown";
import type { AllocationEntry } from "@/types/allocation";
import type { ActionsProfileBreakdown as Breakdown } from "@/lib/allocation/stockProfiles";

interface AllocationFormProps {
  entries: AllocationEntry[];
  onChange: (categoryId: string, percentage: number) => void;
  actionsBreakdown: Breakdown;
  onActionsBreakdownChange: (profile: keyof Breakdown, percentage: number) => void;
  actionsStatusMessage: string;
  actionsStatusColorClass: string;
}

export function AllocationForm({
  entries,
  onChange,
  actionsBreakdown,
  onActionsBreakdownChange,
  actionsStatusMessage,
  actionsStatusColorClass,
}: AllocationFormProps) {
  return (
    <div className="flex flex-col gap-3">
      {ASSET_CATEGORIES.map((category) => {
        const entry = entries.find((e) => e.categoryId === category.id);
        return (
          <div key={category.id} className="flex flex-col gap-2">
            <label className="flex items-center justify-between gap-4">
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
    </div>
  );
}
