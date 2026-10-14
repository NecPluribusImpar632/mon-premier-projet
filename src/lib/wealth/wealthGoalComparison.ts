import {
  computeWealthGoalMonteCarlo,
  wealthGoalSeed,
  type MonteCarloResult,
  type WealthGoalContext,
  type WealthGoalInputs,
} from "@/lib/wealth/monteCarloProjection";
import {
  amountsWithProposal,
  type WealthGoalProposalData,
} from "@/lib/wealth/wealthGoalProposal";

export interface WealthGoalComparison {
  current: MonteCarloResult;
  proposed: MonteCarloResult;
  /** Median net worth at the horizon, proposed minus current. */
  medianGapNominal: number;
  medianGapReal: number;
  /** Success probability, proposed minus current, in points. */
  successGapPts: number;
}

function finalMedian(result: MonteCarloResult): number {
  return result.bands.p50[result.bands.p50.length - 1]?.netWorth ?? 0;
}

export function deflate(nominal: number, inflationPct: number, years: number): number {
  return nominal / Math.pow(1 + inflationPct / 100, years);
}

/**
 * Runs the Monte Carlo twice on the same seed: once on the client's current
 * allocation, once with the six financial postes, the index breakdown and
 * the fees replaced by the proposal. Everything else in the context (real
 * estate, loans, frozen postes) and in the inputs (goal, horizon, inflation,
 * savings) is shared, which is exactly what the shared seed depends on.
 */
export function computeWealthGoalComparison(
  context: WealthGoalContext,
  inputs: WealthGoalInputs,
  proposal: WealthGoalProposalData
): WealthGoalComparison {
  const seed = wealthGoalSeed(context, inputs);
  const current = computeWealthGoalMonteCarlo(context, inputs, seed);
  const proposed = computeWealthGoalMonteCarlo(
    { ...context, amounts: amountsWithProposal(context.amounts, proposal.amounts) },
    {
      ...inputs,
      actionsIndexBreakdown: proposal.actionsIndexBreakdown,
      fees: proposal.fees,
    },
    seed
  );
  const medianGapNominal = finalMedian(proposed) - finalMedian(current);
  return {
    current,
    proposed,
    medianGapNominal,
    medianGapReal: deflate(medianGapNominal, inputs.inflationPct, current.horizonYears),
    successGapPts: proposed.successPct - current.successPct,
  };
}
