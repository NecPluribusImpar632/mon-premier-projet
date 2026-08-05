"use client";

import { useState } from "react";
import type { AmortizationInputs as AmortizationInputsValue } from "@/lib/fiscal/amortization";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";

interface AmortizationInputsProps {
  value: AmortizationInputsValue;
  onChange: (value: AmortizationInputsValue) => void;
}

export function AmortizationInputs({ value, onChange }: AmortizationInputsProps) {
  const [expanded, setExpanded] = useState(value.mode === "detailed");

  function expand() {
    // Répartition de départ à partir de la valeur globale — une convention
    // ajustable, pas une règle : bâti ~90%, agencements et mobilier ~5%
    // chacun de la valeur amortissable actuelle.
    onChange({
      ...value,
      mode: "detailed",
      detailed: {
        bati: { value: Math.round(value.global.value * 0.9), durationYears: value.global.durationYears },
        agencements: { value: Math.round(value.global.value * 0.05), durationYears: 10 },
        mobilier: { value: Math.round(value.global.value * 0.05), durationYears: 7 },
      },
    });
    setExpanded(true);
  }

  function collapse() {
    onChange({ ...value, mode: "global" });
    setExpanded(false);
  }

  if (!expanded) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1.5 text-sm text-ink">
            Valeur amortissable (€)
            <FormattedNumberInput
              value={value.global.value}
              onChange={(v) => onChange({ ...value, global: { ...value.global, value: v } })}
              className={NUMERIC_FIELD_CLASS}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-sm text-ink">
            Durée (années)
            <input
              type="number"
              min={1}
              step={1}
              value={value.global.durationYears}
              onChange={(e) =>
                onChange({
                  ...value,
                  global: { ...value.global, durationYears: Number(e.target.value) },
                })
              }
              className={NUMERIC_FIELD_CLASS}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={expand}
          className="w-fit text-left text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          Détailler la répartition par composant
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-line bg-paper p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate">Répartition par composant</p>
        <button
          type="button"
          onClick={collapse}
          className="text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          Réduire
        </button>
      </div>
      {(
        [
          ["bati", "Bâti"],
          ["agencements", "Agencements"],
          ["mobilier", "Mobilier"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="flex items-end gap-3">
          <label className="flex flex-1 flex-col gap-1.5 text-xs text-ink">
            {label} (€)
            <FormattedNumberInput
              value={value.detailed[key].value}
              onChange={(v) =>
                onChange({
                  ...value,
                  detailed: { ...value.detailed, [key]: { ...value.detailed[key], value: v } },
                })
              }
              className={`w-full ${NUMERIC_FIELD_CLASS}`}
            />
          </label>
          <label className="flex w-24 flex-col gap-1.5 text-xs text-ink">
            Durée (ans)
            <input
              type="number"
              min={1}
              step={1}
              value={value.detailed[key].durationYears}
              onChange={(e) =>
                onChange({
                  ...value,
                  detailed: {
                    ...value.detailed,
                    [key]: { ...value.detailed[key], durationYears: Number(e.target.value) },
                  },
                })
              }
              className={NUMERIC_FIELD_CLASS}
            />
          </label>
        </div>
      ))}
    </div>
  );
}
