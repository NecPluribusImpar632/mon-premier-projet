import { REFERENCE_INDICES, type ReferenceIndex } from "@/lib/allocation/referenceIndices";
import {
  actionsIndexBreakdownTotal,
  type ActionsIndexBreakdown,
} from "@/lib/allocation/actionsIndexBreakdown";
import type { ScenarioPreset } from "@/lib/scenarios/presets";

/**
 * Per-index calibration of the three named scenario presets, replacing the
 * single generic marketShockPct on SCENARIO_PRESETS for whichever index (or
 * mix of indices) the client's Actions bucket actually tracks.
 *
 * Windows used (chosen for data availability across all 7 indices, not an
 * attempt at a precise historical reconstruction of each crisis — a
 * simplification acknowledged the same way the OAT calibration in
 * presets.ts already is):
 *  - "2008"       → calendar year 2008 (global financial crisis).
 *  - "oil-shock"  → calendar year 2022 (Ukraine invasion, energy price
 *    spike, inflation surge to ~6-9% worldwide — closer to this preset's
 *    own inflationPct=6 than the 1973-74 oil shock, whose data isn't
 *    available across all 7 indices).
 *  - "rate-rise"  → calendar year 2018 (Fed/ECB tightening cycle without an
 *    accompanying oil or banking shock — the "purest" rate-driven
 *    correction with full data available for every index here).
 *
 * All figures are annual index returns (price + dividends where the source
 * reports total return), rounded to one decimal, sourced via web research
 * (MSCI/STOXX/Nasdaq official factsheets, Yahoo Finance, macrotrends,
 * dqydj, 1stock1, Bloomberg, statista — see chat history for the full
 * source list per figure). Source quality varies by index; where multiple
 * sources disagreed by more than ~1pt, the most commonly-cited figure was
 * kept rather than an average.
 *
 * MSCI Emerging Markets is the one index EUR-adjusted here, at the
 * client's request: unlike gold (preciousMetalsSensitivity.ts), where the
 * EUR/USD leg partly offsets the metal's own move, empirical figures for
 * MSCI EM (EUR) vs MSCI EM (USD) in 2018/2022 show the same offsetting
 * pattern (a stronger dollar during global risk-off periods cushions a
 * EUR-based holder's USD-denominated loss) — not the "twin crisis" EM
 * local-currency effect (which is already baked into the USD figure MSCI
 * publishes, since local market caps are converted to USD at spot). 2018 and
 * 2022 use MSCI's own published EUR net index (-10.26% and -14.85%,
 * msci-emerging-markets-index-eur-net.pdf); 2008 has no such factsheet
 * available online, so it's derived by applying the actual EUR/USD move
 * over 2008 (1.4721 → 1.3917, ECB reference rates, i.e. USD +5.8%) to the
 * published USD figure (-48.88%) — a transparent calculation, not a
 * directly-published one, flagged as such in the UI.
 *
 * Nikkei 225 is deliberately NOT currency-adjusted, per the same
 * conversation: the yen's direction relative to EUR flips between crisis
 * types (safe-haven strength in a global panic like 2008, vs. BoJ-driven
 * weakness in a rate-divergence episode like 2022) in a way that isn't
 * simply "the same pattern as gold" — a real complexity, not a coefficient
 * to compute. The figures below are in JPY, as published, and the
 * limitation is documented in the Nikkei methodology tooltip rather than
 * silently absorbed into a made-up conversion.
 */
export type NamedPresetId = "2008" | "oil-shock" | "rate-rise";

export const INDEX_SCENARIO_SHOCK_PCT: Record<ReferenceIndex, Record<NamedPresetId, number>> = {
  "msci-world": { "2008": -40.7, "oil-shock": -17.7, "rate-rise": -8.7 },
  "msci-em": { "2008": -45.9, "oil-shock": -14.9, "rate-rise": -10.3 },
  cac40: { "2008": -41.9, "oil-shock": -9.2, "rate-rise": -11.1 },
  eurostoxx50: { "2008": -43.0, "oil-shock": -14.3, "rate-rise": -15.9 },
  nasdaq: { "2008": -41.7, "oil-shock": -33.1, "rate-rise": -3.9 },
  dow: { "2008": -34.0, "oil-shock": -4.2, "rate-rise": -1.0 },
  nikkei225: { "2008": -42.1, "oil-shock": -9.4, "rate-rise": -12.0 },
};

function isNamedPresetId(id: string): id is NamedPresetId {
  return id === "2008" || id === "oil-shock" || id === "rate-rise";
}

/**
 * The market shock to apply for the Actions card, once the client's index
 * breakdown is known. For the three named presets, this replaces the
 * preset's generic marketShockPct with a weighted blend of each held
 * index's real historical move over the calibration window above (e.g. 40%
 * CAC 40 + 60% Nasdaq → 0.4×CAC40 + 0.6×Nasdaq for that scenario). For
 * "Personnalisé" (a free-typed hypothetical, not tied to any historical
 * episode), the preset's own value is used unchanged — there's no
 * index-specific figure to look up for a made-up shock magnitude.
 */
export function resolvedMarketShockPct(
  preset: ScenarioPreset,
  breakdown: ActionsIndexBreakdown
): number {
  if (!isNamedPresetId(preset.id)) return preset.marketShockPct;
  const presetId = preset.id;

  const total = actionsIndexBreakdownTotal(breakdown);
  if (total <= 0) return preset.marketShockPct;

  return REFERENCE_INDICES.reduce((sum, index) => {
    const pct = breakdown[index] ?? 0;
    if (pct <= 0) return sum;
    return sum + (pct / total) * INDEX_SCENARIO_SHOCK_PCT[index][presetId];
  }, 0);
}
