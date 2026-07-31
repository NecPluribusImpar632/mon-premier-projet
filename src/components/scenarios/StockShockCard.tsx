"use client";

import { useState } from "react";
import { TrendingDown } from "lucide-react";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { computeStockShockImpact } from "@/lib/scenarios/calculations";
import {
  STOCK_PROFILES,
  STOCK_PROFILE_LABELS,
  type ActionsProfileBreakdown,
} from "@/lib/allocation/stockProfiles";

interface StockShockCardProps {
  actionsPct: number;
  actionsBreakdown: ActionsProfileBreakdown;
}

export function StockShockCard({
  actionsPct,
  actionsBreakdown,
}: StockShockCardProps) {
  const [marketShockPct, setMarketShockPct] = useState(-20);

  const result = computeStockShockImpact(
    actionsBreakdown,
    actionsPct,
    marketShockPct
  );

  return (
    <ScenarioCard
      icon={TrendingDown}
      title="Choc actions"
      description="Un même choc de marché affecte différemment chaque profil actions."
    >
      <ShockSlider
        label="Choc de marché"
        value={marketShockPct}
        min={-50}
        max={10}
        onChange={setMarketShockPct}
      />

      {actionsPct === 0 ? (
        <p className="text-sm text-slate">
          Aucune allocation Actions définie pour ce client.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5 text-xs text-slate">
            {STOCK_PROFILES.map((profile) => (
              <li key={profile} className="flex items-center justify-between">
                <span>{STOCK_PROFILE_LABELS[profile]}</span>
                <span className="font-mono tabular-nums">
                  {actionsBreakdown[profile]}%
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
            <p className="text-xs text-slate">
              Sensibilité pondérée : ×{result.weightedBeta.toFixed(2)}
            </p>
          </div>
        </>
      )}
    </ScenarioCard>
  );
}
