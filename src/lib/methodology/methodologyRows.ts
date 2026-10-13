/**
 * Data behind the "Méthodologie" page/tab. One entry per asset class that
 * has an actual calibrated *scenario shock* (not the rules-based tax
 * calculators like IFI or the rental tax comparator — those are
 * deterministic applications of the CGI, not statistical estimates, so
 * they don't belong on a fiability dashboard).
 *
 * "calibrated" rows carry a real R² (or a [min, max] range across
 * sub-cases, like real estate zones) and are rendered through
 * reliabilityTierForR2 at display time — never a hardcoded tier label here
 * — so this page can never drift from the actual threshold logic in
 * statisticalReliability.ts.
 *
 * To add a newly-calibrated poste later: add one row here. No page
 * restructuring needed.
 */

interface MethodologyRowBase {
  id: string;
  label: string;
  description: string;
  sourceReference: string;
}

interface CalibratedRow extends MethodologyRowBase {
  status: "calibrated";
  /** A single R² or a [min, max] range when it varies by sub-case (e.g.
   * real estate zones) — both ends run through reliabilityTierForR2. */
  r2Pct: number | [number, number];
}

interface DescriptiveRow extends MethodologyRowBase {
  status: "historical" | "assumption";
  statusLabel: string;
}

export type MethodologyRow = CalibratedRow | DescriptiveRow;

export const METHODOLOGY_ROWS: MethodologyRow[] = [
  {
    id: "immobilier",
    label: "Immobilier (prix par zone)",
    status: "calibrated",
    r2Pct: [2.5, 45.7],
    description:
      "La sensibilité prix/taux est régressée séparément pour chaque zone (national, région, département, arrondissement parisien, zonage A/B/C) — le chiffre qui s'applique dépend des biens réellement détenus par le client.",
    sourceReference: "Onglet Scénarios → carte « Choc immobilier »",
  },
  {
    id: "or-argent",
    label: "Or / Argent",
    status: "calibrated",
    r2Pct: [13.0, 18.8],
    description:
      "Tendance de fond régressée sur l'inflation américaine (1972+) — or R²=19 %, argent R²=13 %.",
    sourceReference: "Onglet Scénarios → carte « Choc or/argent »",
  },
  {
    id: "actions",
    label: "Actions (choc par indice)",
    status: "historical",
    statusLabel: "Référence historique documentée",
    description:
      "Les scénarios 2008 / choc pétrolier / remontée des taux reprennent la performance annuelle réelle de chaque indice détenu (MSCI World, CAC 40, Nasdaq...) sur une année de référence — l'historique réel sert directement de repère, ce n'est pas une régression.",
    sourceReference: "Onglet Scénarios → carte « Choc actions »",
  },
  {
    id: "scpi",
    label: "SCPI",
    status: "historical",
    statusLabel: "Référence historique isolée",
    description:
      "Une régression testée sur 13 trimestres n'était pas statistiquement significative (R²=25 %) — la décote affichée vient d'un seul épisode réel documenté (2023), pas d'un calcul répété.",
    sourceReference: "Onglet Scénarios → carte « Choc SCPI »",
  },
  {
    id: "obligations",
    label: "Obligations (duration)",
    status: "assumption",
    statusLabel: "Hypothèse simple documentée",
    description:
      "Approximation de duration modifiée avec une durée par défaut de 6 ans — un point de départ ajustable, pas une valeur mesurée sur les titres réellement détenus.",
    sourceReference: "Onglet Scénarios → carte « Choc obligataire »",
  },
  {
    id: "private-equity",
    label: "Private Equity (décote d'illiquidité)",
    status: "assumption",
    statusLabel: "Hypothèse simple documentée",
    description:
      "20 % de décote par défaut, dans la fourchette usuelle (10 à 40 % selon les conditions de marché) — un ordre de grandeur ajustable, pas une mesure.",
    sourceReference: "Onglet Scénarios → carte « Décote d'illiquidité Private Equity »",
  },
  {
    id: "actions-monte-carlo",
    label: "Actions (distribution Monte Carlo)",
    status: "historical",
    statusLabel: "Distribution calibrée (n=39 à 66 selon l'indice)",
    description:
      "Différent du choc par indice ci-dessus : ici, moyenne et volatilité de rendement réel annuel calculées sur la série historique complète de chaque indice détenu (1960-2025 selon la série disponible), converties en euros, pour tirer des trajectoires aléatoires plutôt qu'un seul choc ponctuel. MSCI Emerging Markets n'a pas de série fiable trouvée et reste une hypothèse simple.",
    sourceReference: "Onglet Objectif patrimonial",
  },
  {
    id: "immobilier-monte-carlo",
    label: "Immobilier (distribution Monte Carlo)",
    status: "historical",
    statusLabel: "Distribution calibrée (n=51, 1970-2020)",
    description:
      "Différent de la sensibilité prix/taux par zone ci-dessus : ici, une seule distribution nationale de rendement réel (moyenne et volatilité), calculée sur les séries longues Friggit/IGEDD déflatées, s'applique à tous les biens du client quelle que soit leur zone.",
    sourceReference: "Onglet Objectif patrimonial",
  },
  {
    id: "rendements-fixes-objectif",
    label: "Rendements fixes de l'objectif patrimonial",
    status: "assumption",
    statusLabel: "Hypothèses simples documentées",
    description:
      "Les postes sans série historique fiable reçoivent un rendement réel annuel fixe, sans volatilité modélisée : Obligations 1,5 %, SCPI 4 %, Private Equity 6,5 % (nominal, avec la décote d'illiquidité du stress test), Liquidités et Matières premières 0 %. Des ordres de grandeur consensuels de long terme, pas des mesures. Entreprise/outil professionnel et Autres ne sont pas projetés du tout.",
    sourceReference: "Onglet Objectif patrimonial → tableau « Détail par poste »",
  },
];
