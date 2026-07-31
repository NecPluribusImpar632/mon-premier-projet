"use client";

import { useState, useTransition } from "react";
import { AllocationForm } from "@/components/allocation/AllocationForm";
import { AllocationAmountForm } from "@/components/allocation/AllocationAmountForm";
import { AllocationDonutChart } from "@/components/allocation/AllocationDonutChart";
import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import {
  updateClientAllocation,
  updateActionsProfile,
} from "@/lib/actions/clients";
import {
  getTotalPercentage,
  isAllocationComplete,
  percentagesFromAmounts,
} from "@/lib/allocation/validation";
import { isActionsBreakdownComplete } from "@/lib/allocation/stockProfiles";
import type { AllocationEntry } from "@/types/allocation";
import type { ActionsProfileBreakdown } from "@/lib/allocation/stockProfiles";

interface ClientAllocationEditorProps {
  clientId: string;
  initialEntries: AllocationEntry[];
  initialActionsBreakdown: ActionsProfileBreakdown;
}

type SaveStatus = "saved" | "saving" | "incomplete" | "error";
type InputMode = "percentage" | "amount";

const CATEGORY_IDS = ASSET_CATEGORIES.map((c) => c.id);

const STATUS_MESSAGE: Record<SaveStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement...",
  incomplete: "Non enregistré — le total doit être égal à 100 %",
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
  initialEntries,
  initialActionsBreakdown,
}: ClientAllocationEditorProps) {
  const [entries, setEntries] = useState<AllocationEntry[]>(initialEntries);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<InputMode>("percentage");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<SaveStatus>(
    isAllocationComplete(initialEntries) ? "saved" : "incomplete"
  );

  const [actionsBreakdown, setActionsBreakdown] = useState<ActionsProfileBreakdown>(
    initialActionsBreakdown
  );
  const [isActionsPending, startActionsTransition] = useTransition();
  const [actionsStatus, setActionsStatus] = useState<SaveStatus>(
    isActionsBreakdownComplete(initialActionsBreakdown) ? "saved" : "incomplete"
  );

  const total = getTotalPercentage(entries);

  function persist(next: AllocationEntry[]) {
    setEntries(next);

    if (!isAllocationComplete(next)) {
      setStatus("incomplete");
      return;
    }

    setStatus("saving");
    startTransition(async () => {
      try {
        await updateClientAllocation(clientId, next);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  function handlePercentageChange(categoryId: string, rawPercentage: number) {
    const othersTotal = entries
      .filter((entry) => entry.categoryId !== categoryId)
      .reduce((sum, entry) => sum + entry.percentage, 0);
    const maxAllowed = Math.max(0, 100 - othersTotal);
    const percentage = Math.min(rawPercentage, maxAllowed);

    persist(
      entries.map((entry) =>
        entry.categoryId === categoryId ? { ...entry, percentage } : entry
      )
    );
  }

  function handleAmountChange(categoryId: string, amount: number) {
    const nextAmounts = { ...amounts, [categoryId]: amount };
    setAmounts(nextAmounts);

    const nextPercentages = percentagesFromAmounts(nextAmounts, CATEGORY_IDS);
    persist(
      CATEGORY_IDS.map((id) => ({
        categoryId: id,
        percentage: nextPercentages[id] ?? 0,
      }))
    );
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

    if (!isActionsBreakdownComplete(next)) {
      setActionsStatus("incomplete");
      return;
    }

    setActionsStatus("saving");
    startActionsTransition(async () => {
      try {
        await updateActionsProfile(clientId, next);
        setActionsStatus("saved");
      } catch {
        setActionsStatus("error");
      }
    });
  }

  const percentagesByCategory = Object.fromEntries(
    entries.map((entry) => [entry.categoryId, entry.percentage])
  );

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
      <div className="mx-auto w-full max-w-3xl lg:mx-0 lg:w-[380px] lg:shrink-0">
        <div className="inline-flex w-fit gap-1 rounded-full border border-line bg-paper p-1">
          <button
            type="button"
            onClick={() => setMode("percentage")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              mode === "percentage"
                ? "bg-surface text-ink"
                : "text-slate hover:text-ink"
            }`}
          >
            Pourcentage
          </button>
          <button
            type="button"
            onClick={() => setMode("amount")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              mode === "amount"
                ? "bg-surface text-ink"
                : "text-slate hover:text-ink"
            }`}
          >
            Montant (€)
          </button>
        </div>

        <div className="mt-6">
          {mode === "percentage" ? (
            <AllocationForm
              entries={entries}
              onChange={handlePercentageChange}
              actionsBreakdown={actionsBreakdown}
              onActionsBreakdownChange={handleActionsBreakdownChange}
              actionsStatusMessage={
                STATUS_MESSAGE[isActionsPending ? "saving" : actionsStatus]
              }
              actionsStatusColorClass={
                STATUS_COLOR[isActionsPending ? "saving" : actionsStatus]
              }
            />
          ) : (
            <AllocationAmountForm
              amounts={amounts}
              percentages={percentagesByCategory}
              onChange={handleAmountChange}
            />
          )}

          <div className="mt-5 flex items-center gap-2.5 border-t border-line pt-4">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-sm tabular-nums ${
                total === 100
                  ? "bg-emerald-tint text-emerald-strong"
                  : "bg-bronze-tint text-bronze"
              }`}
            >
              Total {total}%
            </span>
            {mode === "percentage" && total < 100 && (
              <span className="text-xs text-slate">
                doit être égal à 100 %
              </span>
            )}
          </div>
          <p
            className={`mt-1.5 h-4 text-xs ${STATUS_COLOR[isPending ? "saving" : status]}`}
          >
            {STATUS_MESSAGE[isPending ? "saving" : status]}
          </p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <AllocationDonutChart entries={entries} />
      </div>
    </div>
  );
}
