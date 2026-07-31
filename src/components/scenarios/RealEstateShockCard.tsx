"use client";

import { useState } from "react";
import { Home } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import {
  computeRealEstateShockImpact,
  computeRateHikeImpact,
} from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";

interface RealEstateShockCardProps {
  properties: Property[];
  shockPct: number;
  onShockPctChange: (value: number) => void;
}

// Illustrative reference hike for the fixed/variable summary line only — most
// French mortgages are fixed-rate, so a dedicated slider for this wasn't
// pulling its weight as a standalone scenario.
const REFERENCE_RATE_HIKE_PTS = 1;

export function RealEstateShockCard({
  properties,
  shockPct,
  onShockPctChange,
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

  const result = computeRealEstateShockImpact(properties, shockPct);
  const rateHike = computeRateHikeImpact(properties, REFERENCE_RATE_HIKE_PTS);
  const fixedCount = rateHike.perProperty.filter((p) => p.isFixed).length;
  const variableCount = rateHike.perProperty.length - fixedCount;

  const liquidityProperty = properties.find((p) => p.id === liquidityPropertyId);
  const liquidityImpact = result.perProperty.find(
    (p) => p.propertyId === liquidityPropertyId
  );

  return (
    <ScenarioCard
      icon={Home}
      title="Choc immobilier"
      description="Baisse du prix des biens, sensibilité aux taux et besoin de liquidité."
    >
      <ShockSlider
        label="Baisse des prix"
        value={shockPct}
        min={-40}
        max={0}
        onChange={onShockPctChange}
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

      <p className="border-t border-line pt-3 text-xs text-slate">
        {fixedCount} bien{fixedCount > 1 ? "s" : ""} à taux fixe (protégé
        {fixedCount > 1 ? "s" : ""})
        {variableCount > 0 && (
          <>
            {" "}
            · {variableCount} bien{variableCount > 1 ? "s" : ""} à taux
            variable (impact estimé : -
            {formatCurrency(rateHike.totalExtraMonthlyCost)}/mois si les taux
            montent de {REFERENCE_RATE_HIKE_PTS} pt)
          </>
        )}
      </p>

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
    </ScenarioCard>
  );
}
