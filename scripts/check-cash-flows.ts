/**
 * Vérifications déterministes du moteur de flux (lot 5), sans base de données :
 *   npx tsx scripts/check-cash-flows.ts
 * Le projet n'a pas de framework de test ; ce script joue ce rôle pour l'IR,
 * les mensualités, l'échéancier et l'intégration au Monte Carlo.
 */
import {
  INCOME_TAX_SCALE_2025,
  computeIncomeTax,
  fiscalPartsFromFoyer,
  taxableSalary,
} from "@/lib/fiscal/incomeTax";
import { projectLoanAnnualPayment, projectLoanBalance } from "@/lib/property/loanCalculations";
import { computeCashFlowSchedule } from "@/lib/wealth/cashFlows";
import { computeWealthGoalMonteCarlo } from "@/lib/wealth/monteCarloProjection";
import type { Loan, Property } from "@/generated/prisma/client";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "OK " : "KO "} ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

// ---- IR
check("parts célibataire", fiscalPartsFromFoyer("celibataire", 0) === 1);
check("parts marié 3 enfants", fiscalPartsFromFoyer("marie", 3) === 4);
check("parts concubinage 1 enfant", fiscalPartsFromFoyer("concubinage", 1) === 1.5);
check("parts null", fiscalPartsFromFoyer(null, null) === 1);

// 30 000 € imposable, 1 part : 11% de (29 315 − 11 497) + 30% de 685 = 1 960 + 205,5 = 2 165,5
check("IR 30k 1 part", near(computeIncomeTax(30_000, 1), 2165.5, 0.5), String(computeIncomeTax(30_000, 1)));
// 60 000 € imposable, 2 parts = 2 × IR(30 000) = 4 331
check("IR 60k 2 parts", near(computeIncomeTax(60_000, 2), 4331, 1), String(computeIncomeTax(60_000, 2)));
// Plafonnement QF : 200 000 € imposable, marié 4 enfants (5 parts).
// Sans plafond : 5 × IR(40 000) = 5 × (1 960 + 3 205,5) = 25 827,5
// Base 2 parts : 2 × IR(100 000) = 2 × (1 960 + 16 352,4 + 6 632,57) = 49 889,94 ; avantage max 6 demi-parts × 1 791 = 10 746 → plancher 39 143,94
const capped = computeIncomeTax(200_000, 5);
check("IR plafonnement QF", near(capped, 39_143.94, 1), String(capped));
check("abattement 10 % plancher", near(taxableSalary(4_000, INCOME_TAX_SCALE_2025), 3_496, 0.01));
check("abattement 10 % plafond", near(taxableSalary(200_000, INCOME_TAX_SCALE_2025), 185_574, 0.01));
check("abattement 10 % courant", near(taxableSalary(50_000, INCOME_TAX_SCALE_2025), 45_000, 0.01));
// Indexation : tranches ×1.5 et revenu ×1.5 → impôt ×1.5
check("indexation barème", near(computeIncomeTax(45_000, 1, INCOME_TAX_SCALE_2025, 1.5), 1.5 * computeIncomeTax(30_000, 1), 0.01));

// ---- Loans
const baseLoan: Loan = {
  id: "l1", label: null, originalAmount: 200_000, remainingAmount: 200_000, rate: 3, rateType: "fixed",
  amortizationType: "amortissable", residualAmount: null, termYears: 20, startDate: null,
  createdAt: new Date(), updatedAt: new Date(), propertyId: "p1",
};
const M = (200_000 * (0.03 / 12)) / (1 - Math.pow(1 + 0.03 / 12, -240));
check("mensualité amortissable", near(projectLoanAnnualPayment(baseLoan, 1), M * 12, 0.01), `${M * 12}`);
check("paiement après terme", projectLoanAnnualPayment(baseLoan, 21) === 0);
let totalPaid = 0;
for (let y = 1; y <= 20; y++) totalPaid += projectLoanAnnualPayment(baseLoan, y);
check("cohérence paiements / solde", near(totalPaid, M * 240, 0.01) && near(projectLoanBalance(baseLoan, 20), 0, 0.01));
// Amortization identity: payments = capital + interest, year 1
const bal1 = projectLoanBalance(baseLoan, 1);
check("capital + intérêts année 1", near(projectLoanAnnualPayment(baseLoan, 1), 200_000 - bal1 + (200_000 + bal1) / 2 * 0.03, 60));
const inFine: Loan = { ...baseLoan, amortizationType: "in_fine", termYears: 5 };
check("in fine intérêts", near(projectLoanAnnualPayment(inFine, 1), 6_000, 0.01));
check("in fine remboursement au terme", near(projectLoanAnnualPayment(inFine, 5), 206_000, 0.01));
check("in fine après terme", projectLoanAnnualPayment(inFine, 6) === 0);
const partiel: Loan = { ...baseLoan, amortizationType: "partiel", residualAmount: 50_000, termYears: 10 };
let partielPaid = 0;
for (let y = 1; y <= 10; y++) partielPaid += projectLoanAnnualPayment(partiel, y);
check("partiel résiduel au terme", near(projectLoanBalance(partiel, 9.99), 50_000, 300) && projectLoanAnnualPayment(partiel, 10) > 50_000 && projectLoanAnnualPayment(partiel, 11) === 0, `${partielPaid}`);
// Started 17.5 years ago: 2.5 years remain → year 3 is half a year
const started = new Date(Date.now() - 17.5 * 365.25 * 24 * 3600 * 1000);
const partial: Loan = { ...baseLoan, remainingAmount: 30_000, startDate: started };
const p1 = projectLoanAnnualPayment(partial, 1);
const p3 = projectLoanAnnualPayment(partial, 3);
check("dernière année au prorata", near(p3, p1 / 2, 1) && projectLoanAnnualPayment(partial, 4) === 0, `${p1} ${p3}`);

