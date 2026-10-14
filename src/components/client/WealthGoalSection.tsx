"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { FileDown } from "lucide-react";
import {
  deleteWealthGoalProposal,
  saveWealthGoalProposal,
  updateClientFlows,
  updateWealthGoal,
  updateWealthGoalFees,
  type ClientFlowsData,
} from "@/lib/actions/clients";
import { computeCashFlowSchedule, firstYearFlows, type WealthGoalFlows } from "@/lib/wealth/cashFlows";
import { fiscalPartsFromFoyer } from "@/lib/fiscal/incomeTax";
import { CashFlowFields } from "@/components/wealth/CashFlowFields";
import {
  computeWealthGoalMonteCarlo,
  type AssetClassMonteCarloRow,
  type MonteCarloResult,
  type MonteCarloRowStatus,
  type WealthGoalContext,
  type WealthGoalInputs,
} from "@/lib/wealth/monteCarloProjection";
import {
  computeWealthGoalComparison,
  deflate,
  type WealthGoalComparison,
} from "@/lib/wealth/wealthGoalComparison";
import {
  CURRENT_SERIES_LABEL,
  PROPOSAL_SERIES_LABEL,
  PROPOSAL_CATEGORY_IDS,
  proposalFromCurrent,
  type WealthGoalProposalData,
} from "@/lib/wealth/wealthGoalProposal";
import { DEFAULT_ANNUAL_FEES_PCT, type AnnualFeesPct } from "@/lib/wealth/monteCarloAssumptions";
import type { ActionsIndexBreakdown } from "@/lib/allocation/actionsIndexBreakdown";
import type { PropertyWithLoans } from "@/lib/property/loanCalculations";
import { WealthGoalFanChart } from "@/components/wealth/WealthGoalFanChart";
import { SyncedRange } from "@/components/wealth/SyncedRange";
import { WealthGoalProposalEditor } from "@/components/wealth/WealthGoalProposalEditor";
import { AnnualFeesFields, feesAreDefault } from "@/components/wealth/AnnualFeesFields";
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
  initialProposal: WealthGoalProposalData | null;
  initialFlows: ClientFlowsData;
  /** For the fiscal parts, read from the foyer fiscal section. */
  maritalStatus: string | null;
  minorChildrenCount: number | null;
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

function returnCell(row: AssetClassMonteCarloRow): string {
  if (row.meanPct === null) return "non projeté";
  if (row.stdPct > 0) return `${formatPercent(row.meanPct, 2)} ± ${formatPercent(row.stdPct, 1)}`;
  return formatPercent(row.meanPct, 2);
}

function signedCurrency(value: number): string {
  if (Math.round(value) === 0) return formatCurrency(0);
  return `${value > 0 ? "+" : ""}${formatCurrency(value)}`;
}

/** Shown only when a negative yearly balance exhausted the financial
 * pockets in some trajectories (the rest then accumulates as an overdraft). */
function depletedNote(currentPct: number, proposedPct: number | null) {
  if (Math.round(currentPct) === 0 && Math.round(proposedPct ?? 0) === 0) return null;
  return (
    <p className="text-xs text-bronze">
      Poche financière épuisée par les flux négatifs dans {Math.round(currentPct)} % des
      trajectoires
      {proposedPct !== null && ` (${Math.round(proposedPct)} % avec la proposition)`} : au-delà,
      le découvert s&apos;accumule sans intérêt.
    </p>
  );
}

function signedPoints(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return "0 pt";
  return `${rounded > 0 ? "+" : ""}${rounded} pt${Math.abs(rounded) > 1 ? "s" : ""}`;
}

