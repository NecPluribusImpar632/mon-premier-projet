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

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Years remaining on a loan, counted from today rather than from its schedule.
 * Without a `startDate` there's no way to know how much has already elapsed,
 * so it's assumed (documented to the advisor) that the full `termYears`
 * remain — the best available fallback given what the app stores.
 */
function remainingTermYears(loan: Loan): number {
  if (!loan.startDate) return loan.termYears;
  const elapsedYears = (Date.now() - loan.startDate.getTime()) / MS_PER_YEAR;
  return Math.max(loan.termYears - elapsedYears, 0);
}

/**
 * Projects a loan's balance `yearsFromNow` years ahead, anchored on its
 * CURRENT `remainingAmount` rather than replaying `computeAmortizationSchedule`
 * from `originalAmount` — `remainingAmount` is the source of truth today (it
 * may reflect a prepayment the origination-based schedule doesn't know
 * about), so the projection re-annuitizes from there over the remaining term.
 */
export function projectLoanBalance(loan: Loan, yearsFromNow: number): number {
  const remainingTerm = remainingTermYears(loan);

  if (loan.amortizationType === "in_fine") {
    return yearsFromNow >= remainingTerm ? 0 : loan.remainingAmount;
  }

  const P = loan.remainingAmount;
  const V = loan.amortizationType === "partiel" ? loan.residualAmount ?? 0 : 0;
  const n = remainingTerm * 12;
  const r = loan.rate / 100 / 12;
  const monthsFromNow = yearsFromNow * 12;

  if (n <= 0) return V;
  if (monthsFromNow >= n) return V;

  const M = r === 0 ? (P - V) / n : ((P - V * Math.pow(1 + r, -n)) * r) / (1 - Math.pow(1 + r, -n));
  if (r === 0) return P - M * monthsFromNow;
  return P * Math.pow(1 + r, monthsFromNow) - (M * (Math.pow(1 + r, monthsFromNow) - 1)) / r;
}

/**
 * Cash paid on a loan during simulated year `year` (1 = the twelve months
 * after today), capital and interest together, from the same re-annuitized
 * schedule as `projectLoanBalance` so the two never disagree. Amortissable
 * and partiel loans pay their monthly instalment for the months still due in
 * that year (a partial last year is prorated); a partiel loan also repays its
 * residual capital, and an in fine loan its whole capital, in cash at term.
 * Nominal, never indexed: a fixed-rate loan does not follow inflation.
 */
export function projectLoanAnnualPayment(loan: Loan, year: number): number {
  if (year <= 0) return 0;
  const remainingTerm = remainingTermYears(loan);
  const n = remainingTerm * 12;
  if (n <= 0) return 0;

  const monthsBefore = (year - 1) * 12;
  const monthsPaid = Math.max(0, Math.min(12, n - monthsBefore));
  // The term ends inside this year (or exactly at its end): any balloon is
  // repaid now. Strictly before the end of the previous year means the loan
  // has already been settled.
  const termEndsThisYear = n > monthsBefore && n <= year * 12;

  if (loan.amortizationType === "in_fine") {
    const annualInterest = loan.remainingAmount * (loan.rate / 100);
    const interest = annualInterest * (monthsPaid / 12);
    return interest + (termEndsThisYear ? loan.remainingAmount : 0);
  }

  const P = loan.remainingAmount;
  const V = loan.amortizationType === "partiel" ? loan.residualAmount ?? 0 : 0;
  const r = loan.rate / 100 / 12;
  const M = r === 0 ? (P - V) / n : ((P - V * Math.pow(1 + r, -n)) * r) / (1 - Math.pow(1 + r, -n));
  return M * monthsPaid + (termEndsThisYear ? V : 0);
}
