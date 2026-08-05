import {
  computeHighGainSurtax,
  computeHoldingPeriodAbatement,
  fullYearsElapsed,
} from "@/lib/fiscal/capitalGainRules";
import {
  computeAnnualAmortization,
  computeTotalAmortizableValue,
  type AmortizationInputs,
} from "@/lib/fiscal/amortization";

// Prélèvements sociaux : 17,2% sur les revenus fonciers (location nue) et sur
// TOUTES les plus-values immobilières des particuliers ; 18,6% sur les
// revenus BIC de location meublée (LMNP réel/micro, depuis la LFSS 2026) —
// un changement récent qui NE touche PAS la plus-value LMNP, restée à 17,2%.
const PS_LOCATION_NUE_PCT = 17.2;
const PS_LMNP_PCT = 18.6;
const PS_PLUS_VALUE_PCT = 17.2;
const IR_PLUS_VALUE_PCT = 19;
const MICRO_BIC_ABATEMENT_PCT = 50;
const DEFICIT_FONCIER_CAP = 10_700;
const IS_LOW_RATE_PCT = 15;
const IS_LOW_THRESHOLD = 42_500;
const IS_HIGH_RATE_PCT = 25;

export interface RentalTaxScenarioInputs {
  annualRent: number;
  /** Charges déductibles hors intérêts d'emprunt et hors amortissement. */
  annualDeductibleCharges: number;
  annualInterestPaid: number;
  acquisitionPrice: number;
  acquisitionDate: Date;
  estimatedSalePrice: number;
  tmiPct: number;
  amortization: AmortizationInputs;
}

export interface RegimeResult {
  regimeId: "lmnp-reel" | "lmnp-micro" | "sci-is" | "deficit-foncier";
  label: string;
  taxableResult: number;
  incomeTax: number;
  socialContributions: number;
  netIncomeAfterTax: number;
  nonImputableOrCarriedForward: number;
  capitalGainGross: number;
  capitalGainTax: number;
  netSaleProceeds: number;
}

function computeIS(taxableProfit: number): number {
  if (taxableProfit <= 0) return 0;
  const lowBracket = Math.min(taxableProfit, IS_LOW_THRESHOLD);
  const highBracket = Math.max(taxableProfit - IS_LOW_THRESHOLD, 0);
  return lowBracket * (IS_LOW_RATE_PCT / 100) + highBracket * (IS_HIGH_RATE_PCT / 100);
}

/** Plus-value des particuliers (location nue, micro-BIC, LMNP réel) : IR 19%
 * + PS 17,2% après abattement pour durée de détention, plus la surtaxe sur
 * les plus-values élevées (>50 000€, barème BOFiP). */
function computeIndividualCapitalGainTax(
  capitalGainGross: number,
  acquisitionDate: Date
): number {
  if (capitalGainGross <= 0) return 0;
  const years = fullYearsElapsed(acquisitionDate);
  const { irAbatementPct, psAbatementPct } = computeHoldingPeriodAbatement(years);

  const taxableGainIR = capitalGainGross * (1 - irAbatementPct / 100);
  const taxableGainPS = capitalGainGross * (1 - psAbatementPct / 100);

  const irTax = taxableGainIR * (IR_PLUS_VALUE_PCT / 100);
  const psTax = taxableGainPS * (PS_PLUS_VALUE_PCT / 100);
  const surtax = computeHighGainSurtax(taxableGainIR);

  return irTax + psTax + surtax;
}

