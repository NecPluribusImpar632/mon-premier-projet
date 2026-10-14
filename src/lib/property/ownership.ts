import type { Loan, Property } from "@/generated/prisma/client";

/**
 * The one place that turns a property's full figures into the client's own
 * share of them. Every calculation (net worth, IFI, stress test, Monte Carlo,
 * cash flows, tax comparator) goes through these helpers; the raw columns
 * stay the full-property figures so the fiche can show both side by side.
 */

export const HOLDING_MODES = [
  "direct",
  "indivision",
  "sci_ir",
  "sci_is",
  "nue_propriete",
  "usufruit",
] as const;

export type HoldingMode = (typeof HOLDING_MODES)[number];

export const HOLDING_MODE_LABELS: Record<HoldingMode, string> = {
  direct: "Détention directe",
  indivision: "Indivision",
  sci_ir: "SCI à l'IR",
  sci_is: "SCI à l'IS",
  nue_propriete: "Démembrement : nue-propriété",
  usufruit: "Démembrement : usufruit",
};

export const DEFAULT_HOLDING_MODE: HoldingMode = "direct";

/** Shown wherever a dismembered property appears: its value is counted at
 * the share of the full ownership, nothing else is modeled. */
export const DISMEMBERMENT_NOTE = "Évaluation à adapter, non modélisée";

export function isHoldingMode(value: string): value is HoldingMode {
  return (HOLDING_MODES as readonly string[]).includes(value);
}

export function holdingModeLabel(value: string): string {
  return isHoldingMode(value) ? HOLDING_MODE_LABELS[value] : HOLDING_MODE_LABELS.direct;
}

export function isDismemberment(value: string): boolean {
  return value === "nue_propriete" || value === "usufruit";
}

export const MIN_OWNERSHIP_SHARE_PCT = 0.01;
export const MAX_OWNERSHIP_SHARE_PCT = 100;

export function isValidOwnershipShare(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= MIN_OWNERSHIP_SHARE_PCT &&
    value <= MAX_OWNERSHIP_SHARE_PCT
  );
}

type ShareSource = Pick<Property, "ownershipSharePct">;

/** 0 < share ≤ 1. */
export function ownershipShare(property: ShareSource): number {
  return property.ownershipSharePct / 100;
}

export function isPartialOwnership(property: ShareSource): boolean {
  return property.ownershipSharePct < MAX_OWNERSHIP_SHARE_PCT;
}

export function ownedValue(property: Pick<Property, "ownershipSharePct" | "currentValue">): number {
  return property.currentValue * ownershipShare(property);
}

/** Null stays null: a property is rented or not, whatever the share. */
export function ownedMonthlyRent(
  property: Pick<Property, "ownershipSharePct" | "monthlyRent">
): number | null {
  return property.monthlyRent === null ? null : property.monthlyRent * ownershipShare(property);
}

export function ownedAcquisitionPrice(
  property: Pick<Property, "ownershipSharePct" | "acquisitionPrice">
): number | null {
  return property.acquisitionPrice === null
    ? null
    : property.acquisitionPrice * ownershipShare(property);
}

/** The fraction of a loan the client carries: all of it when the loan is
 * marked as borne by them alone, the property's share otherwise. */
export function loanShare(loan: Pick<Loan, "borneFullyByClient">, property: ShareSource): number {
  return loan.borneFullyByClient ? 1 : ownershipShare(property);
}

export function ownedLoanAmount(
  loan: Pick<Loan, "borneFullyByClient" | "remainingAmount">,
  property: ShareSource
): number {
  return loan.remainingAmount * loanShare(loan, property);
}
