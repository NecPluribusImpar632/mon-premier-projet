export const RATE_TYPES = ["fixed", "variable"] as const;

export type RateType = (typeof RATE_TYPES)[number];

export const RATE_TYPE_LABELS: Record<RateType, string> = {
  fixed: "Fixe",
  variable: "Variable",
};

export function isRateType(value: string): value is RateType {
  return (RATE_TYPES as readonly string[]).includes(value);
}
