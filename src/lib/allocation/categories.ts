import type { AssetCategory } from "@/types/allocation";

export const ASSET_CATEGORIES: AssetCategory[] = [
  { id: "actions", label: "Actions", color: "#2563eb" },
  { id: "obligations", label: "Obligations", color: "#16a34a" },
  { id: "immobilier", label: "Immobilier", color: "#d97706" },
  { id: "liquidites", label: "Liquidités", color: "#64748b" },
  { id: "private-equity", label: "Private Equity", color: "#7c3aed" },
  { id: "matieres-premieres", label: "Matières premières", color: "#dc2626" },
  { id: "autres", label: "Autres", color: "#0891b2" },
];