export function computeLmnpReelResult(inputs: RentalTaxScenarioInputs): RegimeResult {
  const { annualRent, annualDeductibleCharges, annualInterestPaid } = inputs;
  const resultBeforeAmortization = annualRent - annualDeductibleCharges - annualInterestPaid;
  const annualAmortization = computeAnnualAmortization(inputs.amortization);

  let taxableResult: number;
  let incomeTax: number;
  let socialContributions: number;
  let nonImputableOrCarriedForward: number;

  if (resultBeforeAmortization < 0) {
    // Un déficit BIC non professionnel n'est jamais imputable, ni sur le
    // revenu global ni sur les revenus fonciers — seulement reportable 10
    // ans sur de futurs revenus BIC non pro.
    taxableResult = 0;
    incomeTax = 0;
    socialContributions = 0;
    nonImputableOrCarriedForward = -resultBeforeAmortization;
  } else {
    // L'amortissement ne peut ni créer ni aggraver un déficit : l'excédent
    // se reporte indéfiniment (non chiffré ici, simulation sur une année).
    const amortissementDeductible = Math.min(annualAmortization, resultBeforeAmortization);
    taxableResult = resultBeforeAmortization - amortissementDeductible;
    incomeTax = taxableResult * (inputs.tmiPct / 100);
    socialContributions = taxableResult * (PS_LMNP_PCT / 100);
    nonImputableOrCarriedForward = 0;
  }

  const netIncomeAfterTax = resultBeforeAmortization - incomeTax - socialContributions;

  const totalAmortizableValue = computeTotalAmortizableValue(inputs.amortization);
  const holdingYears = fullYearsElapsed(inputs.acquisitionDate);
  const cumulativeAmortization = Math.min(
    annualAmortization * holdingYears,
    totalAmortizableValue
  );
  // Réforme Le Meur (art. 84 LF 2025, depuis le 15/02/2025) : les
  // amortissements déduits réduisent le prix d'acquisition retenu pour la
  // plus-value — ne concerne que le régime réel, pas le micro-BIC.
  const capitalGainGross =
    inputs.estimatedSalePrice - (inputs.acquisitionPrice - cumulativeAmortization);
  const capitalGainTax = computeIndividualCapitalGainTax(
    capitalGainGross,
    inputs.acquisitionDate
  );

  return {
    regimeId: "lmnp-reel",
    label: "LMNP au réel",
    taxableResult,
    incomeTax,
    socialContributions,
    netIncomeAfterTax,
    nonImputableOrCarriedForward,
    capitalGainGross,
    capitalGainTax,
    netSaleProceeds: inputs.estimatedSalePrice - capitalGainTax,
  };
}

export function computeLmnpMicroResult(inputs: RentalTaxScenarioInputs): RegimeResult {
  const { annualRent, annualDeductibleCharges, annualInterestPaid } = inputs;
  const taxableResult = annualRent * (1 - MICRO_BIC_ABATEMENT_PCT / 100);
  const incomeTax = taxableResult * (inputs.tmiPct / 100);
  const socialContributions = taxableResult * (PS_LMNP_PCT / 100);

  const netCashBeforeTax = annualRent - annualDeductibleCharges - annualInterestPaid;
  const netIncomeAfterTax = netCashBeforeTax - incomeTax - socialContributions;

  // Micro-BIC est exclu de la réforme Le Meur (aucun amortissement suivi) :
  // pas de réintégration, plus-value calculée sur le prix d'acquisition brut.
  const capitalGainGross = inputs.estimatedSalePrice - inputs.acquisitionPrice;
  const capitalGainTax = computeIndividualCapitalGainTax(
    capitalGainGross,
    inputs.acquisitionDate
  );

  return {
    regimeId: "lmnp-micro",
    label: "LMNP micro-BIC",
    taxableResult,
    incomeTax,
    socialContributions,
    netIncomeAfterTax,
    nonImputableOrCarriedForward: 0,
    capitalGainGross,
    capitalGainTax,
    netSaleProceeds: inputs.estimatedSalePrice - capitalGainTax,
  };
}

