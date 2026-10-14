import { isMaritalStatus } from "@/lib/client/maritalStatus";

/**
 * Impôt sur le revenu simplifié pour les flux de l'objectif patrimonial :
 * barème progressif par tranches, parts fiscales du foyer, plafonnement du
 * quotient familial. Volontairement hors champ : décote, contribution
 * exceptionnelle sur les hauts revenus, demi-part de parent isolé,
 * rattachement des enfants majeurs, réductions et crédits d'impôt.
 */

export interface IncomeTaxBracket {
  /** Borne supérieure de la tranche, pour une part. */
  upTo: number;
  ratePct: number;
}

export interface IncomeTaxScale {
  /** Millésime, pour l'affichage et la page Méthodologie. */
  label: string;
  source: string;
  brackets: IncomeTaxBracket[];
  /** Plafond de l'avantage procuré par chaque demi-part supplémentaire. */
  halfPartCeiling: number;
  /** Déduction forfaitaire pour frais professionnels sur les salaires. */
  salaryAbatementPct: number;
  salaryAbatementMin: number;
  salaryAbatementMax: number;
}

/** Barème 2025 (revenus de 2024), loi de finances pour 2025, art. 197 CGI.
 * Les seuils sont indexés sur l'inflation du scénario dans la simulation,
 * de sorte que l'impôt reste constant en euros constants. */
export const INCOME_TAX_SCALE_2025: IncomeTaxScale = {
  label: "Barème 2025 (revenus 2024)",
  source: "Loi de finances pour 2025, art. 197 du CGI",
  brackets: [
    { upTo: 11_497, ratePct: 0 },
    { upTo: 29_315, ratePct: 11 },
    { upTo: 83_823, ratePct: 30 },
    { upTo: 180_294, ratePct: 41 },
    { upTo: Infinity, ratePct: 45 },
  ],
  halfPartCeiling: 1_791,
  salaryAbatementPct: 10,
  salaryAbatementMin: 504,
  salaryAbatementMax: 14_426,
};

/** Loyers : régime micro-foncier appliqué quel que soit le montant (abattement
 * forfaitaire de 30 %, le reste entre dans le barème) et prélèvements sociaux
 * sur la même base. */
export const MICRO_FONCIER_ABATEMENT_PCT = 30;
export const RENTAL_SOCIAL_CONTRIBUTIONS_PCT = 17.2;

/**
 * Parts du foyer pour l'IR : 1 part (2 pour un couple marié ou pacsé, le
 * concubinage formant deux foyers distincts, contrairement à l'IFI), plus
 * 0,5 part pour chacun des deux premiers enfants mineurs et 1 part par enfant
 * à partir du troisième. Les enfants majeurs ne sont pas comptés.
 */
export function fiscalPartsFromFoyer(
  maritalStatus: string | null,
  minorChildrenCount: number | null
): number {
  const isCouple =
    maritalStatus !== null &&
    isMaritalStatus(maritalStatus) &&
    (maritalStatus === "marie" || maritalStatus === "pacse");
  const base = isCouple ? 2 : 1;
  const children = Math.max(minorChildrenCount ?? 0, 0);
  const childrenParts = Math.min(children, 2) * 0.5 + Math.max(children - 2, 0);
  return base + childrenParts;
}

export function baseFiscalParts(parts: number): number {
  return parts >= 2 ? 2 : 1;
}

/** Salaire net imposable : net perçu moins la déduction forfaitaire de 10 %,
 * encadrée par son plancher et son plafond, eux aussi indexés. */
export function taxableSalary(netSalary: number, scale: IncomeTaxScale, indexFactor = 1): number {
  if (netSalary <= 0) return 0;
  const abatement = Math.min(
    Math.max(netSalary * (scale.salaryAbatementPct / 100), scale.salaryAbatementMin * indexFactor),
    scale.salaryAbatementMax * indexFactor
  );
  return Math.max(netSalary - abatement, 0);
}

function taxForParts(taxableIncome: number, parts: number, scale: IncomeTaxScale, indexFactor: number): number {
  const perPart = taxableIncome / parts;
  let tax = 0;
  let lower = 0;
  for (const bracket of scale.brackets) {
    const upper = bracket.upTo * indexFactor;
    if (perPart <= lower) break;
    const slice = Math.min(perPart, upper) - lower;
    tax += slice * (bracket.ratePct / 100);
    lower = upper;
  }
  return tax * parts;
}

/**
 * Impôt brut du foyer sur un revenu net imposable, avec plafonnement du
 * quotient familial : l'avantage des demi-parts au-delà de la base (1 ou 2
 * parts) ne peut dépasser le plafond par demi-part.
 */
export function computeIncomeTax(
  taxableIncome: number,
  parts: number,
  scale: IncomeTaxScale = INCOME_TAX_SCALE_2025,
  indexFactor = 1
): number {
  if (taxableIncome <= 0) return 0;
  const safeParts = Math.max(parts, 1);
  const withParts = taxForParts(taxableIncome, safeParts, scale, indexFactor);
  const base = baseFiscalParts(safeParts);
  if (safeParts <= base) return withParts;
  const extraHalfParts = (safeParts - base) * 2;
  const withBaseParts = taxForParts(taxableIncome, base, scale, indexFactor);
  const cappedAdvantage = extraHalfParts * scale.halfPartCeiling * indexFactor;
  return Math.max(withParts, withBaseParts - cappedAdvantage);
}
