import {
  projectLoanAnnualPayment,
  type PropertyWithLoans,
} from "@/lib/property/loanCalculations";
import {
  INCOME_TAX_SCALE_2025,
  MICRO_FONCIER_ABATEMENT_PCT,
  RENTAL_SOCIAL_CONTRIBUTIONS_PCT,
  computeIncomeTax,
  taxableSalary,
  type IncomeTaxScale,
} from "@/lib/fiscal/incomeTax";

/**
 * What the advisor enters for the flows of the wealth goal, all annual and
 * in today's euros. The fiscal parts come from the foyer fiscal section.
 */
export interface WealthGoalFlows {
  /** Revenus nets perçus imposables en France (salaires et assimilés). */
  incomeFranceAnnual: number;
  /** Revenus nets de source étrangère, déjà imposés à l'étranger : comptés
   * dans l'épargne, exclus du barème français. */
  incomeForeignAnnual: number;
  livingExpensesAnnual: number;
  fiscalParts: number;
}

/** One simulated year of flows, in euros courants of that year. */
export interface CashFlowYear {
  /** 1 = the twelve months after today. */
  year: number;
  incomeFrance: number;
  incomeForeign: number;
  grossRents: number;
  livingExpenses: number;
  loanPayments: number;
  incomeTax: number;
  socialContributions: number;
  /** incomes + rents − expenses − loan payments − taxes. Negative = drawn
   * from the financial pockets. */
  balance: number;
}

export function flowsAreEmpty(flows: WealthGoalFlows): boolean {
  return (
    flows.incomeFranceAnnual === 0 &&
    flows.incomeForeignAnnual === 0 &&
    flows.livingExpensesAnnual === 0
  );
}

export function annualGrossRents(properties: PropertyWithLoans[]): number {
  return properties.reduce((sum, property) => sum + (property.monthlyRent ?? 0) * 12, 0);
}

/**
 * Deterministic schedule of the client's flows over the horizon. Incomes,
 * rents, expenses and the tax scale are indexed on the scenario inflation
 * (constant in real terms: no career progression, no retirement date, see the
 * Méthodologie page). Loan payments are nominal and stop with each loan.
 * Rents are taxed as micro-foncier whatever their amount: 70 % of the gross
 * rent joins the salary base in the progressive scale, and bears the social
 * contributions.
 */
export function computeCashFlowSchedule(
  flows: WealthGoalFlows,
  properties: PropertyWithLoans[],
  horizonYears: number,
  inflationPct: number,
  scale: IncomeTaxScale = INCOME_TAX_SCALE_2025
): CashFlowYear[] {
  const schedule: CashFlowYear[] = [];
  const baseRents = annualGrossRents(properties);

  for (let year = 1; year <= horizonYears; year++) {
    // Year 1 is in today's euros; each following year carries one more year
    // of inflation.
    const index = Math.pow(1 + inflationPct / 100, year - 1);
    const incomeFrance = Math.max(flows.incomeFranceAnnual, 0) * index;
    const incomeForeign = Math.max(flows.incomeForeignAnnual, 0) * index;
    const grossRents = baseRents * index;
    const livingExpenses = Math.max(flows.livingExpensesAnnual, 0) * index;
    const loanPayments = properties.reduce(
      (sum, property) =>
        sum + property.loans.reduce((loanSum, loan) => loanSum + projectLoanAnnualPayment(loan, year), 0),
      0
    );

    const taxableRents = grossRents * (1 - MICRO_FONCIER_ABATEMENT_PCT / 100);
    const taxableIncome = taxableSalary(incomeFrance, scale, index) + taxableRents;
    const incomeTax = computeIncomeTax(taxableIncome, flows.fiscalParts, scale, index);
    const socialContributions = taxableRents * (RENTAL_SOCIAL_CONTRIBUTIONS_PCT / 100);

    schedule.push({
      year,
      incomeFrance,
      incomeForeign,
      grossRents,
      livingExpenses,
      loanPayments,
      incomeTax,
      socialContributions,
      balance:
        incomeFrance +
        incomeForeign +
        grossRents -
        livingExpenses -
        loanPayments -
        incomeTax -
        socialContributions,
    });
  }

  return schedule;
}

/** The first simulated year alone, in today's euros, for the "épargne
 * calculée" display and the PDF. */
export function firstYearFlows(
  flows: WealthGoalFlows,
  properties: PropertyWithLoans[],
  inflationPct: number
): CashFlowYear {
  return computeCashFlowSchedule(flows, properties, 1, inflationPct)[0];
}
