import type { Property } from "@/generated/prisma/client";
import {
  STOCK_PROFILE_BETA,
  type ActionsProfileBreakdown,
} from "@/lib/allocation/stockProfiles";
import type { ZoneSensitivity } from "@/lib/scenarios/realEstateSensitivity";
import type { PropertyWithSensitivity } from "@/lib/scenarios/resolvePropertySensitivity";
import type { ScenarioParams } from "@/lib/scenarios/scenarioParams";
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

export interface ObligationsShockResult {
  currentValue: number;
  newValue: number;
  deltaValue: number;
  shockPct: number;
}

/**
 * Approximation de duration modifiée : ΔP/P ≈ -duration × Δtaux. `durationYears`
 * est une hypothèse manuelle réglée par le conseiller — l'app ne connaît pas les
 * maturités réelles des titres obligataires détenus par le client.
 */
export function computeObligationsShockImpact(
  obligationsAmount: number,
  oatRateChangePts: number,
  durationYears: number
): ObligationsShockResult {
  const shockPct = -durationYears * oatRateChangePts;
  const newValue = obligationsAmount * (1 + shockPct / 100);
  return {
    currentValue: obligationsAmount,
    newValue,
    deltaValue: newValue - obligationsAmount,
    shockPct,
  };
}

export interface PrivateEquityIlliquidityResult {
  currentValue: number;
  newValue: number;
  deltaValue: number;
}

/**
 * Contrairement à un choc de marché, le Private Equity ne se revalorise pas en
 * continu : en cas de besoin de liquidités, la sortie se fait via une cession
 * (marché secondaire) à une décote par rapport à la valeur de part, d'où une
 * simple décote plutôt qu'un pourcentage de marché.
 */
export function computePrivateEquityIlliquidityImpact(
  privateEquityAmount: number,
  discountPct: number
): PrivateEquityIlliquidityResult {
  const newValue = privateEquityAmount * (1 - discountPct / 100);
  return {
    currentValue: privateEquityAmount,
    newValue,
    deltaValue: newValue - privateEquityAmount,
  };
}

export interface ClientScenarioContext {
  financialWealthTotal: number;
  actionsPctWithinFinancial: number;
  actionsBreakdown: ActionsProfileBreakdown;
  properties: PropertyWithSensitivity[];
  /** Montant Immobilier effectif (saisi à la main ou somme des biens détaillés) —
   * utilisé tel quel, non choqué, quand aucun bien n'est détaillé. */
  immobilierValue: number;
  scpiAmount: number;
  obligationsAmount: number;
  privateEquityAmount: number;
}

export interface FullScenarioResult {
  totalBefore: number;
  totalAfter: number;
  deltaAmount: number;
  deltaPct: number;
  breakdown: {
    realEstateDelta: number;
    stocksDelta: number;
    scpiDelta: number;
    obligationsDelta: number;
    peDelta: number;
    debtErosion: number;
    vacancyCost: number;
    /** Valeur du patrimoine financier après choc (actions + reste à plat +
     * SCPI/obligations/PE choqués) — réutilisée telle quelle par la projection
     * multi-années, qui la fige à l'année 0. */
    financialWealthAfterShock: number;
    /** Valeur immobilière totale après choc (biens détaillés + éventuel montant
     * manuel non détaillé) — idem, figée à l'année 0 par la projection. */
    realEstateAfterShock: number;
  };
}

