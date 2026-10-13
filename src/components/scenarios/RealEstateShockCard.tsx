"use client";

import { useState } from "react";
import { Home } from "lucide-react";
import type { PropertyWithSensitivity } from "@/lib/scenarios/resolvePropertySensitivity";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { CollapsibleScenarioCard } from "@/components/scenarios/CollapsibleScenarioCard";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { ShockModeToggle } from "@/components/scenarios/ShockModeToggle";
import {
  computeRealEstateShockImpact,
  computeRateHikeImpact,
} from "@/lib/scenarios/calculations";
import { reliabilityTierForR2 } from "@/lib/scenarios/statisticalReliability";
import { formatCurrency } from "@/lib/format/currency";
import { roundPercent } from "@/lib/format/percent";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface RealEstateShockCardProps {
  properties: PropertyWithSensitivity[];
  oatRateChangePts: number;
  onOatRateChangePtsChange: (value: number) => void;
  /** null = derived from the OAT move through each zone's sensitivity; a
   * number applies the same price shock to every property. */
  shockPct: number | null;
  onShockPctChange: (value: number | null) => void;
  onRemove?: () => void;
}

export function RealEstateShockCard({
  properties,
  oatRateChangePts,
  onOatRateChangePtsChange,
  shockPct,
  onShockPctChange,
  onRemove,
}: RealEstateShockCardProps) {
  const [needsLiquidity, setNeedsLiquidity] = useState(false);
  const [liquidityPropertyId, setLiquidityPropertyId] = useState(
    properties[0]?.id ?? ""
  );

  if (properties.length === 0) {
    return (
      <ScenarioCard
        icon={Home}
        title="Choc immobilier"
        description="Baisse du prix des biens, sensibilité aux taux et besoin de liquidité."
      >
        <p className="text-sm text-slate">
          Aucun bien immobilier enregistré pour ce client.
        </p>
      </ScenarioCard>
    );
  }

  const result = computeRealEstateShockImpact(properties, oatRateChangePts, shockPct);
  const rateHike = computeRateHikeImpact(properties, oatRateChangePts);
  // Average rate-derived shock, used to seed the direct slider when the
  // advisor switches modes so the number doesn't jump to zero.
  const derivedAveragePct =
    result.totalCurrentValue > 0
      ? (computeRealEstateShockImpact(properties, oatRateChangePts).totalDelta /
          result.totalCurrentValue) *
        100
      : 0;
  const totalFixedDebt = rateHike.perProperty.reduce((sum, p) => sum + p.fixedDebt, 0);
  const totalVariableDebt = rateHike.perProperty.reduce(
    (sum, p) => sum + p.variableDebt,
    0
  );

  const liquidityProperty = properties.find((p) => p.id === liquidityPropertyId);
  const liquidityImpact = result.perProperty.find(
    (p) => p.propertyId === liquidityPropertyId
  );

  // One methodology line per distinct zone actually used by this client's biens,
  // rather than repeating the same zone for every property.
  const zonesUsed = Array.from(
    new Map(
      result.perProperty.map((p) => [p.sensitivity.zoneLabel, p.sensitivity])
    ).values()
  );

  const isActive = result.totalDelta !== 0;
  const summaryValue = isActive
    ? formatCurrency(result.totalDelta)
    : "Aucun choc appliqué";

  return (
    <CollapsibleScenarioCard
      icon={Home}
      title="Choc immobilier"
      description="Baisse du prix des biens, sensibilité aux taux et besoin de liquidité."
      summaryValue={summaryValue}
      isActive={isActive}
      onRemove={onRemove}
    >
      <ShockModeToggle
        mode={result.mode}
        derivedLabel="Dérivé du taux par zone"
        fixedLabel="Choc direct"
        onChange={(mode) =>
          onShockPctChange(mode === "fixed" ? Math.round(derivedAveragePct) : null)
        }
      />

      {result.mode === "fixed" && (
        <ShockSlider
          label="Choc de prix (tous les biens)"
          value={shockPct ?? 0}
          min={-30}
          max={10}
          step={1}
          onChange={onShockPctChange}
        />
      )}

      <ShockSlider
        label={
          result.mode === "fixed"
            ? "Variation du taux OAT (obligations, prêts à taux variable)"
            : "Variation du taux OAT"
        }
        value={oatRateChangePts}
        min={-3}
        max={8}
        step={0.5}
        suffix=" pt"
        onChange={onOatRateChangePtsChange}
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
            <span className="text-slate">
              {property.propertyName}
              <span className="ml-1.5 text-slate/70">
                ({result.mode === "derived" && `${property.sensitivity.zoneLabel}, `}
                {property.shockPct > 0 ? "+" : ""}
                {roundPercent(property.shockPct, 1)}%)
              </span>
            </span>
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

      {(totalFixedDebt > 0 || totalVariableDebt > 0) && (
        <p className="border-t border-line pt-3 text-xs text-slate">
          {totalFixedDebt > 0 && (
            <>{formatCurrency(totalFixedDebt)} de dette à taux fixe (protégée)</>
          )}
          {totalVariableDebt > 0 && (
            <>
              {totalFixedDebt > 0 && " · "}
              {formatCurrency(totalVariableDebt)} à taux variable (impact estimé : -
              {formatCurrency(rateHike.totalExtraMonthlyCost)}/mois si les taux
              montent de {roundPercent(oatRateChangePts, 2)} pt)
            </>
          )}
        </p>
      )}

      <div className="flex items-center gap-1.5 border-t border-line pt-3 text-xs text-slate">
        <span>Méthodologie</span>
        <InfoTooltip>
          <p className="mb-2">
            Deux modes. « Choc direct » : le même pourcentage s&apos;applique à tous les
            biens, c&apos;est le mode du scénario Crise 2008 (−8 %, repli des prix
            français en 2008-2009). « Dérivé du taux par zone » : pour chaque bien, le
            coefficient de sensibilité prix/taux calibré sur sa zone A bis / A / B1 /
            B2 / C (régression Notaires-INSEE entre variation du taux OAT 10 ans et
            croissance des prix, décalage de 5 à 6 trimestres), fiabilité modérée
            (R² de 23 % à 46 %), repli sur le coefficient national quand la commune
            n&apos;est pas connue. C&apos;est le mode des scénarios 2022 et 2018 et du
            mode Personnalisé par défaut.
          </p>
          <p>
            Dans les deux modes, le taux OAT pilote le choc obligataire en mode duration
            et le surcoût des prêts à taux variable.
          </p>
          <ul className="mt-2 flex flex-col gap-0.5 border-t border-line pt-2">
            {result.mode === "derived" && zonesUsed.map((zone) => {
              const reliability = reliabilityTierForR2(zone.r2Pct);
              return (
                <li key={zone.zoneLabel} className="flex items-center justify-between gap-3">
                  <span>{zone.zoneLabel}</span>
                  <span className="font-mono tabular-nums">
                    {zone.coefficient > 0 ? "+" : ""}
                    {zone.coefficient} %/pt ·{" "}
                    <span className={`font-bold ${reliability.className}`}>
                      R² {zone.r2Pct}% {reliability.label}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </InfoTooltip>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-line pt-3">
        <p className="text-sm text-ink">
          Le client a-t-il besoin de vendre ou refinancer un bien dans les
          prochaines années ?
        </p>
        <div className="inline-flex w-fit gap-1 rounded-full border border-line bg-paper p-1">
          <button
            type="button"
            onClick={() => setNeedsLiquidity(false)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              !needsLiquidity ? "bg-surface text-ink" : "text-slate hover:text-ink"
            }`}
          >
            Non
          </button>
          <button
            type="button"
            onClick={() => setNeedsLiquidity(true)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              needsLiquidity ? "bg-surface text-ink" : "text-slate hover:text-ink"
            }`}
          >
            Oui
          </button>
        </div>

        {needsLiquidity && (
          <div className="flex flex-col gap-2.5">
            <select
              value={liquidityPropertyId}
              onChange={(e) => setLiquidityPropertyId(e.target.value)}
              className={FIELD_CLASS}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {liquidityProperty && liquidityImpact && (
              <div
                className={`flex flex-col gap-1 rounded-md border p-3 text-sm ${
                  liquidityImpact.isUnderwater
                    ? "border-bronze bg-bronze-tint"
                    : "border-line bg-paper"
                }`}
              >
                <p className="flex items-center justify-between text-ink">
                  <span>Valeur après choc</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(liquidityImpact.newValue)}
                  </span>
                </p>
                <p className="flex items-center justify-between text-ink">
                  <span>Capital restant dû</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(liquidityImpact.remainingLoanAmount)}
                  </span>
                </p>
                <p className="flex items-center justify-between font-medium text-ink">
                  <span>Équité nette à la vente</span>
                  <span
                    className={`font-mono tabular-nums ${
                      liquidityImpact.isUnderwater
                        ? "text-bronze"
                        : "text-emerald-strong"
                    }`}
                  >
                    {formatCurrency(liquidityImpact.newEquity)}
                  </span>
                </p>
                <p
                  className={`text-xs ${
                    liquidityImpact.isUnderwater ? "text-bronze" : "text-emerald-strong"
                  }`}
                >
                  {liquidityImpact.isUnderwater
                    ? `Insuffisant pour couvrir le capital restant dû (manque ${formatCurrency(
                        Math.abs(liquidityImpact.newEquity)
                      )})`
                    : "Suffisant pour couvrir le capital restant dû"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </CollapsibleScenarioCard>
  );
}
