/**
 * Qualifies a regression R² into a plain-language reliability tier, for
 * calibrated shock coefficients derived from historical regressions (real
 * estate zones today; any future asset class calibrated the same way, e.g.
 * gold/inflation).
 *
 * Framed as "share of variation explained" rather than a technical
 * convention (Cohen's f² etc.) — the audience is CGPs, not statisticians,
 * and this framing states literally what R² means instead of requiring an
 * external reference. Boundaries are round numbers on that same framing:
 * under a quarter explained is weak evidence for a single-variable
 * regression on noisy macro/market series; a quarter to half is a real but
 * minority signal; half or more is strong for this kind of regression.
 * (A R² of 24-25%, non-significant on a 13-point sample, as found for the
 * SCPI/OAT regression, lands squarely in "faible" here — the bug this
 * threshold exists to fix was a lower tier that called 5-15% "modérée".)
 */
export interface ReliabilityTier {
  label: string;
  className: string;
}

export function reliabilityTierForR2(r2Pct: number): ReliabilityTier {
  const rounded = Math.round(r2Pct);
  if (rounded < 25) {
    return { className: "text-bronze", label: "⚠ fiabilité faible" };
  }
  if (rounded < 50) {
    return { className: "text-ink", label: "· fiabilité modérée" };
  }
  return { className: "text-emerald", label: "· fiabilité forte" };
}