/**
 * Point d'entrée unique pour "ce qu'un scénario fait au patrimoine net" — combine
 * tous les chocs modélisés (actions, immobilier, SCPI, obligations, Private Equity,
 * érosion de la dette par l'inflation, vacance locative) en un seul résultat avant/
 * après, plus le détail par poste. Réutilisé par le simulateur interactif, la
 * comparaison de scénarios et la projection multi-années — un seul endroit qui sait
 * agréger, pour ne pas recoder ce patch à chaque nouvel usage.
 *
 * - Le choc actions ne bouge que la poche Actions du patrimoine financier ; les
 *   autres catégories (obligations, SCPI, Private Equity, liquidités, matières
 *   premières, outil professionnel, autres) restent à plat sauf choc dédié.
 * - Le choc immobilier revalorise chaque bien selon le coefficient de sa zone ;
 *   la dette est nominale et n'est pas affectée par ce choc.
 * - L'inflation ne choque pas les valeurs : elle érode la valeur réelle de la
 *   dette nominale, un effet de richesse positif compté à part.
 * - La vacance est une perte de loyer ponctuelle sur le bien sélectionné, le cas
 *   échéant.
 */
export function computeFullScenarioImpact(
  context: ClientScenarioContext,
  params: ScenarioParams
): FullScenarioResult {
  const {
    financialWealthTotal,
    actionsPctWithinFinancial,
    actionsBreakdown,
    properties,
    immobilierValue,
    scpiAmount,
    obligationsAmount,
    privateEquityAmount,
  } = context;
  const {
    marketShockPct,
    oatRateChangePts,
    scpiShockPct,
    inflationPct,
    inflationYears,
    vacancyPropertyId,
    vacancyMonths,
    obligationsDurationYears,
    peIlliquidityDiscountPct,
  } = params;

  const totalPropertyValue = properties.reduce((sum, p) => sum + p.currentValue, 0);
  const totalDebt = properties.reduce((sum, p) => sum + totalRemainingDebt(p), 0);
  const immobilierBaseline = properties.length === 0 ? immobilierValue : 0;
  const totalBefore = financialWealthTotal + totalPropertyValue - totalDebt + immobilierBaseline;

  const actionsValueBefore = (actionsPctWithinFinancial / 100) * financialWealthTotal;
  const stockShock = computeStockShockImpact(
    actionsBreakdown,
    actionsPctWithinFinancial,
    marketShockPct
  );
  const actionsValueAfter = actionsValueBefore * (1 + stockShock.actionsImpactPct / 100);
  const stocksDelta = actionsValueAfter - actionsValueBefore;

  const scpiShock = computeScpiShockImpact(scpiAmount, scpiShockPct);
  const obligationsShock = computeObligationsShockImpact(
    obligationsAmount,
    oatRateChangePts,
    obligationsDurationYears
  );
  const peShock = computePrivateEquityIlliquidityImpact(
    privateEquityAmount,
    peIlliquidityDiscountPct
  );

  const financialWealthAfterShock =
    financialWealthTotal + stocksDelta + scpiShock.deltaValue + obligationsShock.deltaValue + peShock.deltaValue;

  const realEstateShock = computeRealEstateShockImpact(properties, oatRateChangePts);
  const realEstateAfterShock = realEstateShock.totalNewValue + immobilierBaseline;
  const realEstateDelta = realEstateShock.totalDelta;

  const inflationResult = computeInflationImpact(properties, inflationPct, inflationYears);
  const debtErosion = inflationResult.perProperty.reduce((sum, p) => sum + p.debtErosion, 0);

  const vacancyProperty = properties.find((p) => p.id === vacancyPropertyId);
  const vacancyCost = vacancyProperty
    ? computeVacancyImpact(vacancyProperty, vacancyMonths).lostRent
    : 0;

  const totalAfter =
    financialWealthAfterShock + realEstateAfterShock - totalDebt + debtErosion - vacancyCost;

  const deltaAmount = totalAfter - totalBefore;
  const deltaPct = totalBefore !== 0 ? (deltaAmount / totalBefore) * 100 : 0;

  return {
    totalBefore,
    totalAfter,
    deltaAmount,
    deltaPct,
    breakdown: {
      realEstateDelta,
      stocksDelta,
      scpiDelta: scpiShock.deltaValue,
      obligationsDelta: obligationsShock.deltaValue,
      peDelta: peShock.deltaValue,
      debtErosion,
      vacancyCost,
      financialWealthAfterShock,
      realEstateAfterShock,
    },
  };
}
