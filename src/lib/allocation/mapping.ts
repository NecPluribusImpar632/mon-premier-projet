import type { Client } from "@/generated/prisma/client";
import type { AllocationEntry } from "@/types/allocation";
import { ASSET_CATEGORIES } from "./categories";

type AllocationFieldName =
  | "actionsPct"
  | "obligationsPct"
  | "immobilierPct"
  | "liquiditesPct"
  | "privateEquityPct"
  | "matieresPremieresPct"
  | "autresPct";

const CATEGORY_FIELD_MAP: Record<string, AllocationFieldName> = {
  actions: "actionsPct",
  obligations: "obligationsPct",
  immobilier: "immobilierPct",
  liquidites: "liquiditesPct",
  "private-equity": "privateEquityPct",
  "matieres-premieres": "matieresPremieresPct",
  autres: "autresPct",
};

export function entriesFromClient(client: Client): AllocationEntry[] {
  return ASSET_CATEGORIES.map((category) => ({
    categoryId: category.id,
    percentage: client[CATEGORY_FIELD_MAP[category.id]],
  }));
}

export function allocationFieldsFromEntries(
  entries: AllocationEntry[]
): Partial<Record<AllocationFieldName, number>> {
  const fields: Partial<Record<AllocationFieldName, number>> = {};
  for (const entry of entries) {
    const field = CATEGORY_FIELD_MAP[entry.categoryId];
    if (field) {
      fields[field] = entry.percentage;
    }
  }
  return fields;
}
