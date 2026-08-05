"use client";

import { useState, useTransition } from "react";
import { updateWealthGoal } from "@/lib/actions/clients";
import { computeWealthGoalProjection, type WealthGoalContext } from "@/lib/wealth/wealthGoal";
import type { ActionsProfileBreakdown } from "@/lib/allocation/stockProfiles";
import type { PropertyWithLoans } from "@/lib/property/loanCalculations";
import { NetWorthProjectionChart } from "@/components/scenarios/NetWorthProjectionChart";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { formatCurrency } from "@/lib/format/currency";
import { roundPercent } from "@/lib/format/percent";

interface WealthGoalSectionProps {
  clientId: string;
  currentAge: number;
  amounts: Record<string, number>;
  actionsBreakdown: ActionsProfileBreakdown;
  properties: PropertyWithLoans[];
  immobilierValue: number;
  initialWealthGoalAmount: number | null;
  initialWealthGoalAge: number | null;
  retirementAge: number | null;
}

type SaveStatus = "saved" | "saving" | "error";

const STATUS_MESSAGE: Record<SaveStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement...",
  error: "Erreur lors de l'enregistrement",
};

export function WealthGoalSection({
  clientId,
  currentAge,
  amounts,
  actionsBreakdown,
  properties,
  immobilierValue,
  initialWealthGoalAmount,
  initialWealthGoalAge,
  retirementAge,
}: WealthGoalSectionProps) {
  const [wealthGoalAmount, setWealthGoalAmount] = useState(initialWealthGoalAmount ?? 0);
  const [wealthGoalAge, setWealthGoalAge] = useState(
    initialWealthGoalAge ?? retirementAge ?? currentAge + 20
  );
  const [inflationPct, setInflationPct] = useState(2);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [isPending, startTransition] = useTransition();

  function save(amount: number, age: number) {
    setStatus("saving");
    startTransition(async () => {
      try {
        await updateWealthGoal(clientId, amount, age);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  const context: WealthGoalContext = { amounts, actionsBreakdown, properties, immobilierValue };
  const result = computeWealthGoalProjection(
    context,
    currentAge,
    wealthGoalAge,
    wealthGoalAmount,
    inflationPct
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-ink">
            Objectif de patrimoine net (€)
            <input
              type="number"
              min={0}
              step={10000}
              value={wealthGoalAmount}
              onChange={(e) => setWealthGoalAmount(Number(e.target.value))}
              onBlur={() => save(wealthGoalAmount, wealthGoalAge)}
              className={`w-40 ${NUMERIC_FIELD_CLASS}`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink">
            Échéance (âge)
            <input
              type="number"
              min={currentAge}
              max={100}
              step={1}
              value={wealthGoalAge}
              onChange={(e) => setWealthGoalAge(Number(e.target.value))}
              onBlur={() => save(wealthGoalAmount, wealthGoalAge)}
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
        label="Inflation (convertit les hypothèses réelles en euros courants)"
        value={inflationPct}
        min={0}
        max={6}
        step={0.5}
        onChange={setInflationPct}
      />

      <div
        className={`flex items-center justify-between rounded-md border p-4 ${
          result.isGoalReached
            ? "border-emerald/30 bg-emerald-tint text-emerald-strong"
            : "border-bronze/30 bg-bronze/5 text-bronze"
        }`}
      >
        <span className="font-medium">
          {result.isGoalReached ? "Objectif atteint" : "Objectif non atteint"}
        </span>
        <span className="font-mono tabular-nums">
          {result.gapAmount >= 0 ? "+" : ""}
          {formatCurrency(result.gapAmount)}
        </span>
      </div>

      {result.horizonYears === 0 ? (
        <p className="border-t border-line pt-3 text-sm text-slate">
          L&apos;échéance choisie est déjà atteinte ou dépassée.
        </p>
      ) : (
        <>
          <NetWorthProjectionChart points={result.points} />

          <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
            <p className="flex items-center justify-between text-ink">
              <span>Taux de croissance global (pondéré, nominal)</span>
              <span className="font-mono tabular-nums">
                {roundPercent(result.blendedNominalReturnPct, 2)}%
              </span>
            </p>
            <p className="flex items-center justify-between text-ink">
              <span>Patrimoine net à l&apos;échéance (dans {result.horizonYears} ans)</span>
              <span className="font-mono tabular-nums">
                {formatCurrency(result.finalNetWorth)}
              </span>
            </p>
            <p className="flex items-center justify-between text-ink">
              <span>...en euros constants</span>
              <span className="font-mono tabular-nums text-slate">
                {formatCurrency(result.points[result.points.length - 1].realNetWorth)}
              </span>
            </p>
          </div>

          <div className="border-t border-line pt-3">
            <p className="mb-2 text-sm text-ink">Détail du calcul</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate">
                  <th className="pb-1 font-normal">Poche</th>
                  <th className="pb-1 text-right font-normal">Montant</th>
                  <th className="pb-1 text-right font-normal">Taux appliqué</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums text-ink">
                {result.breakdown.map((row) => (
                  <tr key={row.categoryId} className="border-t border-line/50">
                    <td className="py-1 font-sans">{row.label}</td>
                    <td className="py-1 text-right">{formatCurrency(row.amount)}</td>
                    <td className="py-1 text-right text-slate">
                      {row.nominalReturnPct === null
                        ? "non projeté"
                        : `${roundPercent(row.nominalReturnPct, 2)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 border-t border-line pt-3 text-xs text-slate">
        <p className="font-medium text-ink">Méthodologie</p>
        <p>
          Hypothèses de rendement <strong>réel</strong>{" "}
          annuel par classe d&apos;actif —
          des ordres de grandeur consensuels de long terme, pas calibrés sur données
          historiques françaises comme le stress test immobilier (qui, lui, s&apos;appuie
          sur les indices Notaires-INSEE) : Actions 5 % (indiciel) / 3,5 % (défensif) /
          6 % (croissance), pondérés par le profil actions du client ; Obligations
          1,5 % ; SCPI 4 % ; Liquidités et Matières premières 0 %. Immobilier direct :
          0,5 % d&apos;appréciation (ordre de grandeur Friggit/IGEDD sur longue période)
          plus, si le bien est loué, un rendement locatif net calculé à partir du loyer
          réellement saisi sur ce bien, moins 30 % pour charges/copropriété/entretien —
          la fiscalité n&apos;est pas incluse ici, elle dépend du régime choisi (voir le
          comparateur fiscal du bien). Un bien non loué ne reçoit que l&apos;appréciation.
        </p>
        <p>
          Private Equity : 6,5 % <strong>nominal</strong>{" "}
          (pas réel), avec la même
          décote d&apos;illiquidité que le stress test (20 % par défaut) appliquée en
          continu sur la valeur projetée — une simplification : en pratique la décote ne
          s&apos;applique qu&apos;au moment d&apos;une cession, pas chaque année.
          Entreprise/outil professionnel et Autres : non projetés, valeur figée.
        </p>
        <p>
          Toutes les hypothèses réelles sont converties en nominal via le taux
          d&apos;inflation ci-dessus, pour pouvoir les additionner au Private Equity et
          exprimer l&apos;objectif en euros courants. La dette continue de s&apos;amortir
          selon les prêts existants ; un éventuel crédit lombard (adossé au portefeuille
          financier plutôt qu&apos;à un bien) n&apos;est pas modélisé, l&apos;application
          ne suit que les prêts immobiliers.
        </p>
      </div>
    </div>
  );
}
