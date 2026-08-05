export interface HoldingPeriodAbatement {
  irAbatementPct: number;
  psAbatementPct: number;
}

/**
 * Abattement pour durée de détention sur les plus-values immobilières des
 * particuliers (location nue, LMNP réel, micro-BIC — pas la SCI à l'IS, qui
 * n'en bénéficie jamais). IR : 0%/an les 5 premières années, 6%/an de la 6e
 * à la 21e, 4% la 22e (exonération totale à 22 ans). PS : 0%/an les 5
 * premières années, 1,65%/an de la 6e à la 21e, 1,60% la 22e, 9%/an de la
 * 23e à la 30e (exonération totale à 30 ans).
 */
export function computeHoldingPeriodAbatement(years: number): HoldingPeriodAbatement {
  const y = Math.max(years, 0);

  let irAbatementPct: number;
  if (y <= 5) {
    irAbatementPct = 0;
  } else if (y <= 21) {
    irAbatementPct = (y - 5) * 6;
  } else {
    irAbatementPct = 100;
  }

  let psAbatementPct: number;
  if (y <= 5) {
    psAbatementPct = 0;
  } else if (y <= 21) {
    psAbatementPct = (y - 5) * 1.65;
  } else if (y === 22) {
    psAbatementPct = 16 * 1.65 + 1.6;
  } else if (y <= 30) {
    psAbatementPct = 16 * 1.65 + 1.6 + (y - 22) * 9;
  } else {
    psAbatementPct = 100;
  }

  return {
    irAbatementPct: Math.min(irAbatementPct, 100),
    psAbatementPct: Math.min(psAbatementPct, 100),
  };
}

/**
 * Surtaxe progressive de 2% à 6% sur les plus-values immobilières des
 * particuliers dépassant 50 000€ de plus-value nette imposable (barème par
 * tranches avec lissage, BOI-RFPI-TPVIE-20-20180824). Ne s'applique pas à la
 * SCI à l'IS (régime des sociétés, pas des particuliers).
 */
export function computeHighGainSurtax(taxableGain: number): number {
  const pv = taxableGain;
  if (pv <= 50_000) return 0;
  if (pv <= 60_000) return 0.02 * pv - (60_000 - pv) * (1 / 20);
  if (pv <= 100_000) return 0.02 * pv;
  if (pv <= 110_000) return 0.03 * pv - (110_000 - pv) * (1 / 10);
  if (pv <= 150_000) return 0.03 * pv;
  if (pv <= 160_000) return 0.04 * pv - (160_000 - pv) * (15 / 100);
  if (pv <= 200_000) return 0.04 * pv;
  if (pv <= 210_000) return 0.05 * pv - (210_000 - pv) * (20 / 100);
  if (pv <= 250_000) return 0.05 * pv;
  if (pv <= 260_000) return 0.06 * pv - (260_000 - pv) * (25 / 100);
  return 0.06 * pv;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** Full years elapsed since a date, floored — the doctrine counts complete
 * years of detention, not fractional ones. */
export function fullYearsElapsed(from: Date): number {
  return Math.max(Math.floor((Date.now() - from.getTime()) / MS_PER_YEAR), 0);
}
