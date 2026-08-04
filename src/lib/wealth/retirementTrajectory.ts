import { projectLoanBalance, type PropertyWithLoans } from "@/lib/property/loanCalculations";
import type { ProjectionYearPoint } from "@/lib/scenarios/projection";

export interface RetirementGoal {
  retirementAge: number;
  monthlySavingsAmount: number;
  expectedAnnualReturnPct: number;
}

/**
 * Future value of the current financial wealth plus constant monthly
 * contributions, compounded monthly at `expectedAnnualReturnPct` — the
 * standard lump-sum-plus-annuity formula. This is deliberately the ONLY
 * quantity that grows: unlike the scenario projection (which freezes values
 * after a shock), growing this pocket via savings + return is the entire
 * point of a retirement trajectory.
 */
function projectFinancialWealth(
  financialWealthTotal: number,
  monthlySavingsAmount: number,
  expectedAnnualReturnPct: number,
  years: number
): number {
  const r = expectedAnnualReturnPct / 100 / 12;
  const months = years * 12;

  if (r === 0) {
    return financialWealthTotal + monthlySavingsAmount * months;
  }
  const growthFactor = Math.pow(1 + r, months);
  return (
    financialWealthTotal * growthFactor +
    monthlySavingsAmount * ((growthFactor - 1) / r)
  );
}

/**
 * Projects a client's net worth trajectory from today until retirement:
 * financial wealth compounds with monthly savings and an assumed return;
 * real estate value is held stable (same transparency principle as the
 * scenario projection — no property appreciation is invented); debt keeps
 * amortizing per each loan's actual terms via `projectLoanBalance`, reused
 * unchanged from the scenario projection feature.
 */
export function computeRetirementTrajectory(
  currentAge: number,
  financialWealthTotal: number,
  immobilierValue: number,
  properties: PropertyWithLoans[],
  goal: RetirementGoal,
  inflationPct: number
): ProjectionYearPoint[] {
  const horizonYears = Math.max(goal.retirementAge - currentAge, 0);

  const points: ProjectionYearPoint[] = [];
  for (let year = 0; year <= horizonYears; year++) {
    const totalDebt = properties.reduce(
      (sum, property) =>
        sum + property.loans.reduce((loanSum, loan) => loanSum + projectLoanBalance(loan, year), 0),
      0
    );
    const financialWealth = projectFinancialWealth(
      financialWealthTotal,
      goal.monthlySavingsAmount,
      goal.expectedAnnualReturnPct,
      year
    );
    const netWorth = financialWealth + immobilierValue - totalDebt;
    const deflator = Math.pow(1 + inflationPct / 100, year);
    points.push({
      year,
      netWorth,
      realNetWorth: netWorth / deflator,
      totalDebt,
    });
  }

  return points;
}
