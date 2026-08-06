"use client";

import { CalendarOff } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { CollapsibleScenarioCard } from "@/components/scenarios/CollapsibleScenarioCard";
import { computeVacancyImpact } from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";
import { FIELD_CLASS, NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";

interface VacancyCardProps {
  properties: Property[];
  propertyId: string;
  onPropertyIdChange: (value: string) => void;
  months: number;
  onMonthsChange: (value: number) => void;
  onRemove?: () => void;
}

export function VacancyCard({
  properties,
  propertyId,
  onPropertyIdChange,
  months,
  onMonthsChange,
  onRemove,
}: VacancyCardProps) {
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
  const isActive = result.lostRent !== 0;
  const summaryValue = isActive
    ? `-${formatCurrency(result.lostRent)}`
    : "Aucun choc appliqué";

  return (
    <CollapsibleScenarioCard
      icon={CalendarOff}
      title="Vacance locative prolongée"
      description="Perte de loyer sur un bien donné."
      summaryValue={summaryValue}
      isActive={isActive}
      onRemove={onRemove}
    >
      <label className="flex flex-col gap-1.5 text-sm text-ink">
        Bien
        <select
          value={property.id}
          onChange={(e) => onPropertyIdChange(e.target.value)}
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
          onChange={(e) => onMonthsChange(Math.max(0, Number(e.target.value)))}
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
    </CollapsibleScenarioCard>
  );
}
