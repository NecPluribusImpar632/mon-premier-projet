import type { Loan, Property } from "@/generated/prisma/client";

export type PropertyWithLoans = Property & { loans: Loan[] };

export function totalRemainingDebt(property: PropertyWithLoans): number {
  return property.loans.reduce((sum, loan) => sum + loan.remainingAmount, 0);
}

export interface AmortizationYear {
  year: number;
  remainingCapital: number;
  principalPaidThisYear: number;
  interestPaidThisYear: number;
}

/**
 * Monthly payment for an "amortissable" or "partiel" loan — the standard
 * annuity formula generalized to a non-zero residual capital V at term end
 * (V = 0 gives the classic full-amortization formula). Not meaningful for
 * "in_fine" loans, which have no capital component in their monthly payment.
 */
export function computeMonthlyPayment(loan: Loan): number {
  const P = loan.originalAmount;
  const V = loan.amortizationType === "partiel" ? loan.residualAmount ?? 0 : 0;
  const n = loan.termYears * 12;
  const r = loan.rate / 100 / 12;

  if (n <= 0) return 0;
  if (r === 0) return (P - V) / n;
  return ((P - V * Math.pow(1 + r, -n)) * r) / (1 - Math.pow(1 + r, -n));
}

/**
 * Remaining capital after `months` months of an amortissable/partiel loan.
 */
function remainingBalance(loan: Loan, months: number): number {
  const P = loan.originalAmount;
  const n = loan.termYears * 12;
  const r = loan.rate / 100 / 12;
  const M = computeMonthlyPayment(loan);

  if (months >= n) {
    return loan.amortizationType === "partiel" ? loan.residualAmount ?? 0 : 0;
  }
  if (r === 0) return P - M * months;
  return P * Math.pow(1 + r, months) - (M * (Math.pow(1 + r, months) - 1)) / r;
}

/**
 * Year-by-year schedule (not monthly — a 20-year loan in monthly rows would
 * be unreadable in a card) up to `termYears`. "in_fine" loans keep a
 * constant capital until the last year, where the full amount is repaid at
 * once; "amortissable"/"partiel" loans decline according to the annuity
 * formula above.
 */
export function computeAmortizationSchedule(loan: Loan): AmortizationYear[] {
  const schedule: AmortizationYear[] = [];

  if (loan.amortizationType === "in_fine") {
    const annualInterest = loan.originalAmount * (loan.rate / 100);
    for (let year = 1; year <= loan.termYears; year++) {
      const isLastYear = year === loan.termYears;
      schedule.push({
        year,
        remainingCapital: isLastYear ? 0 : loan.originalAmount,
        principalPaidThisYear: isLastYear ? loan.originalAmount : 0,
        interestPaidThisYear: annualInterest,
      });
    }
    return schedule;
  }

  const M = computeMonthlyPayment(loan);
  let previousBalance = loan.originalAmount;
  for (let year = 1; year <= loan.termYears; year++) {
    const balance = remainingBalance(loan, year * 12);
    const principalPaidThisYear = previousBalance - balance;
    const interestPaidThisYear = M * 12 - principalPaidThisYear;
    schedule.push({
      year,
      remainingCapital: balance,
      principalPaidThisYear,
      interestPaidThisYear,
    });
    previousBalance = balance;
  }

  return schedule;
}
