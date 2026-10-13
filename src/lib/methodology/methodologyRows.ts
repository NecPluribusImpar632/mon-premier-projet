/**
 * Data behind the "Méthodologie" page: one row per calibrated or assumed
 * parameter, grouped by asset class in the synthesis table at the top of the
 * page. Rows carrying an R² go through reliabilityTierForR2 at display time,
 * never a hardcoded tier label, so the page cannot drift from
 * statisticalReliability.ts. To document a new parameter, add a row here;
 * rows sharing a `group` are rendered under one title line, in this order.
 */

export type MethodologyConfidence =
  /** A regression with a measured R² (single value or a [min, max] range
   * across sub-cases, e.g. real estate zones). */
  | { kind: "r2"; r2Pct: number | [number, number] }
  /** A real historical distribution (mean and volatility), sized by its
   * sample. */
  | { kind: "distribution"; years: string }
  /** Real past data used directly as a reference, not a fitted model. */
  | { kind: "historical" }
  /** A fixed figure, chosen as an order of magnitude, with no variance. */
  | { kind: "assumption" };

export interface MethodologyRow {
  id: string;
  /** Asset class, the table's title line. */
  group: string;
  /** What this line calibrates within the class. */
  variant: string;
  /** Which feature consumes the figure. */
  usage: "Stress test" | "Objectif patrimonial" | "Stress test et objectif";
  source: string;
  period: string;
  retained: string;
  confidence: MethodologyConfidence;
}

export const METHODOLOGY_ROWS: MethodologyRow[] = [
  {
    id: "actions-distribution",
    group: "Actions",
    variant: "Rendement par indice",
    usage: "Objectif patrimonial",
    source:
      "Séries annuelles publiques : MSCI World, Dow Jones, Nasdaq Composite, Nikkei 225, CAC 40, EURO STOXX 50. Conversion en euros, déflation par l'inflation française.",
    period: "1960 à 2025 selon l'indice",
    retained: "Rendement réel moyen de 4,2 % à 11,0 % par an et volatilité de 17 % à 26 % selon l'indice",
    confidence: { kind: "distribution", years: "39 à 66 ans" },
  },
  {
    id: "actions-shocks",
    group: "Actions",
    variant: "Choc par indice",
    usage: "Stress test",
    source: "Performance annuelle publiée de chaque indice (MSCI, STOXX, Nasdaq, Nikkei, Euronext)",
    period: "Années 2008, 2018 et 2022",
    retained: "Baisse réelle de l'indice sur l'année de référence, pondérée par la répartition du client",
    confidence: { kind: "historical" },
  },
  {
    id: "actions-em",
    group: "Actions",
    variant: "MSCI Emerging Markets",
    usage: "Objectif patrimonial",
    source: "Aucune série annuelle longue fiable en accès public",
    period: "Sans objet",
    retained: "5 % réel par an, sans volatilité",
    confidence: { kind: "assumption" },
  },
  {
    id: "immobilier-sensibilite",
    group: "Immobilier",
    variant: "Sensibilité prix / taux par zone",
    usage: "Stress test",
    source: "Indices Notaires-INSEE par zone, taux OAT 10 ans Banque de France, prix par arrondissement Notaires du Grand Paris",
    period: "1992 à 2025, trimestriel",
    retained: "Coefficient de 1,2 à 3,6 points de prix par point de taux selon la zone, avec un décalage de 4 à 8 trimestres",
    confidence: { kind: "r2", r2Pct: [2.5, 45.7] },
  },
  {
    id: "immobilier-distribution",
    group: "Immobilier",
    variant: "Rendement national",
    usage: "Objectif patrimonial",
    source: "Séries longues IGEDD (Friggit), indice national des prix des logements, déflaté par l'inflation française",
    period: "1970 à 2020, annuel",
    retained: "Rendement réel moyen de 2,0 % par an, volatilité de 4,7 %, pour tous les biens quelle que soit la zone",
    confidence: { kind: "distribution", years: "51 ans" },
  },
  {
    id: "or-argent",
    group: "Or et argent",
    variant: "Sensibilité à l'inflation",
    usage: "Stress test",
    source: "Prix mensuels Banque mondiale (Pink Sheet), inflation américaine, taux de change USD/EUR",
    period: "1972 à 2025, annuel",
    retained: "3,5 points (or) et 3,8 points (argent) de hausse par point d'inflation américaine ; volatilité en euros de 13 % et 22 %",
    confidence: { kind: "r2", r2Pct: [13.0, 18.8] },
  },
  {
    id: "scpi",
    group: "SCPI",
    variant: "Choc de prix et rendement",
    usage: "Stress test et objectif",
    source: "Ramify SCPI Index pour le choc ; aucune série longue pour le rendement",
    period: "13 trimestres, 2023 à 2026",
    retained: "Décote de l'épisode 2023 comme référence de choc ; rendement fixe de 4 % réel par an",
    confidence: { kind: "historical" },
  },
  {
    id: "obligations",
    group: "Obligations",
    variant: "Choc de taux et rendement",
    usage: "Stress test et objectif",
    source: "Approximation de duration modifiée ; aucune série de rendement calibrée",
    period: "Sans objet",
    retained: "Durée par défaut de 6 ans pour le choc de taux ; rendement fixe de 1,5 % réel par an",
    confidence: { kind: "assumption" },
  },
  {
    id: "private-equity",
    group: "Private Equity",
    variant: "Décote d'illiquidité et rendement",
    usage: "Stress test et objectif",
    source: "Fourchette usuelle des décotes de marché secondaire (10 à 40 %)",
    period: "Sans objet",
    retained: "Décote d'illiquidité de 20 % par défaut ; rendement fixe de 4,5 % réel par an",
    confidence: { kind: "assumption" },
  },
  {
    id: "liquidites-matieres",
    group: "Liquidités et matières premières",
    variant: "Rendement",
    usage: "Objectif patrimonial",
    source: "Convention",
    period: "Sans objet",
    retained: "0 % réel par an, sans volatilité",
    confidence: { kind: "assumption" },
  },
  {
    id: "non-projetes",
    group: "Entreprise et autres actifs",
    variant: "Valeur",
    usage: "Objectif patrimonial",
    source: "Aucune",
    period: "Sans objet",
    retained: "Valeur maintenue constante, non projetée",
    confidence: { kind: "assumption" },
  },
];

/** Rows grouped by asset class, in first-appearance order. */
export function methodologyRowsByGroup(): { group: string; rows: MethodologyRow[] }[] {
  const groups: { group: string; rows: MethodologyRow[] }[] = [];
  for (const row of METHODOLOGY_ROWS) {
    const existing = groups.find((g) => g.group === row.group);
    if (existing) existing.rows.push(row);
    else groups.push({ group: row.group, rows: [row] });
  }
  return groups;
}
