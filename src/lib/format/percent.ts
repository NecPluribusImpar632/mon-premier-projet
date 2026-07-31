/**
 * Rounds a percentage for display only. Division-derived percentages (e.g.
 * `(x / 100) * y`) routinely pick up binary floating-point noise like
 * 56.999999999999994 — this collapses that back to a clean number without
 * touching whatever precise value is used internally for allocation logic.
 */
export function roundPercent(value: number, decimals: number = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
