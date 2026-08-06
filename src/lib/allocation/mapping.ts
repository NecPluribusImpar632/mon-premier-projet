import type { Client, Property, WrapperAllocation } from "@/generated/prisma/client";
import type { AllocationEntry } from "@/types/allocation";
import type { ActionsProfileBreakdown } from "./stockProfiles";
import { ASSET_CATEGORIES, FINANCIAL_CATEGORY_IDS } from "./categories";
import {
  WRAPPERS,
  emptyWrapperBreakdown,
  type Wrapper,
  type WrapperBreakdown,
} from "./wrappers";

type CategoryFieldName =
  | "actionsAmount"
  | "obligationsAmount"
  | "immobilierAmount"
  | "scpiAmount"
  | "liquiditesAmount"
  | "privateEquityAmount"
  | "outilProfessionnelAmount"
  | "matieresPremieresAmount"
  | "autresAmount";

const CATEGORY_FIELD_MAP: Record<string, CategoryFieldName> = {
  actions: "actionsAmount",
  obligations: "obligationsAmount",
  immobilier: "immobilierAmount",
  scpi: "scpiAmount",
  liquidites: "liquiditesAmount",
  "private-equity": "privateEquityAmount",
  "outil-professionnel": "outilProfessionnelAmount",
  "matieres-premieres": "matieresPremieresAmount",
  autres: "autresAmount",
};

/** All 8 categories' € amounts, as entered directly by the advisor (Immobilier included — see `effectiveImmobilierAmount`). */
export function amountsFromClient(client: Client): Record<string, number> {
  return Object.fromEntries(
    ASSET_CATEGORIES.map((category) => [
      category.id,
      client[CATEGORY_FIELD_MAP[category.id]],
    ])
  );
}

export function allocationFieldsFromAmounts(
  amounts: Record<string, number>
): Partial<Record<CategoryFieldName, number>> {
  const fields: Partial<Record<CategoryFieldName, number>> = {};
  for (const category of ASSET_CATEGORIES) {
    fields[CATEGORY_FIELD_MAP[category.id]] = amounts[category.id] ?? 0;
  }
  return fields;
}

/** Sum of the financial categories' € amounts (everything except Immobilier). */
export function financialTotalFromAmounts(amounts: Record<string, number>): number {
  return FINANCIAL_CATEGORY_IDS.reduce((sum, id) => sum + (amounts[id] ?? 0), 0);
}

/**
 * The Immobilier amount actually used everywhere (donut, bilan patrimonial,
 * stress test): the manually-entered figure by default, but overridden by
 * the real sum of detailed properties as soon as at least one exists — the
 * two are never both counted.
 */
export function effectiveImmobilierAmount(
  manualAmount: number,
  properties: Property[]
): number {
  if (properties.length === 0) return manualAmount;
  return properties.reduce((sum, p) => sum + p.currentValue, 0);
}

/** Immobilier's share of the total patrimoine (financial + real estate), in %. */
export function computeImmobilierPct(
  financialTotal: number,
  immobilierValue: number
): number {
  const totalPatrimoine = financialTotal + immobilierValue;
  return totalPatrimoine > 0 ? (immobilierValue / totalPatrimoine) * 100 : 0;
}

/**
 * All 8 categories as % of the TOTAL patrimoine (financial + real estate),
 * derived directly from € amounts.
 */
export function overallEntriesFromAmounts(
  amounts: Record<string, number>,
  properties: Property[]
): AllocationEntry[] {
  const financialTotal = financialTotalFromAmounts(amounts);
  const immobilierValue = effectiveImmobilierAmount(amounts.immobilier ?? 0, properties);
  const grandTotal = financialTotal + immobilierValue;

  const financial = FINANCIAL_CATEGORY_IDS.map((categoryId) => ({
    categoryId,
    percentage: grandTotal > 0 ? ((amounts[categoryId] ?? 0) / grandTotal) * 100 : 0,
  }));

  const immobilierPct = computeImmobilierPct(financialTotal, immobilierValue);

  return [...financial, { categoryId: "immobilier", percentage: immobilierPct }];
}

export function overallEntriesFromClient(
  client: Client,
  properties: Property[]
): AllocationEntry[] {
  return overallEntriesFromAmounts(amountsFromClient(client), properties);
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

/** Whether the client draws most of their income from their own/family business. */
export function professionalToolMainIncomeFromClient(client: Client): boolean {
  return client.professionalToolMainIncome;
}

/**
 * Rows from the WrapperAllocation table, grouped by category into a
 * breakdown-by-wrapper for each financial category. Only nonzero amounts are
 * ever persisted (no row = "not detailed", not "detailed as 0"), so most
 * clients will have an empty breakdown for most categories. Unknown
 * category/wrapper values (stale data from a removed option) are skipped
 * rather than thrown on.
 */
export function wrapperBreakdownsFromClient(
  wrapperAllocations: WrapperAllocation[]
): Record<string, WrapperBreakdown> {
  const result: Record<string, WrapperBreakdown> = Object.fromEntries(
    FINANCIAL_CATEGORY_IDS.map((id) => [id, emptyWrapperBreakdown()])
  );
  const wrapperIds: readonly string[] = WRAPPERS;
  for (const row of wrapperAllocations) {
    if (result[row.category] && wrapperIds.includes(row.wrapper)) {
      result[row.category][row.wrapper as Wrapper] = row.amount;
    }
  }
  return result;
}

/** Breakdown for one category → the rows to persist (nonzero amounts only). */
export function wrapperAllocationRowsFromBreakdown(
  clientId: string,
  category: string,
  breakdown: WrapperBreakdown
): { clientId: string; category: string; wrapper: string; amount: number }[] {
  return WRAPPERS.filter((wrapper) => breakdown[wrapper] > 0).map((wrapper) => ({
    clientId,
    category,
    wrapper,
    amount: breakdown[wrapper],
  }));
}
