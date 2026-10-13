import "server-only";
import type { Property } from "@/generated/prisma/client";
import type { PropertyWithLoans } from "@/lib/property/loanCalculations";
import { PARIS_COMMUNE_CODE, PARIS_DEPARTMENT_CODE } from "@/lib/property/departments";
import { getCommuneName, getZoneForCommune } from "@/lib/property/communesZonage";
import {
  resolveRealEstateSensitivity,
  type ZoneSensitivity,
} from "@/lib/scenarios/realEstateSensitivity";

// Paris properties carry an arrondissement for display and no commune code (the
// form never asks for one): Paris is a single commune in the zonage dataset, so
// the lookup goes through that one code.
function communeCodeForSensitivity(property: Property): string | null {
  if (property.communeCode) return property.communeCode;
  if (property.department === PARIS_DEPARTMENT_CODE) return PARIS_COMMUNE_CODE;
  return null;
}

// The only place that resolves a property's zone sensitivity from its raw
// location fields. Kept server-only because it's the one caller that needs
// the full 34 875-commune lookup table — everything downstream (calculations.ts,
// the scenario cards) works with the already-resolved ZoneSensitivity instead,
// so that data never has to ship to client JS.
export function resolvePropertySensitivity(property: Property): ZoneSensitivity {
  const communeCode = communeCodeForSensitivity(property);
  return resolveRealEstateSensitivity(communeCode ? getZoneForCommune(communeCode) : null);
}

export type PropertyWithSensitivity = PropertyWithLoans & {
  sensitivity: ZoneSensitivity;
  /** Resolved server-side for the same reason as `sensitivity` — the commune
   * lookup table is server-only, so this is the one place that touches it on
   * behalf of any client component (e.g. PropertyList) that needs a name. */
  communeName: string | null;
};

export function withResolvedSensitivity(
  properties: PropertyWithLoans[]
): PropertyWithSensitivity[] {
  return properties.map((property) => ({
    ...property,
    sensitivity: resolvePropertySensitivity(property),
    communeName: property.communeCode ? (getCommuneName(property.communeCode) ?? null) : null,
  }));
}
