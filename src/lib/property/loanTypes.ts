export const AMORTIZATION_TYPES = ["amortissable", "in_fine", "partiel"] as const;

export type AmortizationType = (typeof AMORTIZATION_TYPES)[number];

export const AMORTIZATION_TYPE_LABELS: Record<AmortizationType, string> = {
  amortissable: "Amortissable",
  in_fine: "In fine",
  partiel: "Amortissement partiel",
};

export function isAmortizationType(value: string): value is AmortizationType {
  return (AMORTIZATION_TYPES as readonly string[]).includes(value);
}
