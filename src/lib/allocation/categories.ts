import type { AssetCategory } from "@/types/allocation";

const INK = "#14213d";
const WHITE = "#ffffff";

export const ASSET_CATEGORIES: AssetCategory[] = [
  { id: "actions", label: "Actions", color: "#2a78d6", onColor: INK },
  { id: "obligations", label: "Obligations", color: "#eb6834", onColor: INK },
  { id: "immobilier", label: "Immobilier", color: "#1baf7a", onColor: INK },
  { id: "liquidites", label: "Liquidités", color: "#eda100", onColor: INK },
  {
    id: "private-equity",
    label: "Private Equity",
    color: "#e87ba4",
    onColor: INK,
  },
  {
    id: "matieres-premieres",
    label: "Matières premières",
    color: "#008300",
    onColor: WHITE,
  },
  { id: "autres", label: "Autres", color: "#4a3aa7", onColor: WHITE },
];

/** All categories except Immobilier, which is derived from real properties rather than entered directly. */
export const FINANCIAL_CATEGORY_IDS = ASSET_CATEGORIES.filter(
  (category) => category.id !== "immobilier"
).map((category) => category.id);
