"use client";

import { useState, useTransition } from "react";
import { AllocationForm } from "@/components/allocation/AllocationForm";
import { AllocationDonutChart } from "@/components/allocation/AllocationDonutChart";
import { updateClientAllocation } from "@/lib/actions/clients";
import type { AllocationEntry } from "@/types/allocation";

interface ClientAllocationEditorProps {
  clientId: string;
  initialEntries: AllocationEntry[];
}

export function ClientAllocationEditor({
  clientId,
  initialEntries,
}: ClientAllocationEditorProps) {
  const [entries, setEntries] = useState<AllocationEntry[]>(initialEntries);
  const [isPending, startTransition] = useTransition();

  const total = entries.reduce((sum, e) => sum + e.percentage, 0);

  function handleChange(categoryId: string, percentage: number) {
    const next = entries.map((entry) =>
      entry.categoryId === categoryId ? { ...entry, percentage } : entry
    );
    setEntries(next);
    startTransition(async () => {
      await updateClientAllocation(clientId, next);
    });
  }

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
        <p className="mt-1 h-4 text-xs text-zinc-400">
          {isPending ? "Enregistrement..." : "Enregistré"}
        </p>
      </div>

      <div className="flex justify-center sm:justify-start">
        <AllocationDonutChart entries={entries} />
      </div>
    </div>
  );
}
