/**
 * Sensibilité prix immobilier / taux OAT 10 ans, calibrée par zonage A bis / A /
 * B1 / B2 / C à partir des indices Notaires-INSEE par zone et du taux OAT 10 ans
 * Banque de France.
 *
 * Méthode : régression de la croissance des prix en glissement annuel sur la
 * variation annuelle du taux OAT, décalée de 0 à 8 trimestres ; le décalage retenu
 * est celui qui maximise le R². `coefficient` s'exprime en points de variation de
 * prix (%) par point de variation du taux OAT.
 *
 * Les niveaux arrondissement parisien, département et région ont été retirés : leurs
 * R² (3 % à 15 %) ne portaient pas le poids d'une décision, et Paris 8e ressortait
 * avec un coefficient positif. Le zonage réglementaire agrège des marchés plus
 * homogènes (R² de 23 % à 46 %) et couvre 100 % du territoire. Fiabilité modérée :
 * une tendance historique indicative, pas une certitude. Aucune formule ici — ce
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

// Repli quand la commune n'est pas connue (bien saisi avant l'arrivée du champ
// commune, ou code commune absent du référentiel).
export const NATIONAL_SENSITIVITY: ZoneSensitivity = {
  zoneLabel: "France métropolitaine",
  coefficient: -2.05,
  lagQuarters: 8,
  r2Pct: 8.3,
  n: 117,
};

// Indices Notaires-INSEE par zonage A bis/A/B1/B2/C (le zonage réglementaire du
// logement, https://www.data.gouv.fr/datasets/liste-des-communes-selon-le-zonage-abc) —
// classe chaque commune de France par tension immobilière, indépendamment de la
// région administrative. Paris est une seule commune, entièrement en zone A bis.
export type ZonageAbc = "Abis" | "A" | "B1" | "B2" | "C";

export const ZONE_ABC_SENSITIVITY: Record<ZonageAbc, ZoneSensitivity> = {
  Abis: { zoneLabel: "Zone A bis", coefficient: -3.38, lagQuarters: 5, r2Pct: 45.7, n: 45 },
  A: { zoneLabel: "Zone A", coefficient: -2.24, lagQuarters: 6, r2Pct: 34.5, n: 45 },
  B1: { zoneLabel: "Zone B1", coefficient: -2.77, lagQuarters: 6, r2Pct: 38.1, n: 45 },
  B2: { zoneLabel: "Zone B2", coefficient: -2.17, lagQuarters: 6, r2Pct: 23, n: 45 },
  C: { zoneLabel: "Zone C", coefficient: -2.01, lagQuarters: 6, r2Pct: 23.1, n: 45 },
};

/**
 * Zonage A bis/A/B1/B2/C de la commune → national en repli. `communeZone` doit
 * être résolu par l'appelant (voir `resolvePropertySensitivity`, qui a accès à
 * la table commune → zone) ; ce fichier ne contient que des données.
 */
export function resolveRealEstateSensitivity(
  communeZone: ZonageAbc | null | undefined
): ZoneSensitivity {
  if (communeZone && ZONE_ABC_SENSITIVITY[communeZone]) {
    return ZONE_ABC_SENSITIVITY[communeZone];
  }
  return NATIONAL_SENSITIVITY;
}
