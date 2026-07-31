import type { Client } from "@/generated/prisma/client";
import type { AllocationEntry } from "@/types/allocation";
import type { ActionsProfileBreakdown } from "./stockProfiles";
import { FINANCIAL_CATEGORY_IDS } from "./categories";

type FinancialFieldName =
  | "actionsPct"
  | "obligationsPct"
  | "liquiditesPct"
  | "privateEquityPct"
  | "matieresPremieresPct"
  | "autresPct";

const FINANCIAL_FIELD_MAP: Record<string, FinancialFieldName> = {
  actions: "actionsPct",
  obligations: "obligationsPct",
  liquidites: "liquiditesPct",
  "private-equity": "privateEquityPct",
  "matieres-premieres": "matieresPremieresPct",
  autres: "autresPct",
};

/** The 6 non-Immobilier categories, as % of the financial-only bucket (sums to 100). */
export function financialEntriesFromClient(client: Client): AllocationEntry[] {
  return FINANCIAL_CATEGORY_IDS.map((categoryId) => ({
    categoryId,
    percentage: client[FINANCIAL_FIELD_MAP[categoryId]],
  }));
}

export function financialAllocationFieldsFromEntries(
  entries: AllocationEntry[]
): Partial<Record<FinancialFieldName, number>> {
  const fields: Partial<Record<FinancialFieldName, number>> = {};
  for (const entry of entries) {
    const field = FINANCIAL_FIELD_MAP[entry.categoryId];
    if (field) {
      fields[field] = entry.percentage;
    }
  }
  return fields;
}

/** Immobilier's share of the total patrimoine (financial + real estate), in %. */
export function computeImmobilierPct(
  financialWealthTotal: number,
  totalPropertyValue: number
): number {
  const totalPatrimoine = financialWealthTotal + totalPropertyValue;
  return totalPatrimoine > 0 ? (totalPropertyValue / totalPatrimoine) * 100 : 0;
}

/**
 * All 7 categories as % of the TOTAL patrimoine (financial + real estate).
 * Immobilier is derived from the real sum of property values rather than
 * stored independently, so it can never drift out of sync with the
 * properties actually on file. The 6 financial categories are scaled down
 * proportionally to make room for Immobilier's real share.
 */
export function overallEntriesFromFinancial(
  financialEntries: AllocationEntry[],
  financialWealthTotal: number,
  totalPropertyValue: number
): AllocationEntry[] {
  const immobilierPct = computeImmobilierPct(financialWealthTotal, totalPropertyValue);
  const financialShare = 100 - immobilierPct;

  const financial = financialEntries.map((entry) => ({
    categoryId: entry.categoryId,
    percentage: (entry.percentage / 100) * financialShare,
  }));

  return [...financial, { categoryId: "immobilier", percentage: immobilierPct }];
}

export function overallEntriesFromClient(
  client: Client,
  totalPropertyValue: number
): AllocationEntry[] {
  return overallEntriesFromFinancial(
    financialEntriesFromClient(client),
    client.financialWealthTotal,
    totalPropertyValue
  );
}

export function actionsBreakdownFromClient(
  client: Client
): ActionsProfileBreakdown {
  return {
    indiciel: client.actionsIndicielPct,
    defensif: client.actionsDefensifPct,
    croissance: client.actionsCroissancePct,
  };
}
