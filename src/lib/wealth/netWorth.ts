import type { Client } from "@/generated/prisma/client";
import {
  amountsFromClient,
  effectiveImmobilierAmount,
  financialTotalFromAmounts,
} from "@/lib/allocation/mapping";
import { totalRemainingDebt, type PropertyWithLoans } from "@/lib/property/loanCalculations";

export interface NetWorthSummary {
  /** Financial wealth + gross real estate value, before debt. */
  grossWealth: number;
  /** Sum of remaining loan capital across all properties. */
  totalDebt: number;
  /** grossWealth - totalDebt. */
  netWealth: number;
}

/**
 * `immobilierValue` is already resolved (manual amount, or the sum of
 * detailed properties when at least one exists — see
 * `effectiveImmobilierAmount` in `lib/allocation/mapping.ts`). Debt only
 * ever comes from detailed properties, since a manual Immobilier figure has
 * no associated loan.
 */
export function computeNetWorth(
  financialWealthTotal: number,
  immobilierValue: number,
  properties: PropertyWithLoans[]
): NetWorthSummary {
  const totalDebt = properties.reduce((sum, p) => sum + totalRemainingDebt(p), 0);
  const grossWealth = financialWealthTotal + immobilierValue;

  return {
    grossWealth,
    totalDebt,
    netWealth: grossWealth - totalDebt,
  };
}

/**
 * Same computation as `computeNetWorth`, but starting straight from a
 * `Client` + its properties — the composition (amounts → financial total →
 * effective Immobilier → net worth) that was previously only inlined inside
 * `WealthSummary`/`ClientAllocationEditor`. Used wherever a client's net
 * worth is needed without rendering the allocation editor (clients list,
 * PDF export).
 */
export function computeClientNetWorth(
  client: Client,
  properties: PropertyWithLoans[]
): NetWorthSummary {
  const amounts = amountsFromClient(client);
  const financialWealthTotal = financialTotalFromAmounts(amounts);
  const immobilierValue = effectiveImmobilierAmount(
    amounts.immobilier ?? 0,
    properties
  );
  return computeNetWorth(financialWealthTotal, immobilierValue, properties);
}
