"use client";

import { Building } from "lucide-react";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { CollapsibleScenarioCard } from "@/components/scenarios/CollapsibleScenarioCard";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { computeScpiShockImpact } from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface ScpiShockCardProps {
  scpiAmount: number;
  shockPct: number;
  onShockPctChange: (value: number) => void;
}

export function ScpiShockCard({
  scpiAmount,
  shockPct,
  onShockPctChange,
}: ScpiShockCardProps) {
  if (scpiAmount === 0) {
    return (
      <ScenarioCard
        icon={Building}
        title="Choc SCPI"
        description="Décote de part et risque de suspension des rachats."
      >
        <p className="text-sm text-slate">
          Aucune allocation SCPI définie pour ce client.
        </p>
      </ScenarioCard>
    );
  }

  const result = computeScpiShockImpact(scpiAmount, shockPct);
  const isActive = result.deltaValue !== 0;
  const summaryValue = isActive
    ? formatCurrency(result.deltaValue)
    : "Aucun choc appliqué";

  return (
    <CollapsibleScenarioCard
      icon={Building}
      title="Choc SCPI"
      description="Décote de part et risque de suspension des rachats."
      summaryValue={summaryValue}
      isActive={isActive}
    >
      <ShockSlider
        label="Décote de part"
        value={shockPct}
        min={-40}
        max={0}
        onChange={onShockPctChange}
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
          <span className="font-mono tabular-nums text-bronze">
            {formatCurrency(result.deltaValue)}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-1.5 border-t border-line pt-3 text-xs text-slate">
        <span>Méthodologie</span>
        <InfoTooltip>
          Une SCPI peut subir une décote de son prix de part et un risque de
          suspension des rachats en période de crise, distinct de
          l&apos;illiquidité d&apos;un bien physique.
        </InfoTooltip>
      </div>
    </CollapsibleScenarioCard>
  );
}
