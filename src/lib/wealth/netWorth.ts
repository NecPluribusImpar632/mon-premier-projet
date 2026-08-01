import type { Property } from "@/generated/prisma/client";

export interface NetWorthSummary {
  /** Financial wealth + gross real estate value, before debt. */
  grossWealth: number;
  totalPropertyValue: number;
  /** Sum of remaining loan capital across all properties. */
  totalDebt: number;
  /** grossWealth - totalDebt. */
  netWealth: number;
}

export function computeNetWorth(
  financialWealthTotal: number,
  properties: Property[]
): NetWorthSummary {
  const totalPropertyValue = properties.reduce((sum, p) => sum + p.currentValue, 0);
  const totalDebt = properties.reduce((sum, p) => sum + p.remainingLoanAmount, 0);
  const grossWealth = financialWealthTotal + totalPropertyValue;

  return {
    grossWealth,
    totalPropertyValue,
    totalDebt,
    netWealth: grossWealth - totalDebt,
  };
}