export function computeSciIsResult(inputs: RentalTaxScenarioInputs): RegimeResult {
  const { annualRent, annualDeductibleCharges, annualInterestPaid } = inputs;
  const annualAmortization = computeAnnualAmortization(inputs.amortization);
  const resultBeforeTax =
    annualRent - annualDeductibleCharges - annualInterestPaid - annualAmortization;

  // Un déficit de SCI à l'IS se reporte indéfiniment sur les bénéfices
  // futurs de la SCI — aucune imputation possible ailleurs, aucun
  // plafonnement de l'amortissement contrairement au BIC non professionnel.
  const taxableResult = Math.max(resultBeforeTax, 0);
  const incomeTax = computeIS(taxableResult);
  const socialContributions = 0;

  const netCashBeforeTax = annualRent - annualDeductibleCharges - annualInterestPaid;
  const netIncomeAfterTax = netCashBeforeTax - incomeTax;

  const totalAmortizableValue = computeTotalAmortizableValue(inputs.amortization);
  const holdingYears = fullYearsElapsed(inputs.acquisitionDate);
  const cumulativeAmortization = Math.min(
    annualAmortization * holdingYears,
    totalAmortizableValue
  );
  // Valeur nette comptable = prix d'acquisition - amortissements cumulés,
  // taxée à l'IS, SANS abattement pour durée de détention (régime des
  // sociétés, pas des particuliers).
  const capitalGainGross =
    inputs.estimatedSalePrice - (inputs.acquisitionPrice - cumulativeAmortization);
  const capitalGainTax = computeIS(Math.max(capitalGainGross, 0));

  return {
    regimeId: "sci-is",
    label: "SCI à l'IS",
    taxableResult,
    incomeTax,
    socialContributions,
    netIncomeAfterTax,
    nonImputableOrCarriedForward: resultBeforeTax < 0 ? -resultBeforeTax : 0,
    capitalGainGross,
    capitalGainTax,
    netSaleProceeds: inputs.estimatedSalePrice - capitalGainTax,
  };
}

export function computeDeficitFoncierResult(inputs: RentalTaxScenarioInputs): RegimeResult {
  const { annualRent, annualDeductibleCharges, annualInterestPaid } = inputs;
  // Pas d'amortissement en location nue (régime des revenus fonciers).
  const resultBeforeTax = annualRent - annualDeductibleCharges - annualInterestPaid;

  let incomeTax: number;
  let socialContributions: number;
  let nonImputableOrCarriedForward: number;

  if (resultBeforeTax >= 0) {
    incomeTax = resultBeforeTax * (inputs.tmiPct / 100);
    socialContributions = resultBeforeTax * (PS_LOCATION_NUE_PCT / 100);
    nonImputableOrCarriedForward = 0;
  } else {
    const deficit = -resultBeforeTax;
    // Les revenus fonciers absorbent en priorité les intérêts d'emprunt :
    // la fraction du déficit qui en résulte n'est jamais imputable sur le
    // revenu global, seulement reportable sur les revenus fonciers des 10
    // années suivantes.
    const interestPortion = Math.min(annualInterestPaid, deficit);
    const otherChargesPortion = deficit - interestPortion;
    const imputableOnGlobalIncome = Math.min(otherChargesPortion, DEFICIT_FONCIER_CAP);
    const carriedForward = deficit - imputableOnGlobalIncome;

    incomeTax = -imputableOnGlobalIncome * (inputs.tmiPct / 100);
    socialContributions = 0;
    nonImputableOrCarriedForward = carriedForward;
  }

  const netIncomeAfterTax = resultBeforeTax - incomeTax - socialContributions;

  // Pas de réintégration (aucun amortissement suivi en location nue).
  const capitalGainGross = inputs.estimatedSalePrice - inputs.acquisitionPrice;
  const capitalGainTax = computeIndividualCapitalGainTax(
    capitalGainGross,
    inputs.acquisitionDate
  );

  return {
    regimeId: "deficit-foncier",
    label: "Location nue (déficit foncier)",
    taxableResult: resultBeforeTax,
    incomeTax,
    socialContributions,
    netIncomeAfterTax,
    nonImputableOrCarriedForward,
    capitalGainGross,
    capitalGainTax,
    netSaleProceeds: inputs.estimatedSalePrice - capitalGainTax,
  };
}

export function compareRentalTaxRegimes(inputs: RentalTaxScenarioInputs): RegimeResult[] {
  return [
    computeLmnpReelResult(inputs),
    computeLmnpMicroResult(inputs),
    computeSciIsResult(inputs),
    computeDeficitFoncierResult(inputs),
  ];
}
