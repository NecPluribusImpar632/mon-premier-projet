"use client";

import { useState, useTransition } from "react";
import type { Property } from "@/generated/prisma/client";
import { AllocationAmountForm } from "@/components/allocation/AllocationAmountForm";
import { AllocationDonutChart } from "@/components/allocation/AllocationDonutChart";
import { WealthSummary } from "@/components/allocation/WealthSummary";
import {
  updateClientAllocation,
  updateActionsProfile,
} from "@/lib/actions/clients";
import {
  computeImmobilierPct,
  financialTotalFromAmounts,
  overallEntriesFromAmounts,
} from "@/lib/allocation/mapping";
import { isActionsBreakdownComplete } from "@/lib/allocation/stockProfiles";
import type { ActionsProfileBreakdown } from "@/lib/allocation/stockProfiles";

interface ClientAllocationEditorProps {
  clientId: string;
  initialAmounts: Record<string, number>;
  initialActionsBreakdown: ActionsProfileBreakdown;
  properties: Property[];
}

type SaveStatus = "saved" | "saving" | "incomplete" | "error";

const STATUS_MESSAGE: Record<SaveStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement...",
  incomplete: "Enregistré — total incomplet",
  error: "Erreur lors de l'enregistrement",
};

const STATUS_COLOR: Record<SaveStatus, string> = {
  saved: "text-slate",
  saving: "text-slate",
  incomplete: "text-bronze",
  error: "text-bronze",
};

export function ClientAllocationEditor({
  clientId,
  initialAmounts,
  initialActionsBreakdown,
  properties,
}: ClientAllocationEditorProps) {
  const [amounts, setAmounts] = useState<Record<string, number>>(initialAmounts);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<SaveStatus>("saved");

  const [actionsBreakdown, setActionsBreakdown] = useState<ActionsProfileBreakdown>(
    initialActionsBreakdown
  );
  const [isActionsPending, startActionsTransition] = useTransition();
  const [actionsStatus, setActionsStatus] = useState<SaveStatus>(
    isActionsBreakdownComplete(initialActionsBreakdown) ? "saved" : "incomplete"
  );

  const totalPropertyValue = properties.reduce((sum, p) => sum + p.currentValue, 0);
  const financialTotal = financialTotalFromAmounts(amounts);
  const immobilierPct = computeImmobilierPct(financialTotal, totalPropertyValue);
  const overallEntries = overallEntriesFromAmounts(amounts, totalPropertyValue);
  const percentagesByCategory = Object.fromEntries(
    overallEntries.map((entry) => [entry.categoryId, entry.percentage])
  );

  function handleAmountChange(categoryId: string, amount: number) {
    const nextAmounts = { ...amounts, [categoryId]: amount };
    setAmounts(nextAmounts);

    setStatus("saving");
    startTransition(async () => {
      try {
        await updateClientAllocation(clientId, nextAmounts);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  function handleActionsBreakdownChange(
    profile: keyof ActionsProfileBreakdown,
    rawPercentage: number
  ) {
    const othersTotal = (
      Object.keys(actionsBreakdown) as (keyof ActionsProfileBreakdown)[]
    )
      .filter((key) => key !== profile)
      .reduce((sum, key) => sum + actionsBreakdown[key], 0);
    const maxAllowed = Math.max(0, 100 - othersTotal);
    const percentage = Math.min(rawPercentage, maxAllowed);

    const next: ActionsProfileBreakdown = { ...actionsBreakdown, [profile]: percentage };
    setActionsBreakdown(next);

    const complete = isActionsBreakdownComplete(next);
    setActionsStatus("saving");
    startActionsTransition(async () => {
      try {
        await updateActionsProfile(clientId, next);
        setActionsStatus(complete ? "saved" : "incomplete");
      } catch {
        setActionsStatus("error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
      <div className="mx-auto w-full max-w-3xl lg:mx-0 lg:w-[380px] lg:shrink-0">
        <AllocationAmountForm
          amounts={amounts}
          percentages={percentagesByCategory}
          onChange={handleAmountChange}
          immobilierPct={immobilierPct}
          totalPropertyValue={totalPropertyValue}
          actionsBreakdown={actionsBreakdown}
          onActionsBreakdownChange={handleActionsBreakdownChange}
          actionsStatusMessage={
            STATUS_MESSAGE[isActionsPending ? "saving" : actionsStatus]
          }
          actionsStatusColorClass={
            STATUS_COLOR[isActionsPending ? "saving" : actionsStatus]
          }
        />

        <p
          className={`mt-4 border-t border-line pt-4 text-xs ${STATUS_COLOR[isPending ? "saving" : status]}`}
        >
          {STATUS_MESSAGE[isPending ? "saving" : status]}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <WealthSummary financialWealthTotal={financialTotal} properties={properties} />
        <AllocationDonutChart entries={overallEntries} />
      </div>
    </div>
  );
}
