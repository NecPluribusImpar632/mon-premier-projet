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

const percentFormatters = new Map<number, Intl.NumberFormat>();

function percentFormatter(decimals: number): Intl.NumberFormat {
  let formatter = percentFormatters.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    percentFormatters.set(decimals, formatter);
  }
  return formatter;
}

/**
 * French-formatted percentage for display: decimal comma, narrow no-break
 * space before the sign ("6,73 %"). A share that is real but rounds to zero
 * at the requested precision reads "< 1 %" (or "< 0,1 %" with one decimal)
 * rather than a misleading "0 %" — a 15 000 € line in a 6 M€ patrimoine is
 * not nothing.
 */
export function formatPercent(value: number, decimals: number = 0): string {
  const rounded = roundPercent(value, decimals);
  if (value > 0 && rounded === 0) {
    const smallest = 1 / 10 ** decimals;
    return `< ${percentFormatter(decimals).format(smallest)} %`;
  }
  return `${percentFormatter(decimals).format(rounded)} %`;
}
