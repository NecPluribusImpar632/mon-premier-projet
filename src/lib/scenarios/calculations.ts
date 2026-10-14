import type { Property } from "@/generated/prisma/client";
import type { ActionsIndexBreakdown } from "@/lib/allocation/actionsIndexBreakdown";
import type { ZoneSensitivity } from "@/lib/scenarios/realEstateSensitivity";
import {
  GOLD_SENSITIVITY,
  SILVER_SENSITIVITY,
  type PreciousMetalSensitivity,
} from "@/lib/scenarios/preciousMetalsSensitivity";
import type { PropertyWithSensitivity } from "@/lib/scenarios/resolvePropertySensitivity";
import type { ScenarioParams } from "@/lib/scenarios/scenarioParams";
import { totalRemainingDebt, type PropertyWithLoans } from "@/lib/property/loanCalculations";
import { ownedLoanAmount, ownedMonthlyRent, ownedValue } from "@/lib/property/ownership";

export interface StockShockResult {
  /** Estimated move of the Actions bucket itself, in %. */
  actionsImpactPct: number;
  /** Same move expressed in points of the whole portfolio. */
  portfolioImpactPts: number;
}

/**
 * marketShockPct is already the real weighted move for the client's actual
 * index mix (see indexScenarioShocks.ts's resolvedMarketShockPct, which
 * blends each held index's real historical shock by its % of the Actions
 * bucket) — no beta multiplier here, unlike the old Indiciel/Défensif/
 * Croissance model, since each index's own historical number already
 * reflects how it actually moved.
 */
