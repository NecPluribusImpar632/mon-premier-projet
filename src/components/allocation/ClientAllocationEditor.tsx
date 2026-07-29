"use client";

import { useState, useTransition } from "react";
import { AllocationForm } from "@/components/allocation/AllocationForm";
import { AllocationDonutChart } from "@/components/allocation/AllocationDonutChart";
import { updateClientAllocation } from "@/lib/actions/clients";
import {
  getTotalPercentage,
  isAllocationComplete,
} from "@/lib/allocation/validation";
import type { AllocationEntry } from "@/types/allocation";

interface ClientAllocationEditorProps {
  clientId: string;
  initialEntries: AllocationEntry[];
}

type SaveStatus = "saved" | "saving" | "incomplete" | "error";

export function ClientAllocationEditor({
  clientId,
  initialEntries,
}: ClientAllocationEditorProps) {
  const [entries, setEntries] = useState<AllocationEntry[]>(initialEntries);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<SaveStatus>(
    isAllocationComplete(initialEntries) ? "saved" : "incomplete"
  );

  const total = getTotalPercentage(entries);

  function handleChange(categoryId: string, percentage: number) {
    const next = entries.map((entry) =>
      entry.categoryId === categoryId ? { ...entry, percentage } : entry
    );
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

  const statusMessage: Record<SaveStatus, string> = {
    saved: "Enregistré",
    saving: "Enregistrement...",
    incomplete: "Non enregistré — le total doit être égal à 100 %",
    error: "Erreur lors de l'enregistrement",
  };

  const statusColor: Record<SaveStatus, string> = {
    saved: "text-zinc-400",
    saving: "text-zinc-400",
    incomplete: "text-amber-600 dark:text-amber-400",
    error: "text-red-600 dark:text-red-400",
  };

  return (
    <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
      <div className="flex-1">
        <AllocationForm entries={entries} onChange={handleChange} />
        <p
          className={`mt-4 text-sm font-medium ${
            total === 100
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          Total : {total}% {total !== 100 && "(doit être égal à 100%)"}
        </p>
        <p className={`mt-1 h-4 text-xs ${statusColor[isPending ? "saving" : status]}`}>
          {statusMessage[isPending ? "saving" : status]}
        </p>
      </div>

      <div className="flex justify-center sm:justify-start">
        <AllocationDonutChart entries={entries} />
      </div>
    </div>
  );
}
