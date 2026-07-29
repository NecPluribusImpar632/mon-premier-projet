import type { AssetCategory } from "@/types/allocation";

const INK = "#0b0b0b";
const WHITE = "#ffffff";

export const ASSET_CATEGORIES: AssetCategory[] = [
  {
    id: "actions",
    label: "Actions",
    color: "#2a78d6",
    colorDark: "#3987e5",
    onColor: INK,
    onColorDark: INK,
  },
  {
    id: "obligations",
    label: "Obligations",
    color: "#eb6834",
    colorDark: "#d95926",
    onColor: INK,
    onColorDark: INK,
  },
  {
    id: "immobilier",
    label: "Immobilier",
    color: "#1baf7a",
    colorDark: "#199e70",
    onColor: INK,
    onColorDark: INK,
  },
  {
    id: "liquidites",
    label: "Liquidités",
    color: "#eda100",
    colorDark: "#c98500",
    onColor: INK,
    onColorDark: INK,
  },
  {
    id: "private-equity",
    label: "Private Equity",
    color: "#e87ba4",
    colorDark: "#d55181",
    onColor: INK,
    onColorDark: INK,
  },
  {
    id: "matieres-premieres",
    label: "Matières premières",
    color: "#008300",
    colorDark: "#008300",
    onColor: WHITE,
    onColorDark: WHITE,
  },
  {
    id: "autres",
    label: "Autres",
    color: "#4a3aa7",
    colorDark: "#9085e9",
    onColor: WHITE,
    onColorDark: INK,
  },
];
