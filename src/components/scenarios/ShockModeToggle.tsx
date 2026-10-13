"use client";

import type { ShockMode } from "@/lib/scenarios/calculations";

interface ShockModeToggleProps {
  mode: ShockMode;
  derivedLabel: string;
  fixedLabel: string;
  onChange: (mode: ShockMode) => void;
}

/** Two-position pill switch between "derived from the rate" and "shock set
 * directly", same look as the Oui/Non toggles elsewhere in the app. */
export function ShockModeToggle({ mode, derivedLabel, fixedLabel, onChange }: ShockModeToggleProps) {
  const options: { value: ShockMode; label: string }[] = [
    { value: "derived", label: derivedLabel },
    { value: "fixed", label: fixedLabel },
  ];
  return (
    <div className="inline-flex w-fit gap-1 rounded-full border border-line bg-paper p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            mode === option.value ? "bg-surface text-ink" : "text-slate hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
