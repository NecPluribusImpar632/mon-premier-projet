"use client";

import { useState, useTransition } from "react";
import { updateWealthGoal, updateWealthGoalFees } from "@/lib/actions/clients";
import {
  computeWealthGoalMonteCarlo,
  type AssetClassMonteCarloRow,
  type MonteCarloRowStatus,
  type WealthGoalContext,
} from "@/lib/wealth/monteCarloProjection";
import {
  ANNUAL_FEES_LABELS,
  DEFAULT_ANNUAL_FEES_PCT,
  type AnnualFeesPct,
} from "@/lib/wealth/monteCarloAssumptions";
import type { ActionsIndexBreakdown } from "@/lib/allocation/actionsIndexBreakdown";
import type { PropertyWithLoans } from "@/lib/property/loanCalculations";
import { WealthGoalFanChart } from "@/components/wealth/WealthGoalFanChart";
import { ShockSlider } from "@/components/scenarios/ShockSlider";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { formatCurrency } from "@/lib/format/currency";
import { formatPercent } from "@/lib/format/percent";

interface WealthGoalSectionProps {
  clientId: string;
  currentAge: number;
  amounts: Record<string, number>;
  properties: PropertyWithLoans[];
  immobilierValue: number;
  actionsIndexBreakdown: ActionsIndexBreakdown;
  initialWealthGoalAmount: number | null;
  initialWealthGoalAge: number | null;
  initialWealthGoalInflationPct: number | null;
  initialMonthlySavingsAmount: number | null;
  /** null per poste = application default. */
  initialWealthGoalFees: Record<keyof AnnualFeesPct, number | null>;
}

type SaveStatus = "saved" | "saving" | "error";

const STATUS_MESSAGE: Record<SaveStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement...",
  error: "Erreur lors de l'enregistrement",
};

const ROW_STATUS_LABEL: Record<MonteCarloRowStatus, string> = {
  calibrated: "Calibré",
  assumed: "Hypothèse avec volatilité",
  pointMass: "Hypothèse simple",
  frozen: "Non projeté",
};

const ROW_STATUS_CLASS: Record<MonteCarloRowStatus, string> = {
  calibrated: "text-emerald",
  assumed: "text-ink",
  pointMass: "text-ink",
  frozen: "text-slate",
};

const FEE_KEYS = Object.keys(ANNUAL_FEES_LABELS) as (keyof AnnualFeesPct)[];

interface GoalInputs {
  amount: number;
  age: number;
  inflationPct: number;
  monthlySavings: number;
}

function yearsLabel(years: number): string {
  if (years <= 0) return "échéance atteinte";
  if (years === 1) return "dans 1 an";
  return `dans ${years} ans`;
}

function feesWithDefaults(
  initial: Record<keyof AnnualFeesPct, number | null>
): AnnualFeesPct {
  return {
    actions: initial.actions ?? DEFAULT_ANNUAL_FEES_PCT.actions,
    obligations: initial.obligations ?? DEFAULT_ANNUAL_FEES_PCT.obligations,
    scpi: initial.scpi ?? DEFAULT_ANNUAL_FEES_PCT.scpi,
    privateEquity: initial.privateEquity ?? DEFAULT_ANNUAL_FEES_PCT.privateEquity,
    immobilier: initial.immobilier ?? DEFAULT_ANNUAL_FEES_PCT.immobilier,
  };
}

/**
 * The single projection module of the "Objectif patrimonial" tab. It used to
 * sit above a separate "objectif retraite" section with its own straight-line
 * engine and a hand-typed expected return; the two disagreed on the same
 * screen (frozen vs. calibrated real estate, one flat rate vs. per-asset
 * distributions), so the retirement one was folded in here: the retirement
 * age is just an échéance, and the monthly savings feed the Monte Carlo.
 */
