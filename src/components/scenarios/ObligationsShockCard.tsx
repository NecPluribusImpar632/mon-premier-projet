"use client";

import { Landmark } from "lucide-react";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { CollapsibleScenarioCard } from "@/components/scenarios/CollapsibleScenarioCard";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { ShockModeToggle } from "@/components/scenarios/ShockModeToggle";
import { computeObligationsShockImpact } from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";
import { formatPercent } from "@/lib/format/percent";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface ObligationsShockCardProps {
  obligationsAmount: number;
  oatRateChangePts: number;
  durationYears: number;
  onDurationYearsChange: (value: number) => void;
  /** null = derived from duration × OAT move; a number is applied directly. */
  shockPct: number | null;
  onShockPctChange: (value: number | null) => void;
  onRemove?: () => void;
}

export function ObligationsShockCard({
  obligationsAmount,
  oatRateChangePts,
  durationYears,
  onDurationYearsChange,
  shockPct,
  onShockPctChange,
  onRemove,
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
    durationYears,
    shockPct
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
      onRemove={onRemove}
    >
      <ShockModeToggle
        mode={result.mode}
        derivedLabel="Duration × taux"
        fixedLabel="Variation directe"
        onChange={(mode) =>
          onShockPctChange(mode === "fixed" ? Math.round(result.shockPct) : null)
        }
      />

      {result.mode === "fixed" ? (
        <ShockSlider
          label="Variation du prix des obligations"
          value={shockPct ?? 0}
          min={-30}
          max={15}
          step={1}
          onChange={onShockPctChange}
        />
      ) : (
        <>
          <ShockSlider
            label="Duration (sensibilité)"
            value={durationYears}
            min={1}
            max={15}
            step={1}
            suffix=" ans"
            onChange={onDurationYearsChange}
          />
          <p className="text-xs text-slate">
            Taux OAT du scénario : {oatRateChangePts > 0 ? "+" : ""}
            {oatRateChangePts} pt, soit {formatPercent(result.shockPct, 1)} sur le prix.
          </p>
        </>
      )}

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
          <p className="mb-2">
            Deux modes. « Duration × taux » : approximation de duration modifiée,
            ΔPrix/Prix ≈ -duration × Δtaux, avec le taux OAT du scénario (réglable dans
            la carte Choc immobilier). La duration est une hypothèse manuelle, 6 ans
            est une valeur de départ typique pour un fonds obligataire diversifié.
          </p>
          <p>
            « Variation directe » : le pourcentage est appliqué tel quel. C&apos;est le
            mode du scénario Crise 2008 (+8 %, les obligations d&apos;État ayant monté
            quand les taux baissaient). Les scénarios 2022 et 2018 utilisent la
            duration.
          </p>
        </InfoTooltip>
      </div>
    </CollapsibleScenarioCard>
  );
}
