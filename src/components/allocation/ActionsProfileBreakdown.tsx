"use client";

import { useState } from "react";
import {
  STOCK_PROFILES,
  STOCK_PROFILE_LABELS,
  STOCK_PROFILE_DESCRIPTIONS,
  type ActionsProfileBreakdown as Breakdown,
} from "@/lib/allocation/stockProfiles";
import { clampPercentage } from "@/lib/allocation/validation";
import { roundPercent } from "@/lib/format/percent";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";

interface ActionsProfileBreakdownProps {
  breakdown: Breakdown;
  onChange: (profile: keyof Breakdown, percentage: number) => void;
  statusMessage: string;
  statusColorClass: string;
}

export function ActionsProfileBreakdown({
  breakdown,
  onChange,
  statusMessage,
  statusColorClass,
}: ActionsProfileBreakdownProps) {
  const isDetailed = breakdown.indiciel !== 100;
  const [expanded, setExpanded] = useState(isDetailed);

  const total = breakdown.indiciel + breakdown.defensif + breakdown.croissance;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="ml-4 w-fit text-left text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
      >
        Détailler les profils actions
      </button>
    );
  }

  return (
    <div className="ml-4 flex flex-col gap-2.5 rounded-md border border-line bg-paper p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate">Profils actions</p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          Réduire
        </button>
      </div>
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
