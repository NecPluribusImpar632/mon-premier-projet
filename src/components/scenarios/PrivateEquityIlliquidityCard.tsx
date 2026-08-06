"use client";

import { Lock } from "lucide-react";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { CollapsibleScenarioCard } from "@/components/scenarios/CollapsibleScenarioCard";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { computePrivateEquityIlliquidityImpact } from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface PrivateEquityIlliquidityCardProps {
  privateEquityAmount: number;
  discountPct: number;
  onDiscountPctChange: (value: number) => void;
  onRemove?: () => void;
}

export function PrivateEquityIlliquidityCard({
  privateEquityAmount,
  discountPct,
  onDiscountPctChange,
  onRemove,
}: PrivateEquityIlliquidityCardProps) {
  if (privateEquityAmount === 0) {
    return (
      <ScenarioCard
        icon={Lock}
        title="Décote d'illiquidité Private Equity"
        description="Décote à la revente sur le marché secondaire."
      >
        <p className="text-sm text-slate">
          Aucune allocation Private Equity définie pour ce client.
        </p>
      </ScenarioCard>
    );
  }

  const result = computePrivateEquityIlliquidityImpact(privateEquityAmount, discountPct);
  const isActive = result.deltaValue !== 0;
  const summaryValue = isActive
    ? formatCurrency(result.deltaValue)
    : "Aucun choc appliqué";

  return (
    <CollapsibleScenarioCard
      icon={Lock}
      title="Décote d'illiquidité Private Equity"
      description="Décote à la revente sur le marché secondaire."
      summaryValue={summaryValue}
      isActive={isActive}
      onRemove={onRemove}
    >
      <ShockSlider
        label="Décote de sortie"
        value={discountPct}
        min={0}
        max={50}
        onChange={onDiscountPctChange}
      />

      <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
        <p className="flex items-center justify-between text-ink">
          <span>Valeur de part (NAV)</span>
          <span className="font-mono tabular-nums">
            {formatCurrency(result.currentValue)}
          </span>
        </p>
        <p className="flex items-center justify-between text-ink">
          <span>Valeur de sortie estimée</span>
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
          Le Private Equity ne se revalorise pas en continu comme une action :
          en cas de besoin de liquidités avant l&apos;échéance du fonds, la
          sortie se fait par cession sur le marché secondaire, à une décote
          par rapport à la valeur de part (NAV). 20 % est une hypothèse de
          départ dans la fourchette usuelle (10 à 40 % selon les conditions de
          marché) — à ajuster selon le fonds réellement détenu.
        </InfoTooltip>
      </div>
    </CollapsibleScenarioCard>
  );
}
