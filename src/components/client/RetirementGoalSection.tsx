"use client";

import { useState, useTransition } from "react";
import { updateRetirementGoal } from "@/lib/actions/clients";
import { computeRetirementTrajectory } from "@/lib/wealth/retirementTrajectory";
import type { PropertyWithLoans } from "@/lib/property/loanCalculations";
import { NetWorthProjectionChart } from "@/components/scenarios/NetWorthProjectionChart";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { formatCurrency } from "@/lib/format/currency";

interface RetirementGoalSectionProps {
  clientId: string;
  currentAge: number;
  financialWealthTotal: number;
  immobilierValue: number;
  properties: PropertyWithLoans[];
  initialRetirementAge: number | null;
  initialMonthlySavingsAmount: number | null;
  initialExpectedAnnualReturnPct: number | null;
}

type SaveStatus = "saved" | "saving" | "error";

const STATUS_MESSAGE: Record<SaveStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement...",
  error: "Erreur lors de l'enregistrement",
};

export function RetirementGoalSection({
  clientId,
  currentAge,
  financialWealthTotal,
  immobilierValue,
  properties,
  initialRetirementAge,
  initialMonthlySavingsAmount,
  initialExpectedAnnualReturnPct,
}: RetirementGoalSectionProps) {
  const [retirementAge, setRetirementAge] = useState(initialRetirementAge ?? 64);
  const [monthlySavingsAmount, setMonthlySavingsAmount] = useState(
    initialMonthlySavingsAmount ?? 0
  );
  const [expectedAnnualReturnPct, setExpectedAnnualReturnPct] = useState(
    initialExpectedAnnualReturnPct ?? 3
  );
  const [inflationPct, setInflationPct] = useState(2);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [isPending, startTransition] = useTransition();

  function save(age: number, savings: number, returnPct: number) {
    setStatus("saving");
    startTransition(async () => {
      try {
        await updateRetirementGoal(clientId, age, savings, returnPct);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  const points = computeRetirementTrajectory(
    currentAge,
    financialWealthTotal,
    immobilierValue,
    properties,
    { retirementAge, monthlySavingsAmount, expectedAnnualReturnPct },
    inflationPct
  );
  const first = points[0];
  const last = points[points.length - 1];
  const horizonYears = Math.max(retirementAge - currentAge, 0);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-ink">
            Âge de départ
            <input
              type="number"
              min={currentAge}
              max={100}
              step={1}
              value={retirementAge}
              onChange={(e) => setRetirementAge(Number(e.target.value))}
              onBlur={() =>
                save(retirementAge, monthlySavingsAmount, expectedAnnualReturnPct)
              }
              className={`w-20 ${NUMERIC_FIELD_CLASS}`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink">
            Épargne mensuelle (€)
            <input
              type="number"
              min={0}
              step={50}
              value={monthlySavingsAmount}
              onChange={(e) => setMonthlySavingsAmount(Number(e.target.value))}
              onBlur={() =>
                save(retirementAge, monthlySavingsAmount, expectedAnnualReturnPct)
              }
              className={`w-28 ${NUMERIC_FIELD_CLASS}`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink">
            Rendement attendu (%)
            <input
              type="number"
              step={0.1}
              value={expectedAnnualReturnPct}
              onChange={(e) => setExpectedAnnualReturnPct(Number(e.target.value))}
              onBlur={() =>
                save(retirementAge, monthlySavingsAmount, expectedAnnualReturnPct)
              }
              className={`w-20 ${NUMERIC_FIELD_CLASS}`}
            />
          </label>
        </div>
        <span
          className={`shrink-0 pb-2 text-xs ${
            status === "error" ? "text-bronze" : "text-slate"
          }`}
        >
          {isPending ? STATUS_MESSAGE.saving : STATUS_MESSAGE[status]}
        </span>
      </div>

      <ShockSlider
        label="Inflation (affichage en euros constants)"
        value={inflationPct}
        min={0}
        max={6}
        step={0.5}
        onChange={setInflationPct}
      />

      {horizonYears === 0 ? (
        <p className="border-t border-line pt-3 text-sm text-slate">
          Le client a déjà atteint l&apos;âge de départ renseigné.
        </p>
      ) : (
        <>
          <NetWorthProjectionChart points={points} />

          <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
            <p className="flex items-center justify-between text-ink">
              <span>Patrimoine net actuel</span>
              <span className="font-mono tabular-nums">
                {formatCurrency(first.netWorth)}
              </span>
            </p>
            <p className="flex items-center justify-between text-ink">
              <span>Patrimoine net à la retraite (dans {horizonYears} ans)</span>
              <span className="font-mono tabular-nums">
                {formatCurrency(last.netWorth)}
              </span>
            </p>
            <p className="flex items-center justify-between text-ink">
              <span>...en euros constants</span>
              <span className="font-mono tabular-nums text-slate">
                {formatCurrency(last.realNetWorth)}
              </span>
            </p>
          </div>
        </>
      )}

      <div className="flex items-center gap-1.5 border-t border-line pt-3 text-xs text-slate">
        <span>Méthodologie</span>
        <InfoTooltip>
          L&apos;épargne mensuelle est supposée entièrement investie dans le
          patrimoine financier, qui capitalise au rendement attendu saisi. La
          valeur immobilière est supposée stable (aucune plus-value n&apos;est
          inventée) ; la dette continue de s&apos;amortir selon les prêts
          existants. Le rendement attendu et le taux d&apos;inflation sont des
          hypothèses réglées par le conseiller, pas des données de marché.
        </InfoTooltip>
      </div>
    </div>
  );
}
