"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { computeInflationImpact } from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";

interface InflationScenarioCardProps {
  properties: Property[];
  inflationPct: number;
  onInflationPctChange: (value: number) => void;
}

export function InflationScenarioCard({
  properties,
  inflationPct,
  onInflationPctChange,
}: InflationScenarioCardProps) {
  const [years, setYears] = useState(5);

  if (properties.length === 0) {
    return (
      <ScenarioCard
        icon={TrendingUp}
        title="Scénario inflation"
        description="Érosion de la dette réelle et progression des loyers."
      >
        <p className="text-sm text-slate">
          Aucun bien immobilier enregistré pour ce client.
        </p>
      </ScenarioCard>
    );
  }

  const result = computeInflationImpact(properties, inflationPct, years);

  return (
    <ScenarioCard
      icon={TrendingUp}
      title="Scénario inflation"
      description="Érosion de la dette réelle et progression des loyers."
    >
      <ShockSlider
        label="Inflation annuelle"
        value={inflationPct}
        min={0}
        max={8}
        step={0.5}
        onChange={onInflationPctChange}
      />

      <label className="flex items-center justify-between gap-4 text-sm text-ink">
        Horizon (années)
        <input
          type="number"
          min={1}
          max={20}
          step={1}
          value={years}
          onChange={(e) => setYears(Math.max(1, Number(e.target.value)))}
          className={`w-16 ${NUMERIC_FIELD_CLASS}`}
        />
      </label>

      <ul className="flex flex-col gap-2 text-xs">
        {result.perProperty.map((property) => (
          <li key={property.propertyId} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-slate">{property.propertyName}</span>
              <span
                className={
                  property.isAdvantaged ? "text-emerald-strong" : "text-slate"
                }
              >
                {property.isAdvantaged
                  ? "Avantagé"
                  : property.remainingLoanAmount === 0
                    ? "Déjà remboursé"
                    : "Neutre"}
              </span>
            </div>
            {property.remainingLoanAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-ink">Dette réelle dans {years} ans</span>
                <span className="font-mono tabular-nums text-emerald-strong">
                  {formatCurrency(property.realDebtAfterYears)}
                </span>
              </div>
            )}
            {property.projectedMonthlyRent !== null && (
              <div className="flex items-center justify-between">
                <span className="text-ink">Loyer projeté dans {years} ans</span>
                <span className="font-mono tabular-nums text-ink">
                  {formatCurrency(property.projectedMonthlyRent)}/mois
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </ScenarioCard>
  );
}