// ---- Schedule
const property: Property & { loans: Loan[] } = {
  id: "p1", name: "Bien", currentValue: 300_000, isPrimaryResidence: false, monthlyRent: 1_000,
  acquisitionPrice: null, acquisitionDate: null, department: null, arrondissement: null, communeCode: null,
  createdAt: new Date(), updatedAt: new Date(), clientId: "c1", loans: [baseLoan],
};
const flows = { incomeFranceAnnual: 60_000, incomeForeignAnnual: 10_000, livingExpensesAnnual: 30_000, fiscalParts: 1 };
const schedule = computeCashFlowSchedule(flows, [property], 25, 2);
const y1 = schedule[0];
const expectedTaxable = 54_000 + 12_000 * 0.7;
check("année 1 base imposable", near(y1.incomeTax, computeIncomeTax(expectedTaxable, 1), 0.01));
check("année 1 PS loyers", near(y1.socialContributions, 8_400 * 0.172, 0.01));
check("année 1 solde", near(y1.balance, 60_000 + 10_000 + 12_000 - 30_000 - M * 12 - y1.incomeTax - y1.socialContributions, 0.01), `${y1.balance}`);
check("année 1 en euros d'aujourd'hui", y1.incomeFrance === 60_000);
check("année 2 indexée", near(schedule[1].incomeFrance, 61_200, 0.01));
check("IR constant en réel", near(schedule[10].incomeTax, y1.incomeTax * Math.pow(1.02, 10), 0.5));
check("mensualités nominales", near(schedule[10].loanPayments, y1.loanPayments, 0.01));
check("mensualités s'arrêtent", schedule[20].loanPayments === 0 && schedule[19].loanPayments > 0);

// ---- Monte Carlo
const context = {
  amounts: { actions: 100_000, obligations: 50_000, liquidites: 50_000 },
  properties: [property],
  immobilierValue: 300_000,
};
const base = {
  currentAge: 40, targetAge: 60, targetAmount: 1_000_000, inflationPct: 2,
  actionsIndexBreakdown: { "msci-world": 100 } as never,
  fees: { actions: 1.5, obligations: 1, scpi: 0, privateEquity: 2, immobilier: 0 },
};
const manual = computeWealthGoalMonteCarlo(context, { ...base, monthlySavingsAmount: 0, flows: null });
check("mode manuel : pas de résumé de flux", manual.flows === null);
const withFlows = computeWealthGoalMonteCarlo(context, { ...base, monthlySavingsAmount: 0, flows });
check("mode flux : résumé présent", withFlows.flows !== null && near(withFlows.flows.firstYear.balance, y1.balance, 0.01));
check("mode flux : rien d'épuisé", withFlows.flows!.depletedPct === 0);
check("flux positifs > médiane manuelle sans épargne", withFlows.bands.p50[20].netWorth > manual.bands.p50[20].netWorth);
// Equivalent manual savings vs flows with zero flows minus nothing: manual savings S vs flows balance S, same rents treatment differs (rents capitalized vs cash) so compare on a property-less context
const noProp = { amounts: context.amounts, properties: [], immobilierValue: 0 };
const flowsNoTax = { incomeFranceAnnual: 0, incomeForeignAnnual: 12_000, livingExpensesAnnual: 0, fiscalParts: 1 };
const a = computeWealthGoalMonteCarlo(noProp, { ...base, inflationPct: 0, monthlySavingsAmount: 1_000, flows: null }, 42);
const b = computeWealthGoalMonteCarlo(noProp, { ...base, inflationPct: 0, monthlySavingsAmount: 0, flows: flowsNoTax }, 42);
check("1000 €/mois manuel == 12 000 €/an de revenu étranger (0 % inflation, même graine)", near(a.bands.p50[20].netWorth, b.bands.p50[20].netWorth, 0.01), `${a.bands.p50[20].netWorth} vs ${b.bands.p50[20].netWorth}`);
// Deficit draws liquidités first: expenses 60k, no income → year-1 deficit 60k on 50k liquidités
const deficitFlows = { incomeFranceAnnual: 0, incomeForeignAnnual: 0, livingExpensesAnnual: 60_000, fiscalParts: 1 };
const d = computeWealthGoalMonteCarlo(noProp, { ...base, inflationPct: 0, monthlySavingsAmount: 0, flows: deficitFlows }, 7);
check("déficit : poche épuisée dans 100 % des trajectoires", d.flows!.depletedPct === 100, `${d.flows!.depletedPct}`);
check("déficit : patrimoine médian final négatif", d.bands.p50[20].netWorth < 0, `${d.bands.p50[20].netWorth}`);
const mild = { incomeFranceAnnual: 0, incomeForeignAnnual: 0, livingExpensesAnnual: 5_000, fiscalParts: 1 };
const m = computeWealthGoalMonteCarlo(noProp, { ...base, inflationPct: 0, monthlySavingsAmount: 0, flows: mild }, 7);
check("déficit léger : rien d'épuisé, patrimoine < sans flux", m.flows!.depletedPct === 0 && m.bands.p50[20].netWorth < computeWealthGoalMonteCarlo(noProp, { ...base, inflationPct: 0, monthlySavingsAmount: 0, flows: null }, 7).bands.p50[20].netWorth);

console.log(failures === 0 ? "\nTOUT OK" : `\n${failures} ÉCHEC(S)`);
process.exit(failures === 0 ? 0 : 1);
