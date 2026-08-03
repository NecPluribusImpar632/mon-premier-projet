import type { AssetCategory } from "@/types/allocation";

const INK = "#14213d";
const WHITE = "#ffffff";

export const ASSET_CATEGORIES: AssetCategory[] = [
  { id: "actions", label: "Actions", color: "#3B6E8C", onColor: WHITE },
  { id: "obligations", label: "Obligations", color: "#8C6E3B", onColor: WHITE },
  { id: "immobilier", label: "Immobilier", color: "#2F6F5E", onColor: WHITE },
  { id: "scpi", label: "SCPI", color: "#6E8C3B", onColor: WHITE },
  { id: "liquidites", label: "Liquidités", color: "#C9A227", onColor: INK },
  {
    id: "private-equity",
    label: "Private Equity",
    color: "#8C3B6E",
    onColor: WHITE,
  },
  {
    id: "outil-professionnel",
    label: "Entreprise / outil professionnel",
    color: "#6E3B8C",
    onColor: WHITE,
  },
  {
    id: "matieres-premieres",
    label: "Matières premières",
    color: "#8C5A3B",
    onColor: WHITE,
  },
  { id: "autres", label: "Autres", color: "#6B7280", onColor: WHITE },
];

/**
 * All categories except Immobilier, which gets special-cased in the
 * allocation form: it's entered manually like the others, but overridden by
 * the sum of the client's detailed properties whenever at least one exists.
 */
export const FINANCIAL_CATEGORY_IDS = ASSET_CATEGORIES.filter(
  (category) => category.id !== "immobilier"
).map((category) => category.id);
