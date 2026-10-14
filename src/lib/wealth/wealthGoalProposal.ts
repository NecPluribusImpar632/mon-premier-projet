import type { WealthGoalProposal } from "@/generated/prisma/client";
import {
  emptyActionsIndexBreakdown,
  type ActionsIndexBreakdown,
} from "@/lib/allocation/actionsIndexBreakdown";
import { REFERENCE_INDICES, isReferenceIndex } from "@/lib/allocation/referenceIndices";
import type { AnnualFeesPct } from "@/lib/wealth/monteCarloAssumptions";

/**
 * The six financial postes an advisor can reallocate in the before/after
 * comparison. Immobilier, loans, the business (outil professionnel) and
 * Autres stay identical on both sides: moving money into a non-projected
 * poste would change nothing in the simulation, and moving it out would mean
 * selling the business, which is not a portfolio arbitrage.
 */
export const PROPOSAL_CATEGORY_IDS = [
  "actions",
  "obligations",
  "scpi",
  "liquidites",
  "private-equity",
  "matieres-premieres",
] as const;

export type ProposalCategoryId = (typeof PROPOSAL_CATEGORY_IDS)[number];

export const PROPOSAL_CATEGORY_LABELS: Record<ProposalCategoryId, string> = {
  actions: "Actions",
  obligations: "Obligations",
  scpi: "SCPI",
  liquidites: "Liquidités",
  "private-equity": "Private Equity",
  "matieres-premieres": "Matières premières",
};

export type ProposalAmounts = Record<ProposalCategoryId, number>;

/** What the advisor edits and what the server persists. */
export interface WealthGoalProposalData {
  amounts: ProposalAmounts;
  actionsIndexBreakdown: ActionsIndexBreakdown;
  fees: AnnualFeesPct;
}

/** Series labels, shared by the tab, the chart legend and the PDF. */
export const CURRENT_SERIES_LABEL = "Situation actuelle";
export const PROPOSAL_SERIES_LABEL = "Proposition";

/** Rounding tolerance on the "same total" constraint, in euros. */
export const PROPOSAL_TOTAL_TOLERANCE = 1;

export function proposalAmountsFromCurrent(amounts: Record<string, number>): ProposalAmounts {
  return Object.fromEntries(
    PROPOSAL_CATEGORY_IDS.map((id) => [id, amounts[id] ?? 0])
  ) as ProposalAmounts;
}

export function proposalTotal(amounts: ProposalAmounts): number {
  return PROPOSAL_CATEGORY_IDS.reduce((sum, id) => sum + (amounts[id] ?? 0), 0);
}

/** "Partir de l'allocation actuelle": the proposal starts as a copy. */
export function proposalFromCurrent(
  amounts: Record<string, number>,
  actionsIndexBreakdown: ActionsIndexBreakdown,
  fees: AnnualFeesPct
): WealthGoalProposalData {
  return {
    amounts: proposalAmountsFromCurrent(amounts),
    actionsIndexBreakdown: { ...actionsIndexBreakdown },
    fees: { ...fees },
  };
}

/** The current amounts with the six financial postes replaced by the
 * proposal, so the Monte Carlo context keeps immobilier and the frozen postes
 * untouched. */
export function amountsWithProposal(
  amounts: Record<string, number>,
  proposal: ProposalAmounts
): Record<string, number> {
  return { ...amounts, ...proposal };
}

/** Breakdown stored as Json: tolerant parse, unknown keys dropped. */
export function actionsIndexBreakdownFromJson(value: unknown): ActionsIndexBreakdown {
  const result = emptyActionsIndexBreakdown();
  if (value && typeof value === "object") {
    for (const [key, pct] of Object.entries(value as Record<string, unknown>)) {
      if (isReferenceIndex(key) && typeof pct === "number" && Number.isFinite(pct)) {
        result[key] = pct;
      }
    }
  }
  return result;
}

export function actionsIndexBreakdownToJson(
  breakdown: ActionsIndexBreakdown
): Record<string, number> {
  return Object.fromEntries(
    REFERENCE_INDICES.filter((index) => breakdown[index] > 0).map((index) => [
      index,
      breakdown[index],
    ])
  );
}

export function proposalDataFromRow(row: WealthGoalProposal): WealthGoalProposalData {
  return {
    amounts: {
      actions: row.actionsAmount,
      obligations: row.obligationsAmount,
      scpi: row.scpiAmount,
      liquidites: row.liquiditesAmount,
      "private-equity": row.privateEquityAmount,
      "matieres-premieres": row.matieresPremieresAmount,
    },
    actionsIndexBreakdown: actionsIndexBreakdownFromJson(row.actionsIndexBreakdown),
    fees: {
      actions: row.feesActionsPct,
      obligations: row.feesObligationsPct,
      scpi: row.feesScpiPct,
      privateEquity: row.feesPrivateEquityPct,
      immobilier: row.feesImmobilierPct,
    },
  };
}
