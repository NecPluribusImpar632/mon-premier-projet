import { totalRemainingDebt, type PropertyWithLoans } from "@/lib/property/loanCalculations";

// Seuil d'imposition (art. 964 CGI) — en-deçà, l'IFI n'est pas dû, quel que soit le
// barème par tranches appliqué au-delà.
const IFI_THRESHOLD = 1_300_000;

// Barème progressif par tranches (art. 977 CGI), appliqué au patrimoine net taxable
// une fois le seuil de 1 300 000 € franchi.
const IFI_BRACKETS: { threshold: number; ratePct: number }[] = [
  { threshold: 0, ratePct: 0 },
  { threshold: 800_000, ratePct: 0.5 },
  { threshold: 1_300_000, ratePct: 0.7 },
  { threshold: 2_570_000, ratePct: 1 },
  { threshold: 5_000_000, ratePct: 1.25 },
  { threshold: 10_000_000, ratePct: 1.5 },
];

// Abattement sur la résidence principale (art. 973 CGI).
const PRIMARY_RESIDENCE_ABATEMENT_PCT = 30;

// Plafonnement de la déduction des dettes (art. 973 II CGI) : au-delà de 5 M€ de
// patrimoine taxable brut, la fraction de dette dépassant 60 % de ce patrimoine
// n'est déductible qu'à 50 %.
const DEBT_CAP_GROSS_BASE_THRESHOLD = 5_000_000;
const DEBT_CAP_RATIO_PCT = 60;
const DEBT_CAP_EXCESS_DEDUCTIBLE_PCT = 50;

// Décote (lissage de l'effet de seuil) entre 1,3 M€ et 1,4 M€ de patrimoine net
// taxable : decote = 17 500 − 1,25 % × patrimoine, soustraite de l'impôt brut.
const DECOTE_UPPER_BOUND = 1_400_000;
const DECOTE_BASE = 17_500;
const DECOTE_RATE_PCT = 1.25;

export interface IfiBracketResult {
  threshold: number;
  ratePct: number;
  amountInBracket: number;
  taxForBracket: number;
}

export interface IfiResult {
  hasDetailedProperties: boolean;
  grossBase: number;
  primaryResidenceAbatementAmount: number;
  rawDebt: number;
  deductibleDebt: number;
  debtCapApplied: boolean;
  netTaxableWealth: number;
  isTaxable: boolean;
  brackets: IfiBracketResult[];
  grossTax: number;
  decote: number;
  finalTax: number;
}

/**
 * Calcule l'IFI estimé à partir des données déjà saisies dans l'outil : biens
 * détaillés (valeur, résidence principale, prêts) si au moins un existe, sinon le
 * montant Immobilier manuel sans abattement ni déduction de dette (aucune donnée de
 * prêt n'existe dans ce cas). Les parts de SCPI sont incluses à leur montant déclaré.
 *
 * Hors périmètre (non modélisé) : démembrement, biens professionnels exonérés,
 * détention via une société autre qu'une SCPI, plafonnement IFI + IR à 75 % des
 * revenus (art. 979 CGI).
 */
export function computeIfi(
  properties: PropertyWithLoans[],
  manualImmobilierAmount: number,
  scpiAmount: number
): IfiResult {
  const hasDetailedProperties = properties.length > 0;

  let realEstateBase = manualImmobilierAmount;
  let primaryResidenceAbatementAmount = 0;
  let rawDebt = 0;

  if (hasDetailedProperties) {
    realEstateBase = 0;
    for (const property of properties) {
      if (property.isPrimaryResidence) {
        const abatement = property.currentValue * (PRIMARY_RESIDENCE_ABATEMENT_PCT / 100);
        primaryResidenceAbatementAmount += abatement;
        realEstateBase += property.currentValue - abatement;
      } else {
        realEstateBase += property.currentValue;
      }
    }
    rawDebt = properties.reduce((sum, property) => sum + totalRemainingDebt(property), 0);
  }

  const grossBase = realEstateBase + scpiAmount;

  let deductibleDebt = rawDebt;
  let debtCapApplied = false;
  const debtCapRatio = DEBT_CAP_RATIO_PCT / 100;
  if (grossBase > DEBT_CAP_GROSS_BASE_THRESHOLD && rawDebt > debtCapRatio * grossBase) {
    const cappedPortion = debtCapRatio * grossBase;
    deductibleDebt =
      cappedPortion + (rawDebt - cappedPortion) * (DEBT_CAP_EXCESS_DEDUCTIBLE_PCT / 100);
    debtCapApplied = true;
  }

  const netTaxableWealth = Math.max(0, grossBase - deductibleDebt);

  if (netTaxableWealth < IFI_THRESHOLD) {
    return {
      hasDetailedProperties,
      grossBase,
      primaryResidenceAbatementAmount,
      rawDebt,
      deductibleDebt,
      debtCapApplied,
      netTaxableWealth,
      isTaxable: false,
      brackets: [],
      grossTax: 0,
      decote: 0,
      finalTax: 0,
    };
  }

  const brackets: IfiBracketResult[] = [];
  let grossTax = 0;
  for (let i = 0; i < IFI_BRACKETS.length; i++) {
    const { threshold, ratePct } = IFI_BRACKETS[i];
    if (netTaxableWealth <= threshold) break;
    const nextThreshold = IFI_BRACKETS[i + 1]?.threshold ?? Infinity;
    const amountInBracket = Math.min(netTaxableWealth, nextThreshold) - threshold;
    const taxForBracket = amountInBracket * (ratePct / 100);
    brackets.push({ threshold, ratePct, amountInBracket, taxForBracket });
    grossTax += taxForBracket;
  }

  const decote =
    netTaxableWealth < DECOTE_UPPER_BOUND
      ? Math.max(0, DECOTE_BASE - (DECOTE_RATE_PCT / 100) * netTaxableWealth)
      : 0;
  const finalTax = Math.max(0, grossTax - decote);

  return {
    hasDetailedProperties,
    grossBase,
    primaryResidenceAbatementAmount,
    rawDebt,
    deductibleDebt,
    debtCapApplied,
    netTaxableWealth,
    isTaxable: true,
    brackets,
    grossTax,
    decote,
    finalTax,
  };
}
