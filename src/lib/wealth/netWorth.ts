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
