"use client";

import { useState } from "react";
import { Percent } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { computeRateHikeImpact } from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";

interface RateHikeShockCardProps {
  properties: Property[];
}

export function RateHikeShockCard({ properties }: RateHikeShockCardProps) {
  const [hikePts, setHikePts] = useState(1.5);

  if (properties.length === 0) {
    return (
      <ScenarioCard
        icon={Percent}
        title="Hausse des taux"
        description="Impact sur le cashflow selon le type de taux."
      >
        <p className="text-sm text-slate">
          Aucun bien immobilier enregistré pour ce client.
        </p>
      </ScenarioCard>
    );
  }

  const result = computeRateHikeImpact(properties, hikePts);

  return (
    <ScenarioCard
      icon={Percent}
      title="Hausse des taux"
      description="Impact sur le cashflow selon le type de taux."
    >
      <ShockSlider
        label="Hausse des taux"
        value={hikePts}
        min={0}
        max={5}
        step={0.25}
        suffix=" pts"
        onChange={setHikePts}
      />

      <ul className="flex flex-col gap-2 text-xs">
        {result.perProperty.map((property) => (
          <li key={property.propertyId} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-slate">{property.propertyName}</span>
              <span className="text-slate">
                {property.isFixed ? "Taux fixe" : "Taux variable"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink">
                {property.isFixed
                  ? "Protégé — cashflow inchangé (mais pas d'amélioration)"
                  : "Mensualité en hausse"}
              </span>
              <span
                className={`font-mono tabular-nums ${
                  property.extraMonthlyCost > 0 ? "text-bronze" : "text-slate"
                }`}
              >
                {property.extraMonthlyCost > 0
                  ? `-${formatCurrency(property.extraMonthlyCost)}/mois`
                  : "—"}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="flex items-center justify-between border-t border-line pt-3 text-sm text-ink">
        <span>Surcoût mensuel total</span>
        <span className="font-mono tabular-nums text-bronze">
          -{formatCurrency(result.totalExtraMonthlyCost)}
        </span>
      </p>
    </ScenarioCard>
  );
}
