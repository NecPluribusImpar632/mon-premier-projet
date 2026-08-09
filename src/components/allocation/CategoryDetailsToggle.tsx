"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { FINANCIAL_CATEGORY_IDS } from "@/lib/allocation/categories";
import { wrapperBreakdownTotal, type Wrapper, type WrapperBreakdown } from "@/lib/allocation/wrappers";
import {
  preciousMetalsBreakdownTotal,
  type PreciousMetal,
  type PreciousMetalsBreakdown,
} from "@/lib/allocation/preciousMetals";
import type { ActionsProfileBreakdown } from "@/lib/allocation/stockProfiles";
import { ActionsProfileFields } from "@/components/allocation/ActionsProfileFields";
import { WrapperFields } from "@/components/allocation/WrapperFields";
import { PreciousMetalsFields } from "@/components/allocation/PreciousMetalsFields";

interface CategoryDetailsToggleProps {
  categoryId: string;
  categoryAmount: number;
  wrapperBreakdown: WrapperBreakdown;
  onWrapperChange: (wrapper: Wrapper, amount: number) => void;
  wrapperStatusMessage: string;
  wrapperStatusColorClass: string;
  actionsBreakdown?: ActionsProfileBreakdown;
  onActionsChange?: (profile: keyof ActionsProfileBreakdown, percentage: number) => void;
  actionsStatusMessage?: string;
  actionsStatusColorClass?: string;
  preciousMetalsBreakdown?: PreciousMetalsBreakdown;
  onPreciousMetalsChange?: (metal: PreciousMetal, amount: number) => void;
  preciousMetalsStatusMessage?: string;
  preciousMetalsStatusColorClass?: string;
}

/**
 * One entry point per category instead of up to three stacked "Détailler..."
 * text links (profils actions, enveloppes fiscales, composition or/argent) —
 * a single muted icon that opens a panel grouping whichever of those apply
 * to this category. Collapsed by default unless something's already been
 * detailed; the icon itself never disappears (so previously-entered detail
 * stays reachable even if the category amount is later zeroed out), it just
 * reads as quieter when there's nothing behind it yet.
 */
export function CategoryDetailsToggle({
  categoryId,
  categoryAmount,
  wrapperBreakdown,
  onWrapperChange,
  wrapperStatusMessage,
  wrapperStatusColorClass,
  actionsBreakdown,
  onActionsChange,
  actionsStatusMessage,
  actionsStatusColorClass,
  preciousMetalsBreakdown,
  onPreciousMetalsChange,
  preciousMetalsStatusMessage,
  preciousMetalsStatusColorClass,
}: CategoryDetailsToggleProps) {
  const hasActionsSection = categoryId === "actions" && !!actionsBreakdown && !!onActionsChange;
  const hasPreciousMetalsSection =
    categoryId === "matieres-premieres" && !!preciousMetalsBreakdown && !!onPreciousMetalsChange;
  const hasWrapperSection = (FINANCIAL_CATEGORY_IDS as string[]).includes(categoryId);

  const isActionsDetailed = hasActionsSection && actionsBreakdown!.indiciel !== 100;
  const wrapperTotal = hasWrapperSection ? wrapperBreakdownTotal(wrapperBreakdown) : 0;
  const metalsTotal = hasPreciousMetalsSection
    ? preciousMetalsBreakdownTotal(preciousMetalsBreakdown!)
    : 0;
  const hasAnyDetail = isActionsDetailed || wrapperTotal > 0 || metalsTotal > 0;

  // Hooks must run unconditionally, before the no-detail-at-all early return
  // below (Immobilier has none of the three sections).
  const [expanded, setExpanded] = useState(hasAnyDetail);

  if (!hasActionsSection && !hasPreciousMetalsSection && !hasWrapperSection) {
    return null;
  }

  const isMuted = categoryAmount === 0 && !hasAnyDetail;

  if (!expanded) {
    return (
      <button
        type="button"
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
      <ActionsProfileFields
        key="actions"
        breakdown={actionsBreakdown!}
        onChange={onActionsChange!}
        statusMessage={actionsStatusMessage ?? ""}
        statusColorClass={actionsStatusColorClass ?? "text-slate"}
      />
    ),
    hasWrapperSection && (
      <WrapperFields
        key="wrapper"
        breakdown={wrapperBreakdown}
        categoryAmount={categoryAmount}
        onChange={onWrapperChange}
        statusMessage={wrapperStatusMessage}
        statusColorClass={wrapperStatusColorClass}
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
