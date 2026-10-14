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
    id: "scenario-2008",
    group: "Scénarios de crise",
    variant: "Crise 2008",
    usage: "Stress test",
    source: "Données de marché de l'année de référence : indices actions, Notaires-INSEE, indices obligataires d'État, prix de parts SCPI, taux OAT 10 ans",
    period: "2008 à 2009",
    retained: "Actions −40 % (pondéré par indice) ; immobilier −8 % ; obligations +8 % ; SCPI −3 % ; taux OAT −2 pts (pic à creux) ; inflation 0 %",
    confidence: { kind: "historical" },
  },
  {
    id: "scenario-2022",
    group: "Scénarios de crise",
    variant: "Inflation et remontée brutale des taux (2022)",
    usage: "Stress test",
    source: "Données de marché de l'année de référence",
    period: "2022",
    retained: "Actions −15 % (pondéré par indice) ; taux OAT +3 pts ; immobilier dérivé du taux par zone ; obligations dérivées de la duration ; SCPI −12 % ; inflation 6 %",
    confidence: { kind: "historical" },
  },
  {
    id: "scenario-2018",
    group: "Scénarios de crise",
    variant: "Remontée des taux (2018)",
    usage: "Stress test",
    source: "Données de marché de l'année de référence",
    period: "2018",
    retained: "Actions −10 % (pondéré par indice) ; taux OAT +1 pt ; immobilier dérivé du taux par zone ; obligations dérivées de la duration ; inflation 2 %",
    confidence: { kind: "historical" },
  },
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
    source: "Indices Notaires-INSEE par zonage A bis / A / B1 / B2 / C, taux OAT 10 ans Banque de France ; repli national hors commune connue",
    period: "45 trimestres par zone",
    retained: "Coefficient de 2,0 à 3,4 points de prix par point de taux selon la zone, avec un décalage de 5 à 6 trimestres ; Paris entier en zone A bis",
    confidence: { kind: "r2", r2Pct: [23.0, 45.7] },
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
    retained: "Décote de l'épisode 2023 comme référence de choc ; rendement réel de 2,5 % par an net de frais de gestion, volatilité de 6 %, choisis comme ordres de grandeur",
    confidence: { kind: "assumption" },
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
    retained: "Décote d'illiquidité de 20 % par défaut dans le stress test ; rendement fixe de 4,5 % réel par an, valeur comptée à 100 % dans l'objectif patrimonial",
    confidence: { kind: "assumption" },
  },
  {
    id: "frais-annuels",
    group: "Frais annuels",
    variant: "Frais par poste",
    usage: "Objectif patrimonial",
    source: "Ordres de grandeur usuels (gestion, dépôt, frais de fonds), modifiables par client",
    period: "Sans objet",
    retained: "Actions 1,5 % ; obligations 1 % ; Private Equity 2 % ; SCPI 0 % (rendement déjà net) ; immobilier 0 %. Soustraits du rendement nominal chaque année",
    confidence: { kind: "assumption" },
  },
  {
    id: "flux-revenus",
    group: "Flux de revenus et dépenses",
    variant: "Revenus, loyers, dépenses, mensualités",
    usage: "Objectif patrimonial",
    source: "Saisie du conseiller ; loyers et prêts des biens saisis",
    period: "Sans objet",
    retained:
      "Revenus, loyers et dépenses constants en euros constants jusqu'à l'échéance (indexés sur l'inflation retenue) ; mensualités nominales jusqu'au terme de chaque prêt ; solde négatif prélevé sur les liquidités puis sur les autres postes financiers",
    confidence: { kind: "assumption" },
  },
  {
    id: "flux-impot",
    group: "Flux de revenus et dépenses",
    variant: "Impôt sur le revenu",
    usage: "Objectif patrimonial",
    source: "Barème 2025 (revenus 2024), loi de finances pour 2025, art. 197 CGI ; abattement de 10 % sur les salaires ; micro-foncier et prélèvements sociaux de 17,2 % sur les loyers",
    period: "Millésime 2025, tranches indexées sur l'inflation retenue",
    retained:
      "Barème progressif par tranches, parts du foyer (couple marié ou pacsé, enfants mineurs), plafonnement du quotient familial ; revenus étrangers hors barème ; pas de décote, de contribution sur les hauts revenus ni de convention fiscale",
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
