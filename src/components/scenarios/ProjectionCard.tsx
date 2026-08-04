"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { NetWorthProjectionChart } from "@/components/scenarios/NetWorthProjectionChart";
import { computeNetWorthProjection } from "@/lib/scenarios/projection";
import type { ClientScenarioContext } from "@/lib/scenarios/calculations";
import type { ScenarioParams } from "@/lib/scenarios/scenarioParams";
import { formatCurrency } from "@/lib/format/currency";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";

interface ProjectionCardProps {
  context: ClientScenarioContext;
  params: ScenarioParams;
}

export function ProjectionCard({ context, params }: ProjectionCardProps) {
  const [horizonYears, setHorizonYears] = useState(10);
  const [showTable, setShowTable] = useState(false);

  const points = computeNetWorthProjection(context, params, horizonYears);
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <ScenarioCard
      icon={TrendingUp}
      title="Projection du patrimoine net"
      description="Le scénario ci-dessus prolongé dans le temps, au rythme du remboursement réel des prêts."
    >
      <label className="flex items-center justify-between gap-4 text-sm text-ink">
        Horizon (années)
        <input
          type="number"
          min={1}
          max={30}
          step={1}
          value={horizonYears}
          onChange={(e) =>
            setHorizonYears(Math.min(30, Math.max(1, Number(e.target.value) || 1)))
          }
          className={`w-16 ${NUMERIC_FIELD_CLASS}`}
        />
      </label>

      <NetWorthProjectionChart points={points} />

      <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
        <p className="flex items-center justify-between text-ink">
          <span>Patrimoine net année 0</span>
          <span className="font-mono tabular-nums">{formatCurrency(first.netWorth)}</span>
        </p>
        <p className="flex items-center justify-between text-ink">
          <span>Patrimoine net année {last.year}</span>
          <span className="font-mono tabular-nums">{formatCurrency(last.netWorth)}</span>
        </p>
        <p className="flex items-center justify-between text-ink">
          <span>...en euros constants</span>
          <span className="font-mono tabular-nums text-slate">
            {formatCurrency(last.realNetWorth)}
          </span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        className="text-left text-xs font-medium text-emerald hover:text-emerald-strong"
      >
        {showTable ? "Masquer le détail année par année" : "Voir le détail année par année"}
      </button>

      {showTable && (
        <div className="max-h-64 overflow-y-auto border-t border-line pt-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate">
                <th className="pb-1 font-normal">Année</th>
                <th className="pb-1 text-right font-normal">Dette restante</th>
                <th className="pb-1 text-right font-normal">Patrimoine net</th>
                <th className="pb-1 text-right font-normal">En euros constants</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums text-ink">
              {points.map((p) => (
                <tr key={p.year} className="border-t border-line/50">
                  <td className="py-1">{p.year}</td>
                  <td className="py-1 text-right">{formatCurrency(p.totalDebt)}</td>
                  <td className="py-1 text-right">{formatCurrency(p.netWorth)}</td>
                  <td className="py-1 text-right text-slate">
                    {formatCurrency(p.realNetWorth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-1.5 border-t border-line pt-3 text-xs text-slate">
        <span>Méthodologie</span>
        <InfoTooltip>
          Le choc du scénario actif (immobilier, actions, SCPI, obligations,
          Private Equity) s&apos;applique une seule fois à l&apos;année 0 ; les
          valeurs immobilières et financières restent ensuite stables en euros
          courants. Seul le remboursement réel du capital des prêts fait
          évoluer le patrimoine net dans le temps — aucune hypothèse de
          croissance immobilière ou financière n&apos;est ajoutée. Pour les
          prêts sans date de départ renseignée, la durée restante est supposée
          égale à la durée totale du prêt.
        </InfoTooltip>
      </div>
    </ScenarioCard>
  );
}
