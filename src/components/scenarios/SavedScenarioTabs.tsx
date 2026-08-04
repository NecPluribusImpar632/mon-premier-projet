"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { SavedScenario } from "@/generated/prisma/client";

interface SavedScenarioTabsProps {
  savedScenarios: SavedScenario[];
  selectedId: string | null;
  onSelect: (scenario: SavedScenario) => void;
  onSave: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function SavedScenarioTabs({
  savedScenarios,
  selectedId,
  onSelect,
  onSave,
  onDelete,
}: SavedScenarioTabsProps) {
  const [isNaming, setIsNaming] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(name.trim());
      setName("");
      setIsNaming(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {savedScenarios.map((scenario) => (
        <span
          key={scenario.id}
          className={`flex items-center gap-1 rounded-full border py-1.5 pl-4 pr-1.5 text-sm font-medium transition-colors ${
            selectedId === scenario.id
              ? "border-emerald bg-emerald-tint text-emerald-strong"
              : "border-line bg-surface text-slate hover:text-ink"
          }`}
        >
          <button type="button" onClick={() => onSelect(scenario)}>
            {scenario.name}
          </button>
          <button
            type="button"
            aria-label={`Supprimer ${scenario.name}`}
            onClick={() => onDelete(scenario.id)}
            className="rounded-full p-1 text-slate/60 transition-colors hover:text-bronze"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {isNaming ? (
        <span className="flex items-center gap-1 rounded-full border border-emerald bg-surface py-1 pl-3 pr-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setIsNaming(false);
                setName("");
              }
            }}
            placeholder="Nom du scénario"
            className="w-36 bg-transparent text-sm text-ink outline-none placeholder:text-slate/50"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="rounded-full p-1 text-emerald transition-colors hover:text-emerald-strong disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsNaming(false);
              setName("");
            }}
            className="rounded-full p-1 text-slate/60 transition-colors hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setIsNaming(true)}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-line px-4 py-2 text-sm font-medium text-slate transition-colors hover:border-emerald hover:text-emerald"
        >
          <Plus className="h-3.5 w-3.5" />
          Enregistrer ce scénario
        </button>
      )}
    </div>
  );
}
