"use client";

import { useState } from "react";
import { ASSET_CATEGORIES, FINANCIAL_CATEGORY_IDS } from "@/lib/allocation/categories";
import { emptyWrapperBreakdown, type Wrapper, type WrapperBreakdown } from "@/lib/allocation/wrappers";
import { updateWrapperBreakdown } from "@/lib/actions/clients";
import { WrapperFields } from "@/components/allocation/WrapperFields";
import { formatCurrency } from "@/lib/format/currency";

interface WrapperAllocationSectionProps {
  clientId: string;
  amounts: Record<string, number>;
  initialWrapperBreakdowns: Record<string, WrapperBreakdown>;
}

type WrapperSaveStatus = "saved" | "saving" | "error";

const WRAPPER_STATUS_MESSAGE: Record<WrapperSaveStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement...",
  error: "Erreur lors de l'enregistrement",
};

const WRAPPER_STATUS_COLOR: Record<WrapperSaveStatus, string> = {
  saved: "text-slate",
  saving: "text-slate",
  error: "text-bronze",
};

const WRAPPER_CATEGORIES = ASSET_CATEGORIES.filter((category) =>
  (FINANCIAL_CATEGORY_IDS as string[]).includes(category.id)
);

/**
 * Dedicated tab for the enveloppe fiscale breakdown (assurance-vie/PER/CTO/
 * PEA/détention directe) of every financial category — split out of the
 * Allocation tab, which stays focused on "what the client owns" rather than
 * "where it's held". The category amount here is read-only, the same data
 * entered in Allocation, just referenced rather than edited.
 */
export function WrapperAllocationSection({
  clientId,
  amounts,
  initialWrapperBreakdowns,
}: WrapperAllocationSectionProps) {
  const [wrapperBreakdowns, setWrapperBreakdowns] = useState<
    Record<string, WrapperBreakdown>
  >(initialWrapperBreakdowns);
  const [wrapperStatus, setWrapperStatus] = useState<Record<string, WrapperSaveStatus>>({});

  function handleWrapperChange(categoryId: string, wrapper: Wrapper, amount: number) {
    const next = { ...wrapperBreakdowns[categoryId], [wrapper]: amount };
    setWrapperBreakdowns((prev) => ({ ...prev, [categoryId]: next }));
    setWrapperStatus((prev) => ({ ...prev, [categoryId]: "saving" }));

    updateWrapperBreakdown(clientId, categoryId, next)
      .then(() => setWrapperStatus((prev) => ({ ...prev, [categoryId]: "saved" })))
      .catch(() => setWrapperStatus((prev) => ({ ...prev, [categoryId]: "error" })));
  }

  const relevantCategories = WRAPPER_CATEGORIES.filter(
    (category) => (amounts[category.id] ?? 0) > 0
  );

  if (relevantCategories.length === 0) {
    return (
      <p className="text-sm text-slate">
        Aucune catégorie financière renseignée pour l&apos;instant — complétez d&apos;abord
        les montants dans l&apos;onglet Allocation.
      </p>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-8">
      {relevantCategories.map((category) => (
        <div key={category.id} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-ink">{category.label}</p>
            <span className="rounded-md border border-dashed border-line bg-paper px-2 py-1 text-right font-mono text-sm tabular-nums text-slate">
              {formatCurrency(amounts[category.id] ?? 0)}
            </span>
          </div>
          <WrapperFields
            breakdown={wrapperBreakdowns[category.id] ?? emptyWrapperBreakdown()}
            categoryAmount={amounts[category.id] ?? 0}
            onChange={(wrapper, amount) => handleWrapperChange(category.id, wrapper, amount)}
            statusMessage={WRAPPER_STATUS_MESSAGE[wrapperStatus[category.id] ?? "saved"]}
            statusColorClass={WRAPPER_STATUS_COLOR[wrapperStatus[category.id] ?? "saved"]}
          />
        </div>
      ))}
    </div>
  );
}
