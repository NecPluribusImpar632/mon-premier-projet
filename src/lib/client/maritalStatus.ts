export const MARITAL_STATUSES = [
  "celibataire",
  "marie",
  "pacse",
  "concubinage",
  "divorce",
  "veuf",
] as const;

export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  celibataire: "Célibataire",
  marie: "Marié(e)",
  pacse: "Pacsé(e)",
  concubinage: "Concubinage notoire",
  divorce: "Divorcé(e)",
  veuf: "Veuf / veuve",
};

export function isMaritalStatus(value: string): value is MaritalStatus {
  return (MARITAL_STATUSES as readonly string[]).includes(value);
}

/**
 * L'IFI se déclare par foyer fiscal. Contrairement à l'IR, ce foyer inclut les
 * concubins notoires (union libre stable et continue), pas seulement les couples
 * mariés ou pacsés (art. 964 CGI).
 */
export function impliesJointIfiHousehold(status: MaritalStatus): boolean {
  return status === "marie" || status === "pacse" || status === "concubinage";
}

/** Marié ou pacsé : un seul foyer pour l'IR, et le conjoint déclaré dans la
 * situation familiale. Le concubinage forme deux foyers distincts. */
export function isCoupleForIncomeTax(status: string | null): boolean {
  return status === "marie" || status === "pacse";
}
