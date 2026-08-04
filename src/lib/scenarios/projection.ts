import { computeFullScenarioImpact, computeVacancyImpact, type ClientScenarioContext } from "@/lib/scenarios/calculations";
import { projectLoanBalance } from "@/lib/property/loanCalculations";
import type { ScenarioParams } from "@/lib/scenarios/scenarioParams";

export interface ProjectionYearPoint {
  year: number;
  netWorth: number;
  /** Patrimoine net déflaté par l'inflation cumulée depuis l'année 0, pour
   * comparer en euros constants plutôt qu'en euros courants. */
  realNetWorth: number;
  totalDebt: number;
}

/**
 * Prolonge le scénario actif dans le temps : le choc (immobilier, actions, SCPI,
 * obligations, Private Equity) s'applique une seule fois à l'année 0, puis les
 * valeurs financières et immobilières restent stables en euros courants — seul
 * le remboursement réel du capital des prêts (via `projectLoanBalance`, ancré
 * sur le solde actuel de chaque prêt) fait évoluer le patrimoine net ensuite.
 * Aucune hypothèse de croissance n'est inventée : c'est un choix assumé, pas un
 * oubli — voir l'InfoTooltip de `ProjectionCard`.
 */
export function computeNetWorthProjection(
  context: ClientScenarioContext,
  params: ScenarioParams,
  horizonYears: number
): ProjectionYearPoint[] {
  const impact = computeFullScenarioImpact(context, params);
  const { financialWealthAfterShock, realEstateAfterShock } = impact.breakdown;

  const vacancyProperty = context.properties.find((p) => p.id === params.vacancyPropertyId);
  const vacancyCost = vacancyProperty
    ? computeVacancyImpact(vacancyProperty, params.vacancyMonths).lostRent
    : 0;

  const points: ProjectionYearPoint[] = [];
  for (let year = 0; year <= horizonYears; year++) {
    const totalDebt = context.properties.reduce(
      (sum, property) =>
        sum + property.loans.reduce((loanSum, loan) => loanSum + projectLoanBalance(loan, year), 0),
      0
    );
    const netWorth = financialWealthAfterShock + realEstateAfterShock - totalDebt - vacancyCost;
    const deflator = Math.pow(1 + params.inflationPct / 100, year);
    points.push({
      year,
      netWorth,
      realNetWorth: netWorth / deflator,
      totalDebt,
    });
  }

  return points;
}
