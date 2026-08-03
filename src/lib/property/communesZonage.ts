import "server-only";
import communesData from "@/lib/property/communesZonage.json";

// Source: "Liste des communes selon le zonage ABC", Ministère de la Transition
// écologique (data.gouv.fr, Licence Ouverte 2.0). See
// scripts/generate-communes-zonage.mjs for how this JSON is produced. Kept
// server-only: at ~2.3MB / 34 875 communes, this must never reach client JS —
// only the department-scoped subset a form actually needs is ever sent to the
// browser, via the getCommunesForDepartment server action.
export type ZonageAbc = "Abis" | "A" | "B1" | "B2" | "C";

export interface Commune {
  code: string;
  department: string;
  name: string;
  zone: ZonageAbc;
}

const COMMUNES = communesData as Commune[];

const BY_CODE: Map<string, Commune> = new Map(
  COMMUNES.map((c) => [c.code, c])
);

export function getCommunesForDepartment(department: string): Commune[] {
  return COMMUNES.filter((c) => c.department === department).sort((a, b) =>
    a.name.localeCompare(b.name, "fr")
  );
}

export function getZoneForCommune(code: string): ZonageAbc | null {
  return BY_CODE.get(code)?.zone ?? null;
}

export function getCommuneName(code: string): string | null {
  return BY_CODE.get(code)?.name ?? null;
}

export function isCommuneCode(code: string): boolean {
  return BY_CODE.has(code);
}
