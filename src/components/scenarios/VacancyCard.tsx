"use client";

import { useState } from "react";
import { CalendarOff } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { computeVacancyImpact } from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";
import { FIELD_CLASS, NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";

interface VacancyCardProps {
  properties: Property[];
}

export function VacancyCard({ properties }: VacancyCardProps) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [months, setMonths] = useState(3);

  if (properties.length === 0) {
    return (
      <ScenarioCard
        icon={CalendarOff}
        title="Vacance locative prolongée"
        description="Perte de loyer sur un bien donné."
      >
        <p className="text-sm text-slate">
          Aucun bien immobilier enregistré pour ce client.
        </p>
      </ScenarioCard>
    );
  }

  const property = properties.find((p) => p.id === propertyId) ?? properties[0];
  const result = computeVacancyImpact(property, months);

  return (
    <ScenarioCard
      icon={CalendarOff}
      title="Vacance locative prolongée"
      description="Perte de loyer sur un bien donné."
    >
      <label className="flex flex-col gap-1.5 text-sm text-ink">
        Bien
        <select
          value={property.id}
          onChange={(e) => setPropertyId(e.target.value)}
          className={FIELD_CLASS}
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center justify-between gap-4 text-sm text-ink">
        Durée de vacance (mois)
        <input
          type="number"
          min={0}
          max={36}
          step={1}
          value={months}
          onChange={(e) => setMonths(Math.max(0, Number(e.target.value)))}
          className={`w-16 ${NUMERIC_FIELD_CLASS}`}
        />
      </label>

      {result.monthlyRent === 0 ? (
        <p className="text-sm text-slate">Ce bien n&apos;est pas loué.</p>
      ) : (
        <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
          <p className="flex items-center justify-between text-ink">
            <span>Loyer mensuel</span>
            <span className="font-mono tabular-nums">
              {formatCurrency(result.monthlyRent)}
            </span>
          </p>
          <p className="flex items-center justify-between text-ink">
            <span>Loyer perdu sur {months} mois</span>
            <span className="font-mono tabular-nums text-bronze">
              -{formatCurrency(result.lostRent)}
            </span>
          </p>
        </div>
      )}
    </ScenarioCard>
  );
}
