"use client";

import {
  STOCK_PROFILES,
  STOCK_PROFILE_LABELS,
  STOCK_PROFILE_DESCRIPTIONS,
  type ActionsProfileBreakdown as Breakdown,
} from "@/lib/allocation/stockProfiles";
import { clampPercentage } from "@/lib/allocation/validation";
import { roundPercent } from "@/lib/format/percent";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";

interface ActionsProfileFieldsProps {
  breakdown: Breakdown;
  onChange: (profile: keyof Breakdown, percentage: number) => void;
  statusMessage: string;
  statusColorClass: string;
}

/** Field content only — the collapse/expand chrome around this (and its
 * siblings for the same category) lives in CategoryDetailsToggle now. */
export function ActionsProfileFields({
  breakdown,
  onChange,
  statusMessage,
  statusColorClass,
}: ActionsProfileFieldsProps) {
  const total = breakdown.indiciel + breakdown.defensif + breakdown.croissance;

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-medium text-slate">Profils actions</p>
      {STOCK_PROFILES.map((profile) => (
        <label key={profile} className="flex items-center justify-between gap-4">
          <span className="text-xs text-ink">
            {STOCK_PROFILE_LABELS[profile]}
            <span className="ml-1 text-slate">
              ({STOCK_PROFILE_DESCRIPTIONS[profile]})
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={breakdown[profile]}
              onChange={(e) =>
                onChange(profile, clampPercentage(Number(e.target.value)))
              }
              onWheel={(e) => e.currentTarget.blur()}
              className={`w-16 ${NUMERIC_FIELD_CLASS}`}
            />
            <span className="w-3 text-xs text-slate">%</span>
          </span>
        </label>
      ))}
      <p className={`text-xs font-mono tabular-nums ${total === 100 ? "text-emerald-strong" : "text-bronze"}`}>
        Total {roundPercent(total)}%{total !== 100 && " (doit faire 100 %)"}
      </p>
      <p className={`text-xs ${statusColorClass}`}>{statusMessage}</p>
    </div>
  );
}
