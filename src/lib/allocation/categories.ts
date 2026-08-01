import type { AssetCategory } from "@/types/allocation";

const INK = "#14213d";
const WHITE = "#ffffff";

export const ASSET_CATEGORIES: AssetCategory[] = [
  { id: "actions", label: "Actions", color: "#2a78d6", onColor: INK },
  { id: "obligations", label: "Obligations", color: "#eb6834", onColor: INK },
  { id: "immobilier", label: "Immobilier", color: "#1baf7a", onColor: INK },
  { id: "scpi", label: "SCPI", color: "#8c6239", onColor: WHITE },
  { id: "liquidites", label: "Liquidités", color: "#eda100", onColor: INK },
  {
    id: "private-equity",
    label: "Private Equity",
    color: "#e87ba4",
    onColor: INK,
  },
  {
    id: "outil-professionnel",
    label: "Entreprise / outil professionnel",
    color: "#c0392b",
    onColor: WHITE,
  },
  {
    id: "matieres-premieres",
    label: "Matières premières",
    color: "#008300",
    onColor: WHITE,
  },
  { id: "autres", label: "Autres", color: "#4a3aa7", onColor: WHITE },
];

/**
 * All categories except Immobilier, which gets special-cased in the
 * allocation form: it's entered manually like the others, but overridden by
 * the sum of the client's detailed properties whenever at least one exists.
 */
export const FINANCIAL_CATEGORY_IDS = ASSET_CATEGORIES.filter(
  (category) => category.id !== "immobilier"
).map((category) => category.id);
