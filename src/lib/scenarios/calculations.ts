import type { Property } from "@/generated/prisma/client";
import {
  STOCK_PROFILE_BETA,
  type ActionsProfileBreakdown,
} from "@/lib/allocation/stockProfiles";
import type { ZoneSensitivity } from "@/lib/scenarios/realEstateSensitivity";
import type { PropertyWithSensitivity } from "@/lib/scenarios/resolvePropertySensitivity";
import { totalRemainingDebt, type PropertyWithLoans } from "@/lib/property/loanCalculations";

export interface StockShockResult {
  weightedBeta: number;
  /** Estimated move of the Actions bucket itself, in %. */
  actionsImpactPct: number;
  /** Same move expressed in points of the whole portfolio. */
  portfolioImpactPts: number;
}

export function computeStockShockImpact(
  breakdown: ActionsProfileBreakdown,
  actionsPct: number,
  marketShockPct: number
): StockShockResult {
  const total = breakdown.indiciel + breakdown.defensif + breakdown.croissance;
  const weightedBeta =
    total > 0
      ? (breakdown.indiciel * STOCK_PROFILE_BETA.indiciel +
          breakdown.defensif * STOCK_PROFILE_BETA.defensif +
          breakdown.croissance * STOCK_PROFILE_BETA.croissance) /
        total
      : STOCK_PROFILE_BETA.indiciel;
  const actionsImpactPct = marketShockPct * weightedBeta;
  const portfolioImpactPts = (actionsPct / 100) * actionsImpactPct;

  return { weightedBeta, actionsImpactPct, portfolioImpactPts };
}

export interface PropertyValueImpact {
  propertyId: string;
  propertyName: string;
  currentValue: number;
  newValue: number;
  deltaValue: number;
  remainingLoanAmount: number;
  newEquity: number;
  isUnderwater: boolean;
  shockPct: number;
  sensitivity: ZoneSensitivity;
}

export interface RealEstateShockResult {
  perProperty: PropertyValueImpact[];
  totalCurrentValue: number;
  totalNewValue: number;
  totalDelta: number;
}

/**
 * Chaque bien revalorise selon le coefficient de sensibilité prix/taux de sa propre
 * zone, pas un pourcentage national unique : shockPct = coefficient_zone ×
 * oatRateChangePts. La zone de chaque bien est résolue en amont, côté serveur
 * (voir `resolvePropertySensitivity`) — cette fonction ne fait que lire
 * `property.sensitivity`, elle n'a pas accès à la table commune → zone.
 */
export function computeRealEstateShockImpact(
  properties: PropertyWithSensitivity[],
  oatRateChangePts: number
): RealEstateShockResult {
  const perProperty = properties.map((property) => {
    const sensitivity = property.sensitivity;
    const shockPct = sensitivity.coefficient * oatRateChangePts;
    const newValue = property.currentValue * (1 + shockPct / 100);
    const remainingLoanAmount = totalRemainingDebt(property);
    const newEquity = newValue - remainingLoanAmount;
    return {
      propertyId: property.id,
      propertyName: property.name,
      currentValue: property.currentValue,
      newValue,
      deltaValue: newValue - property.currentValue,
      remainingLoanAmount,
      newEquity,
      isUnderwater: newEquity < 0,
      shockPct,
      sensitivity,
    };
  });

  const totalCurrentValue = properties.reduce((sum, p) => sum + p.currentValue, 0);
  const totalNewValue = perProperty.reduce((sum, p) => sum + p.newValue, 0);

  return {
    perProperty,
    totalCurrentValue,
    totalNewValue,
    totalDelta: totalNewValue - totalCurrentValue,
  };
}

export interface RateHikePropertyImpact {
  propertyId: string;
  propertyName: string;
  fixedDebt: number;
  variableDebt: number;
  extraAnnualCost: number;
  extraMonthlyCost: number;
  newMonthlyCashflow: number | null;
}

export interface RateHikeResult {
  perProperty: RateHikePropertyImpact[];
  totalExtraMonthlyCost: number;
}

/**
 * A bien can now carry several loans with different rate types — the hike
 * only bites the variable-rate ones, so it's a per-loan sum rather than a
 * single fixed/variable flag for the whole property.
 */
export function computeRateHikeImpact(
  properties: PropertyWithLoans[],
  hikePts: number
): RateHikeResult {
  const perProperty = properties.map((property) => {
    const fixedDebt = property.loans
      .filter((loan) => loan.rateType === "fixed")
      .reduce((sum, loan) => sum + loan.remainingAmount, 0);
    const variableDebt = property.loans
      .filter((loan) => loan.rateType === "variable")
      .reduce((sum, loan) => sum + loan.remainingAmount, 0);

    const extraAnnualCost = variableDebt * (hikePts / 100);
    const extraMonthlyCost = extraAnnualCost / 12;
    const newMonthlyCashflow =
      property.monthlyRent !== null
        ? property.monthlyRent - extraMonthlyCost
        : null;

    return {
      propertyId: property.id,
      propertyName: property.name,
      fixedDebt,
      variableDebt,
      extraAnnualCost,
      extraMonthlyCost,
      newMonthlyCashflow,
    };
  });

  return {
    perProperty,
    totalExtraMonthlyCost: perProperty.reduce(
      (sum, p) => sum + p.extraMonthlyCost,
      0
    ),
  };
}

export interface InflationPropertyImpact {
  propertyId: string;
  propertyName: string;
  remainingLoanAmount: number;
  realDebtAfterYears: number;
  debtErosion: number;
  /** Portion of the debt that's fixed-rate — the part that actually benefits
   * from inflation eroding its real value (variable-rate debt gets repriced
   * instead, so it doesn't enjoy the same effect). */
  advantagedAmount: number;
  projectedMonthlyRent: number | null;
}

