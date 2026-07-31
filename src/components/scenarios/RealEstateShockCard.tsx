"use client";

import { useState } from "react";
import { Home } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { computeRealEstateShockImpact } from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";

interface RealEstateShockCardProps {
  properties: Property[];
}

export function RealEstateShockCard({ properties }: RealEstateShockCardProps) {
  const [shockPct, setShockPct] = useState(-10);

  if (properties.length === 0) {
    return (
      <ScenarioCard
        icon={Home}
        title="Choc immobilier"
        description="Baisse du prix des biens."
      >
        <p className="text-sm text-slate">
          Aucun bien immobilier enregistré pour ce client.
        </p>
      </ScenarioCard>
    );
  }

  const result = computeRealEstateShockImpact(properties, shockPct);

  return (
    <ScenarioCard
      icon={Home}
      title="Choc immobilier"
      description="Baisse du prix des biens."
    >
      <ShockSlider
        label="Baisse des prix"
        value={shockPct}
        min={-40}
        max={0}
        onChange={setShockPct}
      />

      <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
        <p className="flex items-center justify-between text-ink">
          <span>Valeur totale actuelle</span>
          <span className="font-mono tabular-nums">
            {formatCurrency(result.totalCurrentValue)}
          </span>
        </p>
        <p className="flex items-center justify-between text-ink">
          <span>Nouvelle valeur totale</span>
          <span className="font-mono tabular-nums">
            {formatCurrency(result.totalNewValue)}
          </span>
        </p>
        <p className="flex items-center justify-between text-ink">
          <span>Variation</span>
          <span className="font-mono tabular-nums text-bronze">
            {formatCurrency(result.totalDelta)}
          </span>
        </p>
      </div>

      <ul className="flex flex-col gap-1.5 border-t border-line pt-3 text-xs">
        {result.perProperty.map((property) => (
          <li
            key={property.propertyId}
            className="flex items-center justify-between gap-3"
          >
            <span className="text-slate">{property.propertyName}</span>
            <span
              className={`font-mono tabular-nums ${
                property.isUnderwater ? "text-bronze" : "text-ink"
              }`}
            >
              {formatCurrency(property.newEquity)} équité
              {property.isUnderwater && " ⚠"}
            </span>
          </li>
        ))}
      </ul>
    </ScenarioCard>
  );
}
