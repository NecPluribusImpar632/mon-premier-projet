/**
 * Sensibilité prix immobilier / taux OAT 10 ans, calibrée par zone à partir de
 * données historiques françaises (indices Notaires-INSEE 1992+, taux OAT 10 ans
 * Banque de France 1986+, prix/m² Notaires du Grand Paris par arrondissement 1995+).
 *
 * Méthode : régression de la croissance des prix en glissement annuel sur la
 * variation annuelle du taux OAT, décalée de 0 à 8 trimestres ; le décalage retenu
 * est celui qui maximise le R². `coefficient` s'exprime en points de variation de
 * prix (%) par point de variation du taux OAT.
 *
 * Fiabilité statistique modeste partout (R² généralement entre 3 % et 20 %) : une
 * tendance historique indicative, pas une certitude. Aucune formule ici — ce
 * fichier n'est que de la donnée ; voir `resolveRealEstateSensitivity` pour la
 * logique de résolution.
 */

export interface ZoneSensitivity {
  zoneLabel: string;
  coefficient: number;
  lagQuarters: number;
  r2Pct: number;
  n: number;
}

export type RegionId = "auvergne-rhone-alpes" | "hauts-de-france" | "paca";

export const NATIONAL_SENSITIVITY: ZoneSensitivity = {
  zoneLabel: "France métropolitaine",
  coefficient: -2.05,
  lagQuarters: 8,
  r2Pct: 8.3,
  n: 117,
};

export const REGION_SENSITIVITY: Record<RegionId, ZoneSensitivity> = {
  "auvergne-rhone-alpes": {
    zoneLabel: "Auvergne-Rhône-Alpes",
    coefficient: -2.02,
    lagQuarters: 6,
    r2Pct: 21.2,
    n: 61,
  },
  "hauts-de-france": {
    zoneLabel: "Hauts-de-France",
    coefficient: -1.54,
    lagQuarters: 5,
    r2Pct: 14.9,
    n: 61,
  },
  paca: {
    zoneLabel: "Provence-Alpes-Côte d'Azur",
    coefficient: -1.42,
    lagQuarters: 6,
    r2Pct: 3.3,
    n: 122,
  },
};

// Seuls les 8 départements franciliens ont une série Notaires-INSEE dédiée — les
// autres départements retombent sur la région (si couverte) ou le national.
export const DEPARTMENT_SENSITIVITY: Record<string, ZoneSensitivity> = {
  "75": {
    zoneLabel: "Paris (75)",
    coefficient: -1.47,
    lagQuarters: 5,
    r2Pct: 2.8,
    n: 133,
  },
  "77": {
    zoneLabel: "Seine-et-Marne (77)",
    coefficient: -2.37,
    lagQuarters: 7,
    r2Pct: 9.1,
    n: 117,
  },
  "78": {
    zoneLabel: "Yvelines (78)",
    coefficient: -2.71,
    lagQuarters: 8,
    r2Pct: 13.9,
    n: 117,
  },
  "91": {
    zoneLabel: "Essonne (91)",
    coefficient: -2.31,
    lagQuarters: 6,
    r2Pct: 8.3,
    n: 117,
  },
  "92": {
    zoneLabel: "Hauts-de-Seine (92)",
    coefficient: -1.55,
    lagQuarters: 5,
    r2Pct: 4,
    n: 133,
  },
  "93": {
    zoneLabel: "Seine-Saint-Denis (93)",
    coefficient: -1.23,
    lagQuarters: 4,
    r2Pct: 2.5,
    n: 133,
  },
  "94": {
    zoneLabel: "Val-de-Marne (94)",
    coefficient: -1.59,
    lagQuarters: 4,
    r2Pct: 4.5,
    n: 133,
  },
  "95": {
    zoneLabel: "Val-d'Oise (95)",
    coefficient: -2.23,
    lagQuarters: 8,
    r2Pct: 8,
    n: 117,
  },
};

