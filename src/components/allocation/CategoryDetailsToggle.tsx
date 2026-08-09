"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  preciousMetalsBreakdownTotal,
  type PreciousMetal,
  type PreciousMetalsBreakdown,
} from "@/lib/allocation/preciousMetals";
import {
  isActionsIndexBreakdownDefault,
  type ActionsIndexBreakdown,
} from "@/lib/allocation/actionsIndexBreakdown";
import type { ReferenceIndex } from "@/lib/allocation/referenceIndices";
import { ActionsIndexFields } from "@/components/allocation/ActionsIndexFields";
import { PreciousMetalsFields } from "@/components/allocation/PreciousMetalsFields";

interface CategoryDetailsToggleProps {
  categoryId: string;
  categoryAmount: number;
  actionsIndexBreakdown?: ActionsIndexBreakdown;
  onActionsIndexChange?: (index: ReferenceIndex, percentage: number) => void;
  actionsStatusMessage?: string;
  actionsStatusColorClass?: string;
  preciousMetalsBreakdown?: PreciousMetalsBreakdown;
  onPreciousMetalsChange?: (metal: PreciousMetal, amount: number) => void;
  preciousMetalsStatusMessage?: string;
  preciousMetalsStatusColorClass?: string;
}

/**
 * One entry point per category instead of stacked "Détailler..." text links
 * (profils actions, composition or/argent) — a single muted icon that opens
 * a panel grouping whichever of those apply to this category. The enveloppe
 * fiscale breakdown used to live here too; it now has its own tab
 * (WrapperAllocationSection) since it answers a different question ("où
 * c'est logé fiscalement") than what this panel covers ("qu'est-ce que le
 * client possède"). Collapsed by default unless something's already been
 * detailed; the icon itself never disappears (so previously-entered detail
 * stays reachable even if the category amount is later zeroed out), it just
 * reads as quieter when there's nothing behind it yet.
 */
export function CategoryDetailsToggle({
  categoryId,
  categoryAmount,
  actionsIndexBreakdown,
  onActionsIndexChange,
  actionsStatusMessage,
  actionsStatusColorClass,
  preciousMetalsBreakdown,
  onPreciousMetalsChange,
  preciousMetalsStatusMessage,
  preciousMetalsStatusColorClass,
}: CategoryDetailsToggleProps) {
  const hasActionsSection =
    categoryId === "actions" && !!actionsIndexBreakdown && !!onActionsIndexChange;
  const hasPreciousMetalsSection =
    categoryId === "matieres-premieres" && !!preciousMetalsBreakdown && !!onPreciousMetalsChange;

  const isActionsDetailed =
    hasActionsSection && !isActionsIndexBreakdownDefault(actionsIndexBreakdown!);
  const metalsTotal = hasPreciousMetalsSection
    ? preciousMetalsBreakdownTotal(preciousMetalsBreakdown!)
    : 0;
  const hasAnyDetail = isActionsDetailed || metalsTotal > 0;

  // Hooks must run unconditionally, before the no-detail-at-all early return
  // below (most categories now have neither section).
  const [expanded, setExpanded] = useState(hasAnyDetail);

  if (!hasActionsSection && !hasPreciousMetalsSection) {
    return null;
  }

  const isMuted = categoryAmount === 0 && !hasAnyDetail;

  if (!expanded) {
    return (
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setExpanded(true)}
        aria-label="Détailler cette catégorie"
        className={`ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
          isMuted ? "text-line hover:text-slate" : "text-slate hover:text-ink"
        }`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    );
  }

  const sections = [
    hasActionsSection && (
      <ActionsIndexFields
        key="actions"
        breakdown={actionsIndexBreakdown!}
        onChange={onActionsIndexChange!}
        statusMessage={actionsStatusMessage ?? ""}
        statusColorClass={actionsStatusColorClass ?? "text-slate"}
      />
    ),
    hasPreciousMetalsSection && (
      <PreciousMetalsFields
        key="preciousMetals"
        breakdown={preciousMetalsBreakdown!}
        categoryAmount={categoryAmount}
        onChange={onPreciousMetalsChange!}
        statusMessage={preciousMetalsStatusMessage ?? ""}
        statusColorClass={preciousMetalsStatusColorClass ?? "text-slate"}
      />
    ),
  ].filter(Boolean);

  return (
    <div className="ml-4 flex flex-col gap-3 rounded-md border border-line bg-paper p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink">Détails</p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          Réduire
        </button>
      </div>
      {sections.map((section, index) => (
        <div key={index} className={index > 0 ? "border-t border-line pt-3" : undefined}>
          {section}
        </div>
      ))}
    </div>
  );
}
