export const REFERENCE_INDICES = [
  "msci-world",
  "msci-em",
  "cac40",
  "eurostoxx50",
  "nasdaq",
  "dow",
  "nikkei225",
] as const;

export type ReferenceIndex = (typeof REFERENCE_INDICES)[number];

export const REFERENCE_INDEX_LABELS: Record<ReferenceIndex, string> = {
  "msci-world": "MSCI World",
  "msci-em": "MSCI Emerging Markets",
  cac40: "CAC 40",
  eurostoxx50: "EURO STOXX 50",
  nasdaq: "Nasdaq Composite",
  dow: "Dow Jones",
  nikkei225: "Nikkei 225",
};

/** MSCI World replaces the S&P 500 as the implicit "large diversified market"
 * default — the standard institutional reference for a globally diversified
 * equity market, rather than a single national one. See
 * indexScenarioShocks.ts for the calibration behind this choice. */
export const DEFAULT_REFERENCE_INDEX: ReferenceIndex = "msci-world";

export function isReferenceIndex(value: string): value is ReferenceIndex {
  return (REFERENCE_INDICES as readonly string[]).includes(value);
}