// Prix/m² Notaires du Grand Paris par arrondissement (1995+). Le 8e arrondissement
// ressort avec un coefficient positif contre-intuitif (échantillon étroit, marché de
// luxe atypique) — conservé tel quel plutôt que corrigé à la main, cohérent avec le
// principe de transparence : un R² de 4,2% signale déjà une fiabilité très limitée.
export const PARIS_ARRONDISSEMENT_SENSITIVITY: Record<number, ZoneSensitivity> = {
  1: { zoneLabel: "Paris 1er", coefficient: -2.61, lagQuarters: 5, r2Pct: 3.8, n: 110 },
  2: { zoneLabel: "Paris 2e", coefficient: -2.77, lagQuarters: 8, r2Pct: 7.5, n: 114 },
  3: { zoneLabel: "Paris 3e", coefficient: -3.2, lagQuarters: 6, r2Pct: 8.6, n: 112 },
  4: { zoneLabel: "Paris 4e", coefficient: -2.59, lagQuarters: 8, r2Pct: 8.5, n: 114 },
  5: { zoneLabel: "Paris 5e", coefficient: -2.85, lagQuarters: 8, r2Pct: 11.7, n: 110 },
  6: { zoneLabel: "Paris 6e", coefficient: -3.21, lagQuarters: 8, r2Pct: 13.4, n: 114 },
  7: { zoneLabel: "Paris 7e", coefficient: -3.56, lagQuarters: 7, r2Pct: 15.4, n: 114 },
  8: { zoneLabel: "Paris 8e", coefficient: 2.27, lagQuarters: 0, r2Pct: 4.2, n: 110 },
  9: { zoneLabel: "Paris 9e", coefficient: -3.45, lagQuarters: 8, r2Pct: 13.2, n: 115 },
  10: { zoneLabel: "Paris 10e", coefficient: -3.47, lagQuarters: 8, r2Pct: 12.8, n: 116 },
  11: { zoneLabel: "Paris 11e", coefficient: -3.17, lagQuarters: 8, r2Pct: 12, n: 116 },
  12: { zoneLabel: "Paris 12e", coefficient: -3.04, lagQuarters: 8, r2Pct: 11.5, n: 116 },
  13: { zoneLabel: "Paris 13e", coefficient: -2.28, lagQuarters: 8, r2Pct: 6.7, n: 116 },
  14: { zoneLabel: "Paris 14e", coefficient: -2.5, lagQuarters: 6, r2Pct: 7.7, n: 116 },
  15: { zoneLabel: "Paris 15e", coefficient: -2.86, lagQuarters: 7, r2Pct: 10.5, n: 116 },
  16: { zoneLabel: "Paris 16e", coefficient: -2.86, lagQuarters: 8, r2Pct: 11.7, n: 114 },
  17: { zoneLabel: "Paris 17e", coefficient: -3.25, lagQuarters: 8, r2Pct: 12.5, n: 116 },
  18: { zoneLabel: "Paris 18e", coefficient: -3.14, lagQuarters: 8, r2Pct: 10, n: 116 },
  19: { zoneLabel: "Paris 19e", coefficient: -2.96, lagQuarters: 8, r2Pct: 8.8, n: 116 },
  20: { zoneLabel: "Paris 20e", coefficient: -2.75, lagQuarters: 4, r2Pct: 6.9, n: 116 },
};

/**
 * Hiérarchie de repli : arrondissement parisien → département (si un des 8
 * franciliens couverts) → région (si dans une des 3 régions couvertes) → national.
 * Les données Notaires-INSEE ne couvrent pas les 96 départements individuellement ;
 * en dehors de l'Île-de-France, seules 3 régions ont une série dédiée.
 */
export function resolveRealEstateSensitivity(
  department: string | null | undefined,
  arrondissement: number | null | undefined,
  departmentToRegion: Record<string, RegionId>
): ZoneSensitivity {
  if (department === "75" && arrondissement && PARIS_ARRONDISSEMENT_SENSITIVITY[arrondissement]) {
    return PARIS_ARRONDISSEMENT_SENSITIVITY[arrondissement];
  }
  if (department && DEPARTMENT_SENSITIVITY[department]) {
    return DEPARTMENT_SENSITIVITY[department];
  }
  if (department) {
    const region = departmentToRegion[department];
    if (region) {
      return REGION_SENSITIVITY[region];
    }
  }
  return NATIONAL_SENSITIVITY;
}
