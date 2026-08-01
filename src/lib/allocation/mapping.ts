import type { Client } from "@/generated/prisma/client";
import type { AllocationEntry } from "@/types/allocation";
import type { ActionsProfileBreakdown } from "./stockProfiles";
import { FINANCIAL_CATEGORY_IDS } from "./categories";

type FinancialFieldName =
  | "actionsAmount"
  | "obligationsAmount"
  | "liquiditesAmount"
  | "privateEquityAmount"
  | "matieresPremieresAmount"
  | "autresAmount";

const FINANCIAL_FIELD_MAP: Record<string, FinancialFieldName> = {
  actions: "actionsAmount",
  obligations: "obligationsAmount",
  liquidites: "liquiditesAmount",
  "private-equity": "privateEquityAmount",
  "matieres-premieres": "matieresPremieresAmount",
  autres: "autresAmount",
};

/** The 6 non-Immobilier categories' € amounts, as entered directly by the advisor. */
export function financialAmountsFromClient(client: Client): Record<string, number> {
  return Object.fromEntries(
    FINANCIAL_CATEGORY_IDS.map((categoryId) => [
      categoryId,
      client[FINANCIAL_FIELD_MAP[categoryId]],
    ])
  );
}

export function financialAllocationFieldsFromAmounts(
  amounts: Record<string, number>
): Partial<Record<FinancialFieldName, number>> {
  const fields: Partial<Record<FinancialFieldName, number>> = {};
  for (const categoryId of FINANCIAL_CATEGORY_IDS) {
    fields[FINANCIAL_FIELD_MAP[categoryId]] = amounts[categoryId] ?? 0;
  }
  return fields;
}

/** Sum of the 6 financial categories' € amounts. */
export function financialTotalFromAmounts(amounts: Record<string, number>): number {
  return FINANCIAL_CATEGORY_IDS.reduce((sum, id) => sum + (amounts[id] ?? 0), 0);
}

/** Immobilier's share of the total patrimoine (financial + real estate), in %. */
export function computeImmobilierPct(
  financialTotal: number,
  totalPropertyValue: number
): number {
  const totalPatrimoine = financialTotal + totalPropertyValue;
  return totalPatrimoine > 0 ? (totalPropertyValue / totalPatrimoine) * 100 : 0;
}

/**
 * All 7 categories as % of the TOTAL patrimoine (financial + real estate),
 * derived directly from € amounts. There is no separate "total" to keep in
 * sync — the total simply is the sum of what's entered, and Immobilier is
 * derived from the real sum of property values so it can never drift out
 * of sync with the properties actually on file.
 */
export function overallEntriesFromAmounts(
  amounts: Record<string, number>,
  totalPropertyValue: number
): AllocationEntry[] {
  const financialTotal = financialTotalFromAmounts(amounts);
  const grandTotal = financialTotal + totalPropertyValue;

  const financial = FINANCIAL_CATEGORY_IDS.map((categoryId) => ({
    categoryId,
    percentage: grandTotal > 0 ? ((amounts[categoryId] ?? 0) / grandTotal) * 100 : 0,
  }));

  const immobilierPct = computeImmobilierPct(financialTotal, totalPropertyValue);

  return [...financial, { categoryId: "immobilier", percentage: immobilierPct }];
}

export function overallEntriesFromClient(
  client: Client,
  totalPropertyValue: number
): AllocationEntry[] {
  return overallEntriesFromAmounts(
    financialAmountsFromClient(client),
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