export function WealthGoalSection({
  clientId,
  currentAge,
  amounts,
  properties,
  immobilierValue,
  actionsIndexBreakdown,
  initialWealthGoalAmount,
  initialWealthGoalAge,
  initialWealthGoalInflationPct,
  initialMonthlySavingsAmount,
  initialWealthGoalFees,
}: WealthGoalSectionProps) {
  const [inputs, setInputs] = useState<GoalInputs>({
    amount: initialWealthGoalAmount ?? 0,
    age: initialWealthGoalAge ?? currentAge + 20,
    // Persisted alongside the goal (not local-only): the chosen inflation rate
    // materially changes the result, so silently resetting it to 2% on every
    // reload would make the displayed percentage drift from what the advisor
    // last looked at.
    inflationPct: initialWealthGoalInflationPct ?? 2,
    monthlySavings: initialMonthlySavingsAmount ?? 0,
  });
  const [fees, setFees] = useState<AnnualFeesPct>(() => feesWithDefaults(initialWealthGoalFees));
  const [showFees, setShowFees] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    setStatus("saving");
    startTransition(async () => {
      try {
        await action();
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  function save(next: GoalInputs) {
    run(() =>
      updateWealthGoal(clientId, next.amount, next.age, next.inflationPct, next.monthlySavings)
    );
  }

  function saveFees(next: AnnualFeesPct) {
    run(() => updateWealthGoalFees(clientId, next));
  }

  function update(patch: Partial<GoalInputs>) {
    setInputs((prev) => ({ ...prev, ...patch }));
  }

  function handleInflationChange(value: number) {
    const next = { ...inputs, inflationPct: value };
    setInputs(next);
    save(next);
  }

  const context: WealthGoalContext = { amounts, properties, immobilierValue };
  const result = computeWealthGoalMonteCarlo(context, {
    currentAge,
    targetAge: inputs.age,
    targetAmount: inputs.amount,
    inflationPct: inputs.inflationPct,
    actionsIndexBreakdown,
    monthlySavingsAmount: inputs.monthlySavings,
    fees,
  });
  const successRounded = Math.round(result.successPct);
  const medianFinalNominal = result.bands.p50[result.bands.p50.length - 1]?.netWorth ?? 0;
  const medianFinalReal =
    medianFinalNominal / Math.pow(1 + inputs.inflationPct / 100, result.horizonYears);
  const horizonYears = Math.max(inputs.age - currentAge, 0);
  const feesAreDefault = FEE_KEYS.every((key) => fees[key] === DEFAULT_ANNUAL_FEES_PCT[key]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-ink">
            Objectif de patrimoine net (€)
            <input
              type="number"
              min={0}
              step={10000}
              value={inputs.amount}
              onChange={(e) => update({ amount: Number(e.target.value) })}
              onBlur={() => save(inputs)}
              className={`w-40 ${NUMERIC_FIELD_CLASS}`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink">
            <span>
              Échéance (âge){" "}
              <span className="font-mono text-xs text-slate">{yearsLabel(horizonYears)}</span>
            </span>
            <input
              type="number"
              min={currentAge}
              max={100}
              step={1}
              value={inputs.age}
              onChange={(e) => update({ age: Number(e.target.value) })}
              onBlur={() => save(inputs)}
              className={`w-20 ${NUMERIC_FIELD_CLASS}`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink">
            Épargne mensuelle (€ / mois)
            <input
              type="number"
              min={0}
              step={50}
              value={inputs.monthlySavings}
              onChange={(e) => update({ monthlySavings: Number(e.target.value) })}
              onBlur={() => save(inputs)}
              className={`w-28 ${NUMERIC_FIELD_CLASS}`}
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
        value={inputs.inflationPct}
        min={0}
        max={6}
        step={0.5}
        onChange={handleInflationChange}
      />

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowFees((v) => !v)}
          className="w-fit text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          {showFees ? "Masquer les frais annuels" : "Frais annuels par poste"}
          {!showFees && !feesAreDefault && " (modifiés)"}
        </button>
        {showFees && (
          <div className="flex flex-wrap gap-4 rounded-md border border-line bg-paper p-3">
            {FEE_KEYS.map((key) => (
              <label key={key} className="flex flex-col gap-1.5 text-xs text-ink">
                {ANNUAL_FEES_LABELS[key]}
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={fees[key]}
                    onChange={(e) =>
                      setFees((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                    }
                    onBlur={() => saveFees(fees)}
                    className={`w-20 ${NUMERIC_FIELD_CLASS}`}
                  />
                  <span className="text-slate">% / an</span>
                </span>
              </label>
            ))}
            {!feesAreDefault && (
              <button
                type="button"
                onClick={() => {
                  setFees({ ...DEFAULT_ANNUAL_FEES_PCT });
                  saveFees({ ...DEFAULT_ANNUAL_FEES_PCT });
                }}
                className="self-end pb-2 text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
              >
                Rétablir les défauts
              </button>
            )}
          </div>
        )}
      </div>

      {result.horizonYears === 0 ? (
        <p className="border-t border-line pt-3 text-sm text-slate">
          L&apos;échéance choisie est déjà atteinte ou dépassée.
        </p>
      ) : (
        <>
          {result.targetAmount > 0 ? (
            <div>
              <p className="text-xs text-slate">
                Sur 2000 trajectoires simulées à partir de la composition réelle du
                portefeuille
                {inputs.monthlySavings > 0 &&
                  `, avec ${formatCurrency(inputs.monthlySavings)} d'épargne par mois`}
              </p>
              <p className="mt-1 font-serif text-5xl font-semibold tabular-nums text-ink">
                {successRounded}%
              </p>
              <p className="text-sm text-slate">
                des scénarios testés atteignent ou dépassent l&apos;objectif de{" "}
                {formatCurrency(result.targetAmount)} dans {result.horizonYears} ans.
              </p>
            </div>
          ) : (
            <p className="rounded-md border border-line bg-paper px-4 py-3 text-sm text-slate">
              Saisis un objectif de patrimoine net pour obtenir la probabilité de
              l&apos;atteindre. Les trajectoires simulées ci-dessous restent valables
              sans objectif.
            </p>
          )}

          <WealthGoalFanChart bands={result.bands} />

          <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
            <p className="flex items-center justify-between text-ink">
              <span>Patrimoine net médian à l&apos;échéance (dans {result.horizonYears} ans)</span>
              <span className="font-mono tabular-nums">{formatCurrency(medianFinalNominal)}</span>
            </p>
            <p className="flex items-center justify-between text-ink">
              <span>...en euros constants</span>
              <span className="font-mono tabular-nums text-slate">
                {formatCurrency(medianFinalReal)}
              </span>
            </p>
            {inputs.monthlySavings > 0 && (
              <p className="flex items-center justify-between text-ink">
                <span>Épargne versée sur la période</span>
                <span className="font-mono tabular-nums text-slate">
                  {formatCurrency(inputs.monthlySavings * 12 * result.horizonYears)}
                </span>
              </p>
            )}
          </div>

          <div className="border-t border-line pt-3">
            <p className="mb-2 text-sm text-ink">Détail par poste</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate">
                  <th className="pb-1 font-normal">Poste</th>
                  <th className="pb-1 text-right font-normal">Montant</th>
                  <th className="pb-1 text-right font-normal">Rendement réel</th>
                  <th className="pb-1 text-right font-normal">Frais / an</th>
                  <th className="pb-1 text-right font-normal">Statut</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums text-ink">
                {result.breakdown.map((row: AssetClassMonteCarloRow) => (
                  <tr key={row.categoryId} className="border-t border-line/50">
                    <td className="py-1 font-sans">{row.label}</td>
                    <td className="py-1 text-right">{formatCurrency(row.amount)}</td>
                    <td className="py-1 text-right text-slate">
                      {row.meanPct === null
                        ? "non projeté"
                        : row.stdPct > 0
                          ? `${formatPercent(row.meanPct, 2)} ± ${formatPercent(row.stdPct, 1)}`
                          : formatPercent(row.meanPct, 2)}
                    </td>
                    <td className="py-1 text-right text-slate">
                      {row.feesPct === null ? "" : formatPercent(row.feesPct, 1)}
                    </td>
                    <td className={`py-1 text-right font-sans text-[11px] ${ROW_STATUS_CLASS[row.status]}`}>
                      {ROW_STATUS_LABEL[row.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex items-center gap-1.5 border-t border-line pt-3 text-xs text-slate">
        <span>Méthodologie</span>
        <InfoTooltip>
          <p className="mb-2">
            Simulation de Monte Carlo : 2000 trajectoires sont tirées au hasard, une
            par poste chaque année, dans les vraies distributions historiques de
            rendement (moyenne et volatilité) calibrées pour chaque classe d&apos;actif
            réellement détenue — voir l&apos;onglet Méthodologie pour le détail des
            sources et des périodes couvertes. Le pourcentage affiché est la part des
            trajectoires où le patrimoine final (en euros courants) atteint ou dépasse
            l&apos;objectif — même convention que le montant saisi, pas déflatée.
          </p>
          <p className="mb-2">
            <strong>Frais annuels</strong> : soustraits du rendement nominal de chaque
            poste chaque année (gestion, dépôt, frais de fonds). Défauts : actions
            1,5 %, obligations 1 %, Private Equity 2 %, SCPI et immobilier 0 % (le
            rendement SCPI retenu est déjà net de frais de gestion). Modifiables par
            client ci-dessus.
          </p>
          <p className="mb-2">
            <strong>Épargne mensuelle</strong> : versée en fin de chaque année simulée
            (12 mois d&apos;un coup, sans rendement l&apos;année du versement, hypothèse
            prudente) dans les poches financières, au prorata de l&apos;allocation
            actuelle — jamais dans l&apos;immobilier ni dans les poches non projetées.
          </p>
          <p className="mb-2">
            <strong>Simplification assumée sur les Actions</strong> : quand plusieurs
            indices sont détenus (ex. CAC 40 + Nasdaq), un seul tirage aléatoire par
            année représente le marché actions global, appliqué à chaque indice via sa
            propre moyenne et volatilité. La corrélation entre indices est donc traitée
            comme parfaite, pas mesurée — cohérent avec le stress test (2008, 2022 et
            2018 font chuter tous les indices simultanément), mais une vraie
            simplification, pas une corrélation calculée sur donnée réelle. Même
            principe pour l&apos;Immobilier : une seule distribution nationale
            s&apos;applique à tous les biens du client, un seul tirage par année.
          </p>
          <p>
            SCPI : rendement réel de 2,5 % et volatilité de 6 %, choisis comme ordres de
            grandeur faute de série longue fiable. Obligations, Private Equity,
            Liquidités, Matières premières : hypothèse de rendement simple, volatilité
            non modélisée. Le Private Equity est compté à 100 % de sa valeur, comme dans
            la Vue d&apos;ensemble ; la décote d&apos;illiquidité ne s&apos;applique
            qu&apos;au stress test. Entreprise/outil professionnel et Autres restent
            gelés. La dette continue de s&apos;amortir selon les prêts existants ; un
            éventuel crédit lombard n&apos;est pas modélisé.
          </p>
        </InfoTooltip>
      </div>
    </div>
  );
}
