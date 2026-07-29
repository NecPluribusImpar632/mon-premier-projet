"use client";

import { useEffect, useState } from "react";
import { AllocationForm } from "@/components/allocation/AllocationForm";
import { AllocationDonutChart } from "@/components/allocation/AllocationDonutChart";
import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import type { AllocationEntry } from "@/types/allocation";

const STORAGE_KEY = "allocation-entries";

function getInitialEntries(): AllocationEntry[] {
  return ASSET_CATEGORIES.map((category) => ({
    categoryId: category.id,
    percentage: 0,
  }));
}

export default function AllocationPage() {
  const [entries, setEntries] = useState<AllocationEntry[]>(getInitialEntries);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount
      setEntries(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const total = entries.reduce((sum, e) => sum + e.percentage, 0);

  function handleChange(categoryId: string, percentage: number) {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.categoryId === categoryId ? { ...entry, percentage } : entry
      )
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Allocation d&apos;actifs
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Répartissez le patrimoine par classe d&apos;actifs.
        </p>
      </div>

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
        </div>

        <div className="flex justify-center sm:justify-start">
          <AllocationDonutChart entries={entries} />
        </div>
      </div>
    </div>
  );
}
