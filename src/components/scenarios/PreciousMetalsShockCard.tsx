"use client";

import { Coins } from "lucide-react";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { CollapsibleScenarioCard } from "@/components/scenarios/CollapsibleScenarioCard";
import { computePreciousMetalShockImpact } from "@/lib/scenarios/calculations";
import {
  GOLD_SENSITIVITY,
  SILVER_SENSITIVITY,
} from "@/lib/scenarios/preciousMetalsSensitivity";
import { reliabilityTierForR2 } from "@/lib/scenarios/statisticalReliability";
import { formatCurrency } from "@/lib/format/currency";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface PreciousMetalsShockCardProps {
  matieresPremieresAmount: number;
  goldAmount: number;
  silverAmount: number;
  inflationPct: number;
  onRemove?: () => void;
}

export function PreciousMetalsShockCard({
  matieresPremieresAmount,
  goldAmount,
  silverAmount,
  inflationPct,
  onRemove,
}: PreciousMetalsShockCardProps) {
  if (matieresPremieresAmount === 0) {
    return (
      <ScenarioCard
        icon={Coins}
        title="Choc or/argent"
        description="Tendance de fond liée à l'inflation, volatilité de court terme propre au métal."
      >
        <p className="text-sm text-slate">
          Aucune allocation Matières premières définie pour ce client.
        </p>
      </ScenarioCard>
    );
  }

  if (goldAmount === 0 && silverAmount === 0) {
    return (
      <ScenarioCard
        icon={Coins}
        title="Choc or/argent"
        description="Tendance de fond liée à l'inflation, volatilité de court terme propre au métal."
      >
        <p className="text-sm text-slate">
          Répartition or/argent non renseignée sur les {formatCurrency(matieresPremieresAmount)}{" "}
          de Matières premières — à compléter dans l&apos;onglet Allocation (&quot;Détailler
          or/argent&quot;) pour activer ce choc.
        </p>
      </ScenarioCard>
    );
  }

  const goldShock = computePreciousMetalShockImpact(goldAmount, inflationPct, GOLD_SENSITIVITY);
  const silverShock = computePreciousMetalShockImpact(
    silverAmount,
    inflationPct,
    SILVER_SENSITIVITY
  );
  const combinedDelta = goldShock.deltaValue + silverShock.deltaValue;
  const isActive = combinedDelta !== 0;
  const summaryValue = isActive
    ? `${combinedDelta >= 0 ? "+" : ""}${formatCurrency(combinedDelta)}`
    : "Aucun choc appliqué";

  const goldReliability = reliabilityTierForR2(GOLD_SENSITIVITY.r2Pct);
  const silverReliability = reliabilityTierForR2(SILVER_SENSITIVITY.r2Pct);
  const undetailedAmount = matieresPremieresAmount - goldAmount - silverAmount;

  return (
    <CollapsibleScenarioCard
      icon={Coins}
      title="Choc or/argent"
      description="Tendance de fond liée à l'inflation, volatilité de court terme propre au métal."
      summaryValue={summaryValue}
      isActive={isActive}
      onRemove={onRemove}
    >
      <p className="text-xs text-slate">
        Répartition saisie dans l&apos;onglet Allocation — {formatCurrency(goldAmount)} d&apos;or,{" "}
        {formatCurrency(silverAmount)} d&apos;argent
        {undetailedAmount > 0 && (
          <> ({formatCurrency(undetailedAmount)} de Matières premières non détaillé, pas choqué)</>
        )}
        .
      </p>

      {goldAmount > 0 && (
        <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
          <p className="font-medium text-ink">Or</p>
          <p className="flex items-center justify-between text-ink">
            <span>Choc appliqué</span>
            <span className="font-mono tabular-nums">
              {goldShock.shockPct >= 0 ? "+" : ""}
              {goldShock.shockPct.toFixed(1)} %
            </span>
          </p>
          <p className="flex items-center justify-between text-ink">
            <span>Nouvelle valeur</span>
            <span className="font-mono tabular-nums">{formatCurrency(goldShock.newValue)}</span>
          </p>
          <p className="flex items-center justify-between text-ink">
            <span>Variation</span>
            <span
              className={`font-mono tabular-nums ${
                goldShock.deltaValue < 0 ? "text-bronze" : "text-emerald-strong"
              }`}
            >
              {goldShock.deltaValue >= 0 ? "+" : ""}
              {formatCurrency(goldShock.deltaValue)}
            </span>
          </p>
        </div>
      )}

      {silverAmount > 0 && (
        <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
          <p className="font-medium text-ink">Argent</p>
          <p className="flex items-center justify-between text-ink">
            <span>Choc appliqué</span>
            <span className="font-mono tabular-nums">
              {silverShock.shockPct >= 0 ? "+" : ""}
              {silverShock.shockPct.toFixed(1)} %
            </span>
          </p>
          <p className="flex items-center justify-between text-ink">
            <span>Nouvelle valeur</span>
            <span className="font-mono tabular-nums">{formatCurrency(silverShock.newValue)}</span>
          </p>
          <p className="flex items-center justify-between text-ink">
            <span>Variation</span>
            <span
              className={`font-mono tabular-nums ${
                silverShock.deltaValue < 0 ? "text-bronze" : "text-emerald-strong"
              }`}
            >
              {silverShock.deltaValue >= 0 ? "+" : ""}
              {formatCurrency(silverShock.deltaValue)}
            </span>
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 border-t border-line pt-3 text-xs text-slate">
        <span>Méthodologie</span>
        <InfoTooltip>
          <p className="mb-2">
            Tendance de fond régressée sur des séries longues et publiques : prix mensuels
            1960-2025 (World Bank Commodity Markets, agrégés en moyenne annuelle) contre
            l&apos;inflation américaine (World Bank, 1972+ — avant, l&apos;or était fixé à
            35$/once par les accords de Bretton Woods, une période sans rapport avec un marché
            libre). Seul le décalage 0 (réaction la même année) a un sens économique pour un
            marché aussi liquide, et c&apos;est aussi le seul qui ressort statistiquement
            significatif.
          </p>
          <p className="mb-2 flex items-center justify-between gap-3">
            <span>
              Or : pente {GOLD_SENSITIVITY.slope.toFixed(2)} — R² {GOLD_SENSITIVITY.r2Pct.toFixed(1)}%
            </span>
            <span className={`font-bold ${goldReliability.className}`}>
              {goldReliability.label}
            </span>
          </p>
          <p className="mb-2 flex items-center justify-between gap-3">
            <span>
              Argent : pente {SILVER_SENSITIVITY.slope.toFixed(2)} — R²{" "}
              {SILVER_SENSITIVITY.r2Pct.toFixed(1)}%
            </span>
            <span className={`font-bold ${silverReliability.className}`}>
              {silverReliability.label}
            </span>
          </p>
          <p className="mb-2">
            Régression faite en dollars contre l&apos;inflation américaine — l&apos;or réagit à
            la conjoncture économique dominante mondiale, pas spécifiquement à l&apos;inflation
            française (testé : aucune relation en euros contre l&apos;inflation française,
            2000-2025). La volatilité affichée par ce choc reste ponctuelle (un seul chiffre,
            pas un aléa simulé) ; dans les faits, un détenteur en euros vit une variation
            annuelle qui s&apos;écarte facilement de ±{GOLD_SENSITIVITY.eurVolatilityPct.toFixed(0)}
            % pour l&apos;or et ±{SILVER_SENSITIVITY.eurVolatilityPct.toFixed(0)}% pour
            l&apos;argent (écart-type historique en euros, taux de change EUR/USD inclus — plus
            faible qu&apos;en dollars bruts, une partie du mouvement du métal étant compensée par
            le change).
          </p>
          <p>
            Sans le curseur &quot;Scénario inflation&quot; activé, le choc appliqué ici reflète
            uniquement la dérive propre au métal à inflation nulle (taux réels, demande
            industrielle...) — activez-le pour une estimation combinée. La répartition
            or/argent se modifie dans l&apos;onglet Allocation, pas ici — c&apos;est une donnée
            du patrimoine du client, pas une hypothèse de scénario.
          </p>
        </InfoTooltip>
      </div>
    </CollapsibleScenarioCard>
  );
}