export function computeStockShockImpact(
  actionsPct: number,
  marketShockPct: number
): StockShockResult {
  const portfolioImpactPts = (actionsPct / 100) * marketShockPct;
  return { actionsImpactPct: marketShockPct, portfolioImpactPts };
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

/** "fixed": the scenario sets the shock directly (same % for every
 * property); "derived": it follows the OAT move through each zone's
 * sensitivity coefficient. */
export type ShockMode = "fixed" | "derived";

export interface RealEstateShockResult {
  perProperty: PropertyValueImpact[];
  totalCurrentValue: number;
  totalNewValue: number;
  totalDelta: number;
  mode: ShockMode;
}

/**
 * Mode dérivé (overrideShockPct null) : chaque bien revalorise selon le coefficient
 * de sensibilité prix/taux de sa propre zone, shockPct = coefficient_zone ×
 * oatRateChangePts. La zone de chaque bien est résolue en amont, côté serveur
 * (voir `resolvePropertySensitivity`). Mode fixe : le scénario impose le même
 * choc à tous les biens (ex. Crise 2008 : -8 %), la sensibilité par zone n'entre
 * pas en jeu.
 */
export function computeRealEstateShockImpact(
  properties: PropertyWithSensitivity[],
  oatRateChangePts: number,
  overrideShockPct: number | null = null
): RealEstateShockResult {
  const mode: ShockMode = overrideShockPct === null ? "derived" : "fixed";
  const perProperty = properties.map((property) => {
    const sensitivity = property.sensitivity;
    const shockPct =
      overrideShockPct === null ? sensitivity.coefficient * oatRateChangePts : overrideShockPct;
    const currentValue = ownedValue(property);
    const newValue = currentValue * (1 + shockPct / 100);
    const remainingLoanAmount = totalRemainingDebt(property);
    const newEquity = newValue - remainingLoanAmount;
    return {
      propertyId: property.id,
      propertyName: property.name,
      currentValue,
      newValue,
      deltaValue: newValue - currentValue,
      remainingLoanAmount,
      newEquity,
      isUnderwater: newEquity < 0,
      shockPct,
      sensitivity,
    };
  });

  const totalCurrentValue = perProperty.reduce((sum, p) => sum + p.currentValue, 0);
  const totalNewValue = perProperty.reduce((sum, p) => sum + p.newValue, 0);

  return {
    perProperty,
    totalCurrentValue,
    totalNewValue,
    totalDelta: totalNewValue - totalCurrentValue,
    mode,
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
      .reduce((sum, loan) => sum + ownedLoanAmount(loan, property), 0);
    const variableDebt = property.loans
      .filter((loan) => loan.rateType === "variable")
      .reduce((sum, loan) => sum + ownedLoanAmount(loan, property), 0);

    const extraAnnualCost = variableDebt * (hikePts / 100);
    const extraMonthlyCost = extraAnnualCost / 12;
    const monthlyRent = ownedMonthlyRent(property);
    const newMonthlyCashflow = monthlyRent !== null ? monthlyRent - extraMonthlyCost : null;

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
      .reduce((sum, loan) => sum + ownedLoanAmount(loan, property), 0);
    const monthlyRent = ownedMonthlyRent(property);
    const projectedMonthlyRent = monthlyRent !== null ? monthlyRent * discount : null;

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
  const monthlyRent = ownedMonthlyRent(property) ?? 0;
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
  mode: ShockMode;
}

/**
 * Mode dérivé (overrideShockPct null) : approximation de duration modifiée,
 * ΔP/P ≈ -duration × Δtaux, où `durationYears` est une hypothèse manuelle réglée
 * par le conseiller (l'app ne connaît pas les maturités réelles des titres).
 * Mode fixe : le scénario impose la variation (ex. Crise 2008 : +8 %, les
 * obligations d'État ayant monté quand les taux baissaient).
 */
export function computeObligationsShockImpact(
  obligationsAmount: number,
  oatRateChangePts: number,
  durationYears: number,
  overrideShockPct: number | null = null
): ObligationsShockResult {
  const mode: ShockMode = overrideShockPct === null ? "derived" : "fixed";
  const shockPct =
    overrideShockPct === null ? -durationYears * oatRateChangePts : overrideShockPct;
  const newValue = obligationsAmount * (1 + shockPct / 100);
  return {
    currentValue: obligationsAmount,
    newValue,
    deltaValue: newValue - obligationsAmount,
    shockPct,
    mode,
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

export interface PreciousMetalShockResult {
  currentValue: number;
  newValue: number;
  deltaValue: number;
  shockPct: number;
}

/**
 * Choc or/argent = tendance de fond (calibrée sur la régression prix USD /
 * inflation US, décalage 0 — voir preciousMetalsSensitivity.ts) appliquée au
 * montant détenu. La volatilité de court terme du métal (eurVolatilityPct)
 * n'entre pas dans ce calcul déterministe : elle est affichée à part comme
 * fourchette de contexte, pas comme aléa simulé.
 */
export function computePreciousMetalShockImpact(
  amount: number,
  inflationPct: number,
  sensitivity: PreciousMetalSensitivity
): PreciousMetalShockResult {
  const shockPct = sensitivity.intercept + sensitivity.slope * inflationPct;
  const newValue = amount * (1 + shockPct / 100);
  return {
    currentValue: amount,
    newValue,
    deltaValue: newValue - amount,
    shockPct,
  };
}

export interface ClientScenarioContext {
  financialWealthTotal: number;
  actionsPctWithinFinancial: number;
  /** % of the Actions bucket tracking each real index (e.g. 40% CAC 40, 60%
   * Nasdaq) — used to resolve the named presets' market shock (see
   * indexScenarioShocks.ts), not by computeStockShockImpact itself (it stays
   * a plain scalar shock). */
  actionsIndexBreakdown: ActionsIndexBreakdown;
  properties: PropertyWithSensitivity[];
  /** Montant Immobilier effectif (saisi à la main ou somme des biens détaillés) —
   * utilisé tel quel, non choqué, quand aucun bien n'est détaillé. */
  immobilierValue: number;
  scpiAmount: number;
  obligationsAmount: number;
  privateEquityAmount: number;
  /** Montant "Matières premières" total du client — sert à savoir si le choc
   * or/argent est pertinent à proposer, et si la répartition ci-dessous est
   * incomplète. */
  matieresPremieresAmount: number;
  /** Répartition or/argent du montant ci-dessus — une donnée réelle du
   * patrimoine du client (comme le sous-profil Actions), saisie une fois
   * dans l'onglet Allocation, pas un paramètre de scénario à ressaisir à
   * chaque simulation. */
  goldAmount: number;
  silverAmount: number;
}

/**
 * One line item of a scenario's impact, shaped generically so the narrative
 * generator (src/lib/scenarios/narrative.ts) and the "En savoir plus" detail
 * list can both consume it without knowing the specific set of asset classes
 * in advance — adding a new shocked category later (assurance vie, or...)
 * only means pushing another entry here, no changes needed downstream.
 */
export interface ScenarioImpactPost {
  id: string;
  /** Display label for the detail list, e.g. "Immobilier". */
  label: string;
  /** Sentence-ready fragment with its article already resolved, e.g.
   * "l'immobilier", "les obligations" — written once at the source so the
   * narrative templates never have to guess gender/article. */
  nounPhrase: string;
  /** Grammatical number of nounPhrase — the templates need this to conjugate
   * their verb correctly ("les obligations concentrent", not "concentre"). */
  isPlural: boolean;
  /** Amount this delta is measured against (current holding, or the
   * relevant base for non-holding posts like debt erosion / vacancy). */
  valueBefore: number;
  /** Signed € impact on net worth: positive cushions, negative aggravates. */
  delta: number;
  /** delta / valueBefore, null when valueBefore is 0 (no meaningful %). */
  deltaPct: number | null;
  /** True when this post's whole calculation leans on a manual/simplifying
   * hypothesis already flagged elsewhere in the app (bond duration, PE exit
   * discount, real estate zone coefficient reliability). */
  isAssumption: boolean;
  /** One-line method note for the detail list, when it depends on the
   * scenario (fixed shock vs rate-derived); otherwise the static note in
   * narrative.ts applies. */
  methodologyNote?: string;
}

export interface FullScenarioResult {
  totalBefore: number;
  totalAfter: number;
  deltaAmount: number;
  deltaPct: number;
  posts: ScenarioImpactPost[];
  breakdown: {
    realEstateDelta: number;
    stocksDelta: number;
    scpiDelta: number;
    obligationsDelta: number;
    peDelta: number;
    goldDelta: number;
    silverDelta: number;
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
    properties,
    immobilierValue,
    scpiAmount,
    obligationsAmount,
    privateEquityAmount,
    goldAmount,
    silverAmount,
  } = context;
  const {
    marketShockPct,
    oatRateChangePts,
    realEstateShockPct,
    obligationsShockPct,
    scpiShockPct,
    inflationPct,
    inflationYears,
    vacancyPropertyId,
    vacancyMonths,
    obligationsDurationYears,
    peIlliquidityDiscountPct,
  } = params;

  const totalPropertyValue = properties.reduce((sum, p) => sum + ownedValue(p), 0);
  const totalDebt = properties.reduce((sum, p) => sum + totalRemainingDebt(p), 0);
  const immobilierBaseline = properties.length === 0 ? immobilierValue : 0;
  const totalBefore = financialWealthTotal + totalPropertyValue - totalDebt + immobilierBaseline;

  const actionsValueBefore = (actionsPctWithinFinancial / 100) * financialWealthTotal;
  const stockShock = computeStockShockImpact(actionsPctWithinFinancial, marketShockPct);
  const actionsValueAfter = actionsValueBefore * (1 + stockShock.actionsImpactPct / 100);
  const stocksDelta = actionsValueAfter - actionsValueBefore;

  const scpiShock = computeScpiShockImpact(scpiAmount, scpiShockPct);
  const obligationsShock = computeObligationsShockImpact(
    obligationsAmount,
    oatRateChangePts,
    obligationsDurationYears,
    obligationsShockPct
  );
  const peShock = computePrivateEquityIlliquidityImpact(
    privateEquityAmount,
    peIlliquidityDiscountPct
  );
  const goldShock = computePreciousMetalShockImpact(
    goldAmount,
    inflationPct,
    GOLD_SENSITIVITY
  );
  const silverShock = computePreciousMetalShockImpact(
    silverAmount,
    inflationPct,
    SILVER_SENSITIVITY
  );

  const financialWealthAfterShock =
    financialWealthTotal +
    stocksDelta +
    scpiShock.deltaValue +
    obligationsShock.deltaValue +
    peShock.deltaValue +
    goldShock.deltaValue +
    silverShock.deltaValue;

  const realEstateShock = computeRealEstateShockImpact(
    properties,
    oatRateChangePts,
    realEstateShockPct
  );
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

  const pct = (delta: number, base: number) => (base !== 0 ? (delta / base) * 100 : null);

  // Only a post the client actually holds (or, for debt erosion/vacancy, has
  // a relevant base for) is worth narrating — mirrors the same relevance
  // gating already used to decide which shock card shows in the simulator.
  const posts: ScenarioImpactPost[] = [];
  if (actionsValueBefore > 0) {
    posts.push({
      id: "actions",
      label: "Actions",
      nounPhrase: "la poche actions",
      isPlural: false,
      valueBefore: actionsValueBefore,
      delta: stocksDelta,
      deltaPct: pct(stocksDelta, actionsValueBefore),
      isAssumption: false,
    });
  }
  if (totalPropertyValue > 0) {
    posts.push({
      id: "realEstate",
      label: "Immobilier",
      nounPhrase: "l'immobilier",
      isPlural: false,
      valueBefore: totalPropertyValue,
      delta: realEstateDelta,
      deltaPct: pct(realEstateDelta, totalPropertyValue),
      // A fixed shock is scenario data, not an estimate; only the rate-derived
      // path rests on the zone regressions' modest reliability.
      isAssumption: realEstateShock.mode === "derived",
      methodologyNote:
        realEstateShock.mode === "fixed"
          ? "Choc de prix fixé par le scénario, identique pour tous les biens."
          : "Revalorisation selon la sensibilité prix/taux calibrée par zone.",
    });
  }
  if (scpiAmount > 0) {
    posts.push({
      id: "scpi",
      label: "SCPI",
      nounPhrase: "la SCPI",
      isPlural: false,
      valueBefore: scpiAmount,
      delta: scpiShock.deltaValue,
      deltaPct: pct(scpiShock.deltaValue, scpiAmount),
      isAssumption: true,
    });
  }
  if (obligationsAmount > 0) {
    posts.push({
      id: "obligations",
      label: "Obligations",
      nounPhrase: "les obligations",
      isPlural: true,
      valueBefore: obligationsAmount,
      delta: obligationsShock.deltaValue,
      deltaPct: pct(obligationsShock.deltaValue, obligationsAmount),
      isAssumption: obligationsShock.mode === "derived",
      methodologyNote:
        obligationsShock.mode === "fixed"
          ? "Variation fixée par le scénario."
          : "Approximation de duration : ΔPrix/Prix ≈ -duration × Δtaux.",
    });
  }
  if (privateEquityAmount > 0) {
    posts.push({
      id: "privateEquity",
      label: "Private Equity",
      nounPhrase: "le Private Equity",
      isPlural: false,
      valueBefore: privateEquityAmount,
      delta: peShock.deltaValue,
      deltaPct: pct(peShock.deltaValue, privateEquityAmount),
      isAssumption: true,
    });
  }
  if (goldAmount > 0) {
    posts.push({
      id: "or",
      label: "Or",
      nounPhrase: "l'or",
      isPlural: false,
      valueBefore: goldAmount,
      delta: goldShock.deltaValue,
      deltaPct: pct(goldShock.deltaValue, goldAmount),
      isAssumption: true,
    });
  }
  if (silverAmount > 0) {
    posts.push({
      id: "argent",
      label: "Argent",
      nounPhrase: "l'argent",
      isPlural: false,
      valueBefore: silverAmount,
      delta: silverShock.deltaValue,
      deltaPct: pct(silverShock.deltaValue, silverAmount),
      isAssumption: true,
    });
  }
  if (totalDebt > 0) {
    posts.push({
      id: "debtErosion",
      label: "Érosion de la dette",
      nounPhrase: "l'érosion de la dette",
      isPlural: false,
      valueBefore: totalDebt,
      delta: debtErosion,
      deltaPct: pct(debtErosion, totalDebt),
      isAssumption: false,
    });
  }
  const hasRentedProperty = properties.some((property) => property.monthlyRent !== null);
  if (hasRentedProperty) {
    const annualRent = (vacancyProperty ? ownedMonthlyRent(vacancyProperty) ?? 0 : 0) * 12;
    posts.push({
      id: "vacancy",
      label: "Vacance locative",
      nounPhrase: "la vacance locative",
      isPlural: false,
      valueBefore: annualRent,
      delta: -vacancyCost,
      deltaPct: pct(-vacancyCost, annualRent),
      isAssumption: false,
    });
  }

  return {
    totalBefore,
    totalAfter,
    deltaAmount,
    deltaPct,
    posts,
    breakdown: {
      realEstateDelta,
      stocksDelta,
      scpiDelta: scpiShock.deltaValue,
      obligationsDelta: obligationsShock.deltaValue,
      peDelta: peShock.deltaValue,
      goldDelta: goldShock.deltaValue,
      silverDelta: silverShock.deltaValue,
      debtErosion,
      vacancyCost,
      financialWealthAfterShock,
      realEstateAfterShock,
    },
  };
}
