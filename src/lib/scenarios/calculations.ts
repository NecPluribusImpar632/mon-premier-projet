import type { Property } from "@/generated/prisma/client";
import {
  STOCK_PROFILE_BETA,
  type ActionsProfileBreakdown,
} from "@/lib/allocation/stockProfiles";

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
}

export interface RealEstateShockResult {
  perProperty: PropertyValueImpact[];
  totalCurrentValue: number;
  totalNewValue: number;
  totalDelta: number;
}

export function computeRealEstateShockImpact(
  properties: Property[],
  shockPct: number
): RealEstateShockResult {
  const perProperty = properties.map((property) => {
    const newValue = property.currentValue * (1 + shockPct / 100);
    const newEquity = newValue - property.remainingLoanAmount;
    return {
      propertyId: property.id,
      propertyName: property.name,
      currentValue: property.currentValue,
      newValue,
      deltaValue: newValue - property.currentValue,
      remainingLoanAmount: property.remainingLoanAmount,
      newEquity,
      isUnderwater: newEquity < 0,
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
  isFixed: boolean;
  extraAnnualCost: number;
  extraMonthlyCost: number;
  newMonthlyCashflow: number | null;
}

export interface RateHikeResult {
  perProperty: RateHikePropertyImpact[];
  totalExtraMonthlyCost: number;
}

export function computeRateHikeImpact(
  properties: Property[],
  hikePts: number
): RateHikeResult {
  const perProperty = properties.map((property) => {
    const isFixed = property.rateType === "fixed";
    // Fixed-rate loans are protected from the hike (payment doesn't move),
    // but their cashflow doesn't improve either. Variable-rate loans absorb
    // the hike as extra interest on the remaining principal.
    const extraAnnualCost = isFixed
      ? 0
      : property.remainingLoanAmount * (hikePts / 100);
    const extraMonthlyCost = extraAnnualCost / 12;
    const newMonthlyCashflow =
      property.monthlyRent !== null
        ? property.monthlyRent - extraMonthlyCost
        : null;

    return {
      propertyId: property.id,
      propertyName: property.name,
      isFixed,
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
  isAdvantaged: boolean;
  projectedMonthlyRent: number | null;
}

export interface InflationResult {
  perProperty: InflationPropertyImpact[];
}

export function computeInflationImpact(
  properties: Property[],
  inflationPct: number,
  years: number
): InflationResult {
  const discount = Math.pow(1 + inflationPct / 100, years);

  const perProperty = properties.map((property) => {
    // Nominal debt is unchanged by inflation, but its real value shrinks —
    // a real benefit for fixed-rate borrowers with debt still outstanding.
    // Fully repaid properties have nothing left to erode.
    const realDebtAfterYears = property.remainingLoanAmount / discount;
    const isAdvantaged =
      property.rateType === "fixed" && property.remainingLoanAmount > 0;
    const projectedMonthlyRent =
      property.monthlyRent !== null ? property.monthlyRent * discount : null;

    return {
      propertyId: property.id,
      propertyName: property.name,
      remainingLoanAmount: property.remainingLoanAmount,
      realDebtAfterYears,
      debtErosion: property.remainingLoanAmount - realDebtAfterYears,
      isAdvantaged,
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
