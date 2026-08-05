"use client";

import { Landmark } from "lucide-react";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { CollapsibleScenarioCard } from "@/components/scenarios/CollapsibleScenarioCard";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { computeObligationsShockImpact } from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface ObligationsShockCardProps {
  obligationsAmount: number;
  oatRateChangePts: number;
  durationYears: number;
  onDurationYearsChange: (value: number) => void;
}

export function ObligationsShockCard({
  obligationsAmount,
  oatRateChangePts,
  durationYears,
  onDurationYearsChange,
}: ObligationsShockCardProps) {
  if (obligationsAmount === 0) {
    return (
      <ScenarioCard
        icon={Landmark}
        title="Choc obligataire"
        description="Sensibilité du prix des obligations à une variation des taux."
      >
        <p className="text-sm text-slate">
          Aucune allocation Obligations définie pour ce client.
        </p>
      </ScenarioCard>
    );
  }

  const result = computeObligationsShockImpact(
    obligationsAmount,
    oatRateChangePts,
    durationYears
  );
  const isActive = result.deltaValue !== 0;
  const summaryValue = isActive
    ? `${result.deltaValue >= 0 ? "+" : ""}${formatCurrency(result.deltaValue)}`
    : "Aucun choc appliqué";

  return (
    <CollapsibleScenarioCard
      icon={Landmark}
      title="Choc obligataire"
      description="Sensibilité du prix des obligations à une variation des taux."
      summaryValue={summaryValue}
      isActive={isActive}
    >
      <ShockSlider
        label="Duration (sensibilité)"
        value={durationYears}
        min={1}
        max={15}
        step={1}
        suffix=" ans"
        onChange={onDurationYearsChange}
      />

      <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
        <p className="flex items-center justify-between text-ink">
          <span>Valeur actuelle</span>
          <span className="font-mono tabular-nums">
            {formatCurrency(result.currentValue)}
          </span>
        </p>
        <p className="flex items-center justify-between text-ink">
          <span>Nouvelle valeur</span>
          <span className="font-mono tabular-nums">
            {formatCurrency(result.newValue)}
          </span>
        </p>
        <p className="flex items-center justify-between text-ink">
          <span>Variation</span>
          <span
            className={`font-mono tabular-nums ${
              result.deltaValue < 0 ? "text-bronze" : "text-emerald-strong"
            }`}
          >
            {result.deltaValue >= 0 ? "+" : ""}
            {formatCurrency(result.deltaValue)}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-1.5 border-t border-line pt-3 text-xs text-slate">
        <span>Méthodologie</span>
        <InfoTooltip>
          Approximation de duration modifiée : ΔPrix/Prix ≈ -duration × Δtaux.
          Pilotée par le même curseur de variation du taux OAT que le choc
          immobilier. La duration est une hypothèse manuelle — l&apos;app ne
          connaît pas les maturités réelles des titres détenus par le client ;
          6 ans est une valeur de départ typique pour un fonds obligataire
          diversifié, à ajuster selon le profil réel.
        </InfoTooltip>
      </div>
    </CollapsibleScenarioCard>
  );
}
