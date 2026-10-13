"use client";

import { TrendingDown } from "lucide-react";
import { CollapsibleScenarioCard } from "@/components/scenarios/CollapsibleScenarioCard";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { computeStockShockImpact } from "@/lib/scenarios/calculations";
import type { ActionsIndexBreakdown } from "@/lib/allocation/actionsIndexBreakdown";
import { REFERENCE_INDICES, REFERENCE_INDEX_LABELS } from "@/lib/allocation/referenceIndices";
import { roundPercent } from "@/lib/format/percent";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface StockShockCardProps {
  actionsPct: number;
  actionsIndexBreakdown: ActionsIndexBreakdown;
  marketShockPct: number;
  onMarketShockPctChange: (value: number) => void;
  onRemove?: () => void;
}

export function StockShockCard({
  actionsPct,
  actionsIndexBreakdown,
  marketShockPct,
  onMarketShockPctChange,
  onRemove,
}: StockShockCardProps) {
  const result = computeStockShockImpact(actionsPct, marketShockPct);
  const isActive = result.portfolioImpactPts !== 0;
  const summaryValue = isActive
    ? `${result.portfolioImpactPts >= 0 ? "+" : ""}${result.portfolioImpactPts.toFixed(1)} pts`
    : "Aucun choc appliqué";
  const heldIndices = REFERENCE_INDICES.filter((index) => actionsIndexBreakdown[index] > 0);
  const hasEm = heldIndices.includes("msci-em");
  const hasNikkei = heldIndices.includes("nikkei225");

  return (
    <CollapsibleScenarioCard
      icon={TrendingDown}
      title="Choc actions"
      description="Un même choc de marché affecte différemment chaque profil actions."
      summaryValue={summaryValue}
      isActive={isActive}
      onRemove={onRemove}
    >
      <ShockSlider
        label="Choc de marché"
        value={marketShockPct}
        min={-50}
        max={10}
        onChange={onMarketShockPctChange}
      />

      {actionsPct === 0 ? (
        <p className="text-sm text-slate">
          Aucune allocation Actions définie pour ce client.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5 text-xs text-slate">
            {heldIndices.map((index) => (
              <li key={index} className="flex items-center justify-between">
                <span>{REFERENCE_INDEX_LABELS[index]}</span>
                <span className="font-mono tabular-nums">
                  {roundPercent(actionsIndexBreakdown[index])}%
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
            <p className="flex items-center justify-between text-ink">
              <span>Impact sur la poche Actions</span>
              <span
                className={`font-mono tabular-nums ${
                  result.actionsImpactPct < 0 ? "text-bronze" : "text-emerald-strong"
                }`}
              >
                {result.actionsImpactPct >= 0 ? "+" : ""}
                {result.actionsImpactPct.toFixed(1)}%
              </span>
            </p>
            <p className="flex items-center justify-between text-ink">
              <span>Impact sur le portefeuille total</span>
              <span
                className={`font-mono tabular-nums ${
                  result.portfolioImpactPts < 0 ? "text-bronze" : "text-emerald-strong"
                }`}
              >
                {result.portfolioImpactPts >= 0 ? "+" : ""}
                {result.portfolioImpactPts.toFixed(1)} pts
              </span>
            </p>
          </div>
        </>
      )}

      <div className="flex items-center gap-1.5 border-t border-line pt-3 text-xs text-slate">
        <span>Méthodologie</span>
        <InfoTooltip>
          <p className="mb-2">
            Sur les 3 scénarios nommés (2008, inflation durable, remontée des taux), le
            curseur &quot;Choc de marché&quot; se pré-remplit avec la moyenne pondérée des
            performances réelles des indices détenus (répartition saisie dans
            l&apos;onglet Allocation) sur une année civile représentative : 2008 pour la
            crise financière, 2022 pour le choc inflationniste et la remontée brutale des
            taux (année plus proche de l&apos;hypothèse d&apos;inflation du scénario que
            1973-74, dont les données n&apos;existent pas pour tous les indices), 2018
            pour un resserrement monétaire Fed/BCE sans choc d&apos;inflation ni crise
            bancaire. En mode &quot;Personnalisé&quot;, le curseur est un chiffre libre,
            non rattaché à un indice.
          </p>
          {hasEm && (
            <p className="mb-2">
              MSCI Emerging Markets est ajusté en euros : un dollar plus fort pendant les
              phases de tension (2008, 2018, 2022) a historiquement compensé une partie de
              la perte en dollars pour un détenteur en euros. Les chiffres 2018 et 2022
              viennent directement de l&apos;indice MSCI publié en euros ; celui de 2008
              (aucun factsheet euro disponible) est calculé en appliquant la variation
              EUR/USD réelle de l&apos;année (1,4721 → 1,3917, taux de référence BCE) au
              chiffre en dollars.
            </p>
          )}
          {hasNikkei && (
            <p className="mb-2">
              Le Nikkei 225 n&apos;est PAS ajusté du risque de change ici : le yen s&apos;est
              apprécié face à l&apos;euro en 2008 (valeur refuge, ce qui aurait amorti la
              perte pour un détenteur euro) mais déprécié en 2022 (divergence de politique
              monétaire, ce qui l&apos;aurait au contraire aggravée) — un effet qui change de
              sens selon le type de crise, pas un simple coefficient à appliquer comme pour
              les émergents. Les chiffres ci-dessus sont donc en yens, tels que publiés,
              sans conversion.
            </p>
          )}
          <p>
            Les figures elles-mêmes proviennent de sources publiques (factsheets
            officiels MSCI/STOXX/Nasdaq, Yahoo Finance, Bloomberg, macrotrends...) ; leur
            fiabilité varie selon l&apos;indice — EURO STOXX 50 par exemple n&apos;a que
            ~28 ans d&apos;historique. Ce n&apos;est pas une reconstitution historique
            exacte de chaque crise, une simplification assumée comme pour le reste du
            calibrage de ces scénarios.
          </p>
        </InfoTooltip>
      </div>
    </CollapsibleScenarioCard>
  );
}
