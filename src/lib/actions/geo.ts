"use server";

import { getCommunesForDepartment as lookupCommunes } from "@/lib/property/communesZonage";

// Thin server action wrapping the commune lookup so the LocationFields client
// component can fetch a department's communes on demand — the full 34 875-row
// table never has to reach the browser, only the (small) subset for whichever
// department is currently selected.
export async function getCommunesForDepartment(department: string) {
  return lookupCommunes(department).map((c) => ({ code: c.code, name: c.name }));
}
