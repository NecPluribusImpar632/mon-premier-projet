export const STOCK_PROFILES = ["indiciel", "defensif", "croissance"] as const;

export type StockProfile = (typeof STOCK_PROFILES)[number];

export const STOCK_PROFILE_LABELS: Record<StockProfile, string> = {
  indiciel: "Indiciel large",
  defensif: "Défensif / dividendes",
  croissance: "Croissance",
};

export const STOCK_PROFILE_DESCRIPTIONS: Record<StockProfile, string> = {
  indiciel: "Suit le marché général (type S&P 500)",
  defensif: "Moins sensible, plus résilient",
  croissance: "Plus sensible aux hausses de taux et récessions",
};

/**
 * Illustrative sensitivity (beta) to a general market shock, by profile.
 * Not a real quantitative model — a simplification so the three profiles
 * respond differently to the same market move.
 */
export const STOCK_PROFILE_BETA: Record<StockProfile, number> = {
  indiciel: 1,
  defensif: 0.6,
  croissance: 1.4,
};

export interface ActionsProfileBreakdown {
  indiciel: number;
  defensif: number;
  croissance: number;
}

export function isActionsBreakdownComplete(
  breakdown: ActionsProfileBreakdown
): boolean {
  const total = breakdown.indiciel + breakdown.defensif + breakdown.croissance;
  return (
    breakdown.indiciel >= 0 &&
    breakdown.defensif >= 0 &&
    breakdown.croissance >= 0 &&
    total === 100
  );
}