/**
 * The single projection module of the "Objectif patrimonial" tab. It used to
 * sit above a separate "objectif retraite" section with its own straight-line
 * engine and a hand-typed expected return; the two disagreed on the same
 * screen (frozen vs. calibrated real estate, one flat rate vs. per-asset
 * distributions), so the retirement one was folded in here: the retirement
 * age is just an échéance, and the monthly savings feed the Monte Carlo.
 *
 * With a saved proposal, the module becomes a before/after comparison: both
 * simulations share the same seed (see wealthGoalComparison.ts).
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
  initialProposal,
  initialFlows,
  maritalStatus,
  minorChildrenCount,
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
  // Latest inputs for the sliders' release handler: a drag fires many
  // onChange renders, the save happens once on release with whatever the
  // last render left here.
  const inputsRef = useRef(inputs);
  useEffect(() => {
    inputsRef.current = inputs;
  }, [inputs]);
  const [fees, setFees] = useState<AnnualFeesPct>(() => feesWithDefaults(initialWealthGoalFees));
  const [showFees, setShowFees] = useState(false);
  const [flows, setFlows] = useState<ClientFlowsData>(initialFlows);
  const [showFlows, setShowFlows] = useState(initialFlows.savingsFromFlows);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [isPending, startTransition] = useTransition();

  // The saved proposal, and the draft being edited (null = editor closed).
  const [proposal, setProposal] = useState<WealthGoalProposalData | null>(initialProposal);
  const [draft, setDraft] = useState<WealthGoalProposalData | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [isProposalPending, startProposalTransition] = useTransition();

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

  function saveFlows(next: ClientFlowsData) {
    run(() => updateClientFlows(clientId, next));
  }

  /** Flows mode on: the computed balance replaces the manual savings. */
  function enableFlows() {
    const next = { ...flows, savingsFromFlows: true };
    setFlows(next);
    setShowFlows(true);
    saveFlows(next);
  }

  /** Back to manual: the field is pre-filled with the computed monthly figure,
   * the advisor can then edit it. */
  function disableFlows() {
    const monthly = Math.max(0, Math.round(firstYear.balance / 12));
    const nextInputs = { ...inputs, monthlySavings: monthly };
    const nextFlows = { ...flows, savingsFromFlows: false };
    setInputs(nextInputs);
    setFlows(nextFlows);
    run(async () => {
      await updateWealthGoal(
        clientId,
        nextInputs.amount,
        nextInputs.age,
        nextInputs.inflationPct,
        nextInputs.monthlySavings
      );
      await updateClientFlows(clientId, nextFlows);
    });
  }

  function update(patch: Partial<GoalInputs>) {
    setInputs((prev) => ({ ...prev, ...patch }));
  }

  function commitSliders() {
    save(inputsRef.current);
  }

  function handleInflationChange(value: number) {
    const next = { ...inputs, inflationPct: value };
    setInputs(next);
    save(next);
  }

  function startFromCurrent(): WealthGoalProposalData {
    return proposalFromCurrent(amounts, actionsIndexBreakdown, fees);
  }

  function openEditor() {
    setProposalError(null);
    setDraft(proposal ?? startFromCurrent());
  }

  function saveProposal() {
    if (!draft) return;
    const next = draft;
    setProposalError(null);
    startProposalTransition(async () => {
      try {
        await saveWealthGoalProposal(clientId, next);
        setProposal(next);
        setDraft(null);
      } catch (error) {
        setProposalError(
          error instanceof Error ? error.message : "Erreur lors de l'enregistrement."
        );
      }
    });
  }

  function removeProposal() {
    setProposalError(null);
    startProposalTransition(async () => {
      try {
        await deleteWealthGoalProposal(clientId);
        setProposal(null);
        setDraft(null);
      } catch (error) {
        setProposalError(error instanceof Error ? error.message : "Erreur lors de la suppression.");
      }
    });
  }

  const fiscalParts = fiscalPartsFromFoyer(maritalStatus, minorChildrenCount);
  const engineFlows: WealthGoalFlows = {
    incomeFranceAnnual: flows.incomeFranceAnnual,
    incomeForeignAnnual: flows.incomeForeignAnnual,
    livingExpensesAnnual: flows.livingExpensesAnnual,
    fiscalParts,
  };
  const firstYear = firstYearFlows(engineFlows, properties, inputs.inflationPct);
  const rentedPropertyCount = properties.filter((p) => p.monthlyRent !== null).length;
  const loanCount = properties.reduce((sum, p) => sum + p.loans.length, 0);
  const usesFlows = flows.savingsFromFlows;

  const context: WealthGoalContext = { amounts, properties, immobilierValue };
  const engineInputs: WealthGoalInputs = {
    currentAge,
    targetAge: inputs.age,
    targetAmount: inputs.amount,
    inflationPct: inputs.inflationPct,
    actionsIndexBreakdown,
    monthlySavingsAmount: inputs.monthlySavings,
    flows: usesFlows ? engineFlows : null,
    fees,
  };
  const comparison: WealthGoalComparison | null = proposal
    ? computeWealthGoalComparison(context, engineInputs, proposal)
    : null;
  const result: MonteCarloResult = comparison
    ? comparison.current
    : computeWealthGoalMonteCarlo(context, engineInputs);
  const successRounded = Math.round(result.successPct);
  const medianFinalNominal = result.bands.p50[result.bands.p50.length - 1]?.netWorth ?? 0;
  const medianFinalReal = deflate(medianFinalNominal, inputs.inflationPct, result.horizonYears);
  const horizonYears = Math.max(inputs.age - currentAge, 0);
  // What the "épargne versée" line shows: the manual savings over the period,
  // or in flows mode the cumulated yearly balances (euros courants).
  const monthlySavingsShown = usesFlows ? firstYear.balance / 12 : inputs.monthlySavings;
  const cumulatedSavings = usesFlows
    ? computeCashFlowSchedule(engineFlows, properties, horizonYears, inputs.inflationPct).reduce(
        (sum, year) => sum + year.balance,
        0
      )
    : inputs.monthlySavings * 12 * horizonYears;
  const savingsLineLabel = usesFlows
    ? "Solde cumulé des flux sur la période"
    : "Épargne versée sur la période";
  const savingsNote = usesFlows
    ? `, avec ${formatCurrency(Math.round(monthlySavingsShown))} de solde mensuel la première année`
    : inputs.monthlySavings > 0
      ? `, avec ${formatCurrency(inputs.monthlySavings)} d'épargne par mois`
      : "";
  // Year 0 of any trajectory is today's net worth (no draw applied yet), the
  // natural scale for the goal slider: 0 to three times the current net
  // worth, rounded up to the 10 000 € step.
  const netWorthNow = result.bands.p50[0]?.netWorth ?? 0;
  const goalSliderMax = Math.max(10000, Math.ceil((3 * netWorthNow) / 10000) * 10000);
  const reallocatableTotal = PROPOSAL_CATEGORY_IDS.reduce((sum, id) => sum + (amounts[id] ?? 0), 0);

  const proposedMedianNominal = comparison
    ? (comparison.proposed.bands.p50[comparison.proposed.bands.p50.length - 1]?.netWorth ?? 0)
    : 0;
  const proposedMedianReal = comparison
    ? deflate(proposedMedianNominal, inputs.inflationPct, comparison.proposed.horizonYears)
    : 0;
  const proposedRowsById = comparison
    ? new Map(comparison.proposed.breakdown.map((row) => [row.categoryId, row]))
    : null;

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
            <SyncedRange
              value={inputs.amount}
              min={0}
              max={goalSliderMax}
              step={10000}
              onChange={(value) => update({ amount: value })}
              onCommit={commitSliders}
              ariaLabel="Objectif de patrimoine net"
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
            <SyncedRange
              value={inputs.age}
              min={currentAge + 1}
              max={90}
              step={1}
              onChange={(value) => update({ age: value })}
              onCommit={commitSliders}
              ariaLabel="Échéance (âge)"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink">
            {usesFlows ? "Épargne mensuelle calculée (année 1)" : "Épargne mensuelle (€ / mois)"}
            <input
              type="number"
              min={0}
              step={50}
              value={usesFlows ? Math.round(monthlySavingsShown) : inputs.monthlySavings}
              readOnly={usesFlows}
              onChange={(e) => update({ monthlySavings: Number(e.target.value) })}
              onBlur={() => {
                if (!usesFlows) save(inputs);
              }}
              className={`w-28 ${NUMERIC_FIELD_CLASS} ${usesFlows ? "text-slate" : ""}`}
            />
            {usesFlows ? (
              <button
                type="button"
                onClick={disableFlows}
                className="w-fit text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
              >
                Saisir manuellement
              </button>
            ) : (
              <SyncedRange
                value={inputs.monthlySavings}
                min={0}
                max={10000}
                step={100}
                onChange={(value) => update({ monthlySavings: value })}
                onCommit={commitSliders}
                ariaLabel="Épargne mensuelle"
              />
            )}
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFlows((v) => !v)}
            className="w-fit text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
          >
            {showFlows ? "Masquer les revenus et dépenses" : "Revenus et dépenses"}
            {!showFlows && usesFlows && " (épargne calculée)"}
          </button>
          {!usesFlows && (
            <button
              type="button"
              onClick={enableFlows}
              className="w-fit text-xs text-emerald-strong underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              Calculer l&apos;épargne à partir des flux
            </button>
          )}
        </div>
        {showFlows && (
          <CashFlowFields
            flows={flows}
            onChange={setFlows}
            onCommit={saveFlows}
            firstYear={firstYear}
            fiscalParts={fiscalParts}
            rentedPropertyCount={rentedPropertyCount}
            loanCount={loanCount}
          />
        )}
        {showFlows && !usesFlows && (
          <p className="text-xs text-slate">
            Ces flux ne sont pas encore utilisés : la simulation suit l&apos;épargne mensuelle
            saisie à la main. Cliquez sur « Calculer l&apos;épargne à partir des flux » pour
            les activer.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowFees((v) => !v)}
          className="w-fit text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          {showFees ? "Masquer les frais annuels" : "Frais annuels par poste"}
          {!showFees && !feesAreDefault(fees) && " (modifiés)"}
        </button>
        {showFees && <AnnualFeesFields fees={fees} onChange={setFees} onCommit={saveFees} />}
      </div>

      {result.horizonYears === 0 ? (
        <p className="border-t border-line pt-3 text-sm text-slate">
          L&apos;échéance choisie est déjà atteinte ou dépassée.
        </p>
      ) : comparison ? (
        <>
          {comparison.current.targetAmount > 0 ? (
            <div>
              <p className="text-xs text-slate">
                Sur 2000 trajectoires simulées, les mêmes tirages pour les deux allocations
                {savingsNote}
              </p>
              <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate">{CURRENT_SERIES_LABEL}</p>
                  <p className="font-serif text-5xl font-semibold tabular-nums text-ink">
                    {Math.round(comparison.current.successPct)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate">
                    {PROPOSAL_SERIES_LABEL}{" "}
                    <span className="font-mono normal-case text-emerald-strong">
                      {signedPoints(comparison.successGapPts)}
                    </span>
                  </p>
                  <p className="font-serif text-5xl font-semibold tabular-nums text-emerald-strong">
                    {Math.round(comparison.proposed.successPct)}%
                  </p>
                </div>
              </div>
              <p className="mt-1 text-sm text-slate">
                des scénarios testés atteignent ou dépassent l&apos;objectif de{" "}
                {formatCurrency(comparison.current.targetAmount)} dans {comparison.current.horizonYears} ans.
              </p>
            </div>
          ) : (
            <p className="rounded-md border border-line bg-paper px-4 py-3 text-sm text-slate">
              Saisis un objectif de patrimoine net pour comparer les deux probabilités de
              l&apos;atteindre. Les trajectoires simulées ci-dessous restent valables sans
              objectif.
            </p>
          )}

          <WealthGoalFanChart bands={comparison.current.bands} comparisonBands={comparison.proposed.bands} />
          {depletedNote(comparison.current.flows?.depletedPct ?? 0, comparison.proposed.flows?.depletedPct ?? 0)}

          <div className="border-t border-line pt-3 text-sm">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate">
                  <th className="pb-1 font-normal">Patrimoine net médian dans {comparison.current.horizonYears} ans</th>
                  <th className="pb-1 text-right font-normal">{CURRENT_SERIES_LABEL}</th>
                  <th className="pb-1 text-right font-normal">{PROPOSAL_SERIES_LABEL}</th>
                  <th className="pb-1 text-right font-normal">Écart</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums text-ink">
                <tr className="border-t border-line/50">
                  <td className="py-1 font-sans">En euros courants</td>
                  <td className="py-1 text-right">{formatCurrency(medianFinalNominal)}</td>
                  <td className="py-1 text-right">{formatCurrency(proposedMedianNominal)}</td>
                  <td className="py-1 text-right text-emerald-strong">{signedCurrency(comparison.medianGapNominal)}</td>
                </tr>
                <tr className="border-t border-line/50">
                  <td className="py-1 font-sans">En euros constants</td>
                  <td className="py-1 text-right text-slate">{formatCurrency(medianFinalReal)}</td>
                  <td className="py-1 text-right text-slate">{formatCurrency(proposedMedianReal)}</td>
                  <td className="py-1 text-right text-emerald-strong">{signedCurrency(comparison.medianGapReal)}</td>
                </tr>
                {(usesFlows || inputs.monthlySavings > 0) && (
                  <tr className="border-t border-line/50">
                    <td className="py-1 font-sans">{savingsLineLabel}</td>
                    <td className="py-1 text-right text-slate" colSpan={3}>
                      {signedCurrency(cumulatedSavings)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-line pt-3">
            <p className="mb-2 text-sm text-ink">Détail par poste</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate">
                  <th className="pb-1 font-normal">Poste</th>
                  <th className="pb-1 text-right font-normal">{CURRENT_SERIES_LABEL}</th>
                  <th className="pb-1 text-right font-normal">{PROPOSAL_SERIES_LABEL}</th>
                  <th className="pb-1 text-right font-normal">Écart</th>
                  <th className="pb-1 text-right font-normal">Rendement réel</th>
                  <th className="pb-1 text-right font-normal">Frais / an</th>
                  <th className="pb-1 text-right font-normal">Statut</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums text-ink">
                {comparison.current.breakdown.map((row) => {
                  const proposedRow = proposedRowsById?.get(row.categoryId) ?? row;
                  const gap = proposedRow.amount - row.amount;
                  const sameReturn = returnCell(row) === returnCell(proposedRow);
                  const sameFees = row.feesPct === proposedRow.feesPct;
                  return (
                    <tr key={row.categoryId} className="border-t border-line/50">
                      <td className="py-1 font-sans">{row.label}</td>
                      <td className="py-1 text-right">{formatCurrency(row.amount)}</td>
                      <td className="py-1 text-right">{formatCurrency(proposedRow.amount)}</td>
                      <td className={`py-1 text-right ${Math.round(gap) === 0 ? "text-slate" : "text-ink"}`}>
                        {signedCurrency(gap)}
                      </td>
                      <td className="py-1 text-right text-slate">
                        {sameReturn ? returnCell(row) : `${returnCell(row)} → ${returnCell(proposedRow)}`}
                      </td>
                      <td className="py-1 text-right text-slate">
                        {row.feesPct === null
                          ? ""
                          : sameFees
                            ? formatPercent(row.feesPct, 1)
                            : `${formatPercent(row.feesPct, 1)} → ${formatPercent(proposedRow.feesPct ?? 0, 1)}`}
                      </td>
                      <td className={`py-1 text-right font-sans text-[11px] ${ROW_STATUS_CLASS[row.status]}`}>
                        {ROW_STATUS_LABEL[row.status]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {result.targetAmount > 0 ? (
            <div>
              <p className="text-xs text-slate">
                Sur 2000 trajectoires simulées à partir de la composition réelle du
                portefeuille
                {savingsNote}
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
          {depletedNote(result.flows?.depletedPct ?? 0, null)}

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
            {(usesFlows || inputs.monthlySavings > 0) && (
              <p className="flex items-center justify-between text-ink">
                <span>{savingsLineLabel}</span>
                <span className="font-mono tabular-nums text-slate">
                  {signedCurrency(cumulatedSavings)}
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
                    <td className="py-1 text-right text-slate">{returnCell(row)}</td>
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

      <div className="flex flex-col gap-3 border-t border-line pt-3">
        {draft ? (
          <WealthGoalProposalEditor
            draft={draft}
            onDraftChange={setDraft}
            reallocatableTotal={reallocatableTotal}
            currentAmounts={amounts}
            onStartFromCurrent={() => setDraft(startFromCurrent())}
            onSave={saveProposal}
            onCancel={() => {
              setDraft(null);
              setProposalError(null);
            }}
            isSaving={isProposalPending}
            errorMessage={proposalError}
          />
        ) : proposal ? (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-ink">Allocation proposée enregistrée.</span>
            <button
              type="button"
              onClick={openEditor}
              className="text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              Modifier la proposition
            </button>
            <button
              type="button"
              onClick={removeProposal}
              disabled={isProposalPending}
              className="text-slate underline decoration-dotted underline-offset-2 hover:text-bronze disabled:opacity-50"
            >
              Supprimer la proposition
            </button>
            <a
              href={`/clients/${clientId}/goal/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-slate transition-colors hover:border-emerald hover:text-emerald"
            >
              <FileDown className="h-3 w-3" />
              Exporter la comparaison en PDF
            </a>
            {proposalError && <span className="text-xs text-bronze">{proposalError}</span>}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              onClick={openEditor}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-emerald hover:text-emerald"
            >
              Proposer une allocation
            </button>
            <span className="text-xs text-slate">
              Comparer la probabilité actuelle avec celle d&apos;une réallocation de la poche
              financière, sur les mêmes tirages.
            </span>
          </div>
        )}
      </div>

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
            <strong>Comparaison avant / après</strong> : la situation actuelle et la
            proposition sont simulées sur les mêmes tirages aléatoires (même graine).
            L&apos;immobilier, les prêts, l&apos;entreprise, les autres actifs,
            l&apos;épargne et l&apos;inflation sont identiques des deux côtés ; seule la
            poche financière, sa répartition par indice et ses frais changent. Le total
            proposé doit être égal à la poche financière actuelle. Aucun frais de
            transaction ni fiscalité d&apos;arbitrage n&apos;est modélisé.
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
            de chaque côté, jamais dans l&apos;immobilier ni dans les poches non projetées.
          </p>
          <p className="mb-2">
            <strong>Flux</strong> : quand l&apos;épargne est calculée à partir des flux, le
            solde de chaque année (revenus France et étrangers, loyers bruts, moins dépenses,
            mensualités des prêts jusqu&apos;à leur terme, impôt sur le revenu au barème
            progressif avec les parts du foyer et prélèvements sociaux sur les loyers) remplace
            l&apos;épargne saisie. Revenus, dépenses, loyers et tranches du barème sont indexés
            sur l&apos;inflation retenue ; les mensualités restent nominales. Un solde négatif
            est prélevé sur les liquidités puis sur les autres postes financiers. Les loyers
            comptés en flux ne sont alors plus capitalisés dans le rendement du bien.
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
