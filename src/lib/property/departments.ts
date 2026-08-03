import type { RegionId } from "@/lib/scenarios/realEstateSensitivity";

export interface Department {
  code: string;
  name: string;
}

// Référentiel officiel des départements français (métropole + DOM), pour le
// sélecteur de localisation d'un bien. Utilisé uniquement pour l'affichage et la
// validation — la sensibilité prix/taux se résout séparément, voir
// `resolveRealEstateSensitivity`.
export const DEPARTMENTS: Department[] = [
  { code: "01", name: "Ain" },
  { code: "02", name: "Aisne" },
  { code: "03", name: "Allier" },
  { code: "04", name: "Alpes-de-Haute-Provence" },
  { code: "05", name: "Hautes-Alpes" },
  { code: "06", name: "Alpes-Maritimes" },
  { code: "07", name: "Ardèche" },
  { code: "08", name: "Ardennes" },
  { code: "09", name: "Ariège" },
  { code: "10", name: "Aube" },
  { code: "11", name: "Aude" },
  { code: "12", name: "Aveyron" },
  { code: "13", name: "Bouches-du-Rhône" },
  { code: "14", name: "Calvados" },
  { code: "15", name: "Cantal" },
  { code: "16", name: "Charente" },
  { code: "17", name: "Charente-Maritime" },
  { code: "18", name: "Cher" },
  { code: "19", name: "Corrèze" },
  { code: "2A", name: "Corse-du-Sud" },
  { code: "2B", name: "Haute-Corse" },
  { code: "21", name: "Côte-d'Or" },
  { code: "22", name: "Côtes-d'Armor" },
  { code: "23", name: "Creuse" },
  { code: "24", name: "Dordogne" },
  { code: "25", name: "Doubs" },
  { code: "26", name: "Drôme" },
  { code: "27", name: "Eure" },
  { code: "28", name: "Eure-et-Loir" },
  { code: "29", name: "Finistère" },
  { code: "30", name: "Gard" },
  { code: "31", name: "Haute-Garonne" },
  { code: "32", name: "Gers" },
  { code: "33", name: "Gironde" },
  { code: "34", name: "Hérault" },
  { code: "35", name: "Ille-et-Vilaine" },
  { code: "36", name: "Indre" },
  { code: "37", name: "Indre-et-Loire" },
  { code: "38", name: "Isère" },
  { code: "39", name: "Jura" },
  { code: "40", name: "Landes" },
  { code: "41", name: "Loir-et-Cher" },
  { code: "42", name: "Loire" },
  { code: "43", name: "Haute-Loire" },
  { code: "44", name: "Loire-Atlantique" },
  { code: "45", name: "Loiret" },
  { code: "46", name: "Lot" },
  { code: "47", name: "Lot-et-Garonne" },
  { code: "48", name: "Lozère" },
  { code: "49", name: "Maine-et-Loire" },
  { code: "50", name: "Manche" },
  { code: "51", name: "Marne" },
  { code: "52", name: "Haute-Marne" },
  { code: "53", name: "Mayenne" },
  { code: "54", name: "Meurthe-et-Moselle" },
  { code: "55", name: "Meuse" },
  { code: "56", name: "Morbihan" },
  { code: "57", name: "Moselle" },
  { code: "58", name: "Nièvre" },
  { code: "59", name: "Nord" },
  { code: "60", name: "Oise" },
  { code: "61", name: "Orne" },
  { code: "62", name: "Pas-de-Calais" },
  { code: "63", name: "Puy-de-Dôme" },
  { code: "64", name: "Pyrénées-Atlantiques" },
  { code: "65", name: "Hautes-Pyrénées" },
  { code: "66", name: "Pyrénées-Orientales" },
  { code: "67", name: "Bas-Rhin" },
  { code: "68", name: "Haut-Rhin" },
  { code: "69", name: "Rhône" },
  { code: "70", name: "Haute-Saône" },
  { code: "71", name: "Saône-et-Loire" },
  { code: "72", name: "Sarthe" },
  { code: "73", name: "Savoie" },
  { code: "74", name: "Haute-Savoie" },
  { code: "75", name: "Paris" },
  { code: "76", name: "Seine-Maritime" },
  { code: "77", name: "Seine-et-Marne" },
  { code: "78", name: "Yvelines" },
  { code: "79", name: "Deux-Sèvres" },
  { code: "80", name: "Somme" },
  { code: "81", name: "Tarn" },
  { code: "82", name: "Tarn-et-Garonne" },
  { code: "83", name: "Var" },
  { code: "84", name: "Vaucluse" },
  { code: "85", name: "Vendée" },
  { code: "86", name: "Vienne" },
  { code: "87", name: "Haute-Vienne" },
  { code: "88", name: "Vosges" },
  { code: "89", name: "Yonne" },
  { code: "90", name: "Territoire de Belfort" },
  { code: "91", name: "Essonne" },
  { code: "92", name: "Hauts-de-Seine" },
  { code: "93", name: "Seine-Saint-Denis" },
  { code: "94", name: "Val-de-Marne" },
  { code: "95", name: "Val-d'Oise" },
  { code: "971", name: "Guadeloupe" },
  { code: "972", name: "Martinique" },
  { code: "973", name: "Guyane" },
  { code: "974", name: "La Réunion" },
  { code: "976", name: "Mayotte" },
];

export const DEPARTMENT_LABEL: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.code, `${d.code} - ${d.name}`])
);

export function isDepartmentCode(value: string): boolean {
  return DEPARTMENTS.some((d) => d.code === value);
}

// Régions 2016 couvertes par une série Notaires-INSEE dédiée — tout département hors
// de cette table (et hors des 8 départements franciliens) retombe sur le coefficient
// national dans `resolveRealEstateSensitivity`.
export const DEPARTMENT_TO_REGION: Record<string, RegionId> = {
  // Auvergne-Rhône-Alpes
  "01": "auvergne-rhone-alpes",
  "03": "auvergne-rhone-alpes",
  "07": "auvergne-rhone-alpes",
  "15": "auvergne-rhone-alpes",
  "26": "auvergne-rhone-alpes",
  "38": "auvergne-rhone-alpes",
  "42": "auvergne-rhone-alpes",
  "43": "auvergne-rhone-alpes",
  "63": "auvergne-rhone-alpes",
  "69": "auvergne-rhone-alpes",
  "73": "auvergne-rhone-alpes",
  "74": "auvergne-rhone-alpes",
  // Hauts-de-France
  "02": "hauts-de-france",
  "59": "hauts-de-france",
  "60": "hauts-de-france",
  "62": "hauts-de-france",
  "80": "hauts-de-france",
  // Provence-Alpes-Côte d'Azur
  "04": "paca",
  "05": "paca",
  "06": "paca",
  "13": "paca",
  "83": "paca",
  "84": "paca",
};

export const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => i + 1);

export function arrondissementLabel(n: number): string {
  return n === 1 ? "1er" : `${n}e`;
}
