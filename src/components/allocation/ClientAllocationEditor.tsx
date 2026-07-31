"use client";

import { useState, useTransition } from "react";
import { AllocationForm } from "@/components/allocation/AllocationForm";
import { AllocationAmountForm } from "@/components/allocation/AllocationAmountForm";
import { AllocationDonutChart } from "@/components/allocation/AllocationDonutChart";
import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import { updateClientAllocation } from "@/lib/actions/clients";
import {
  getTotalPercentage,
  isAllocationComplete,
  percentagesFromAmounts,
} from "@/lib/allocation/validation";
import type { AllocationEntry } from "@/types/allocation";

interface ClientAllocationEditorProps {
  clientId: string;
  initialEntries: AllocationEntry[];
}

type SaveStatus = "saved" | "saving" | "incomplete" | "error";
type InputMode = "percentage" | "amount";

const CATEGORY_IDS = ASSET_CATEGORIES.map((c) => c.id);

export function ClientAllocationEditor({
  clientId,
  initialEntries,
}: ClientAllocationEditorProps) {
  const [entries, setEntries] = useState<AllocationEntry[]>(initialEntries);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<InputMode>("percentage");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<SaveStatus>(
    isAllocationComplete(initialEntries) ? "saved" : "incomplete"
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

  const statusMessage: Record<SaveStatus, string> = {
    saved: "Enregistré",
    saving: "Enregistrement...",
    incomplete: "Non enregistré — le total doit être égal à 100 %",
    error: "Erreur lors de l'enregistrement",
  };

  const statusColor: Record<SaveStatus, string> = {
    saved: "text-slate",
    saving: "text-slate",
    incomplete: "text-bronze",
    error: "text-bronze",
  };

  const percentagesByCategory = Object.fromEntries(
    entries.map((entry) => [entry.categoryId, entry.percentage])
  );

  return (
    <div className="flex flex-col gap-7">
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
            mode === "amount" ? "bg-surface text-ink" : "text-slate hover:text-ink"
          }`}
        >
          Montant (€)
        </button>
      </div>

      <div className="flex flex-col gap-10 sm:flex-row sm:items-start">
        <div className="flex-1">
          {mode === "percentage" ? (
            <AllocationForm entries={entries} onChange={handlePercentageChange} />
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
            className={`mt-1.5 h-4 text-xs ${statusColor[isPending ? "saving" : status]}`}
          >
            {statusMessage[isPending ? "saving" : status]}
          </p>
        </div>

        <div className="flex justify-center sm:justify-start">
          <AllocationDonutChart entries={entries} />
        </div>
      </div>
    </div>
  );
}