export interface InflationResult {
  perProperty: InflationPropertyImpact[];
}

export function computeInflationImpact(
  properties: PropertyWithLoans[],
  inflationPct: number,
  years: number
): InflationResult {
  const discount = Math.pow(1 + inflationPct / 100, years);

  const perProperty = properties.map((property) => {
    // Nominal debt is unchanged by inflation, but its real value shrinks —
    // a real benefit for fixed-rate borrowers with debt still outstanding.
    // Fully repaid properties have nothing left to erode.
    const remainingLoanAmount = totalRemainingDebt(property);
    const realDebtAfterYears = remainingLoanAmount / discount;
    const advantagedAmount = property.loans
      .filter((loan) => loan.rateType === "fixed")
      .reduce((sum, loan) => sum + loan.remainingAmount, 0);
    const projectedMonthlyRent =
      property.monthlyRent !== null ? property.monthlyRent * discount : null;

    return {
      propertyId: property.id,
      propertyName: property.name,
      remainingLoanAmount,
      realDebtAfterYears,
      debtErosion: remainingLoanAmount - realDebtAfterYears,
      advantagedAmount,
      projectedMonthlyRent,
    };
  });

  return { perProperty };
}

export interface VacancyResult {
  propertyId: string;
  propertyName: string;
  months: number;
  monthlyRent: number;
  lostRent: number;
}

export function computeVacancyImpact(
  property: Property,
  months: number
): VacancyResult {
  const monthlyRent = property.monthlyRent ?? 0;
  return {
    propertyId: property.id,
    propertyName: property.name,
    months,
    monthlyRent,
    lostRent: monthlyRent * months,
  };
}

export interface ScpiShockResult {
  currentValue: number;
  newValue: number;
  deltaValue: number;
}

/**
 * Unlike a physical property, an SCPI's exposure isn't per-unit debt/rate —
 * it's a lump € position that can be marked down (a "décote de part") in a
 * downturn, so the shock is modeled as a flat price move on the amount
 * held, independent of the direct real estate shock.
 */
export function computeScpiShockImpact(
  scpiAmount: number,
  shockPct: number
): ScpiShockResult {
  const newValue = scpiAmount * (1 + shockPct / 100);
  return {
    currentValue: scpiAmount,
    newValue,
    deltaValue: newValue - scpiAmount,
  };
}

export interface CombinedNetWorthResult {
  totalBefore: number;
  totalAfter: number;
  deltaAmount: number;
  deltaPct: number;
}

/**
 * Combines all four shocks into a single before/after net worth figure, by
 * reusing the per-shock functions above unchanged:
 * - Stock shock moves only the Actions slice of financial wealth; the other
 *   5 financial categories have no modeled shock and stay flat.
 * - Real estate shock revalues each property's gross value; debt is nominal
 *   and unaffected.
 * - Inflation's contribution is the real erosion of outstanding debt,
 *   counted as a positive wealth effect (nominal debt unchanged, but worth
 *   less in real terms).
 * - Vacancy is a direct lost-rent deduction for the selected property, if any.
 */
export function computeCombinedNetWorthImpact(params: {
  financialWealthTotal: number;
  actionsPctWithinFinancial: number;
  actionsBreakdown: ActionsProfileBreakdown;
  marketShockPct: number;
  properties: PropertyWithSensitivity[];
  oatRateChangePts: number;
  inflationPct: number;
  inflationYears: number;
  vacancyPropertyId: string | null;
  vacancyMonths: number;
}): CombinedNetWorthResult {
  const {
    financialWealthTotal,
    actionsPctWithinFinancial,
    actionsBreakdown,
    marketShockPct,
    properties,
    oatRateChangePts,
    inflationPct,
    inflationYears,
    vacancyPropertyId,
    vacancyMonths,
  } = params;

  const totalPropertyValue = properties.reduce((sum, p) => sum + p.currentValue, 0);
  const totalDebt = properties.reduce((sum, p) => sum + totalRemainingDebt(p), 0);
  const totalBefore = financialWealthTotal + totalPropertyValue - totalDebt;

  const actionsValueBefore = (actionsPctWithinFinancial / 100) * financialWealthTotal;
  const stockShock = computeStockShockImpact(
    actionsBreakdown,
    actionsPctWithinFinancial,
    marketShockPct
  );
  const actionsValueAfter =
    actionsValueBefore * (1 + stockShock.actionsImpactPct / 100);
  const financialWealthAfter =
    financialWealthTotal - actionsValueBefore + actionsValueAfter;

  const realEstateShock = computeRealEstateShockImpact(properties, oatRateChangePts);

  const inflationResult = computeInflationImpact(
    properties,
    inflationPct,
    inflationYears
  );
  const totalDebtErosion = inflationResult.perProperty.reduce(
    (sum, p) => sum + p.debtErosion,
    0
  );

  const vacancyProperty = properties.find((p) => p.id === vacancyPropertyId);
  const lostRent = vacancyProperty
    ? computeVacancyImpact(vacancyProperty, vacancyMonths).lostRent
    : 0;

  const totalAfter =
    financialWealthAfter +
    realEstateShock.totalNewValue -
    totalDebt +
    totalDebtErosion -
    lostRent;

  const deltaAmount = totalAfter - totalBefore;
  const deltaPct = totalBefore !== 0 ? (deltaAmount / totalBefore) * 100 : 0;

  return { totalBefore, totalAfter, deltaAmount, deltaPct };
}
