import type { ReferenceIndex } from "@/lib/allocation/referenceIndices";

/**
 * Calibration data for the wealth-goal Monte Carlo engine — real annual return
 * distributions (mean + standard deviation), sourced separately from the
 * flat assumptions this module replaces. Full sourcing detail (data sources,
 * currency conversion methodology, window choices) lives in the plan history;
 * only the final figures are kept here.
 */

export interface ReturnStats {
  meanPct: number;
  stdPct: number;
  /** Sample size and period, for the "calibré" status shown in the UI. */
  n: number;
  period: string;
}

/**
 * Real annual return per index, converted to euros (synthetic pre-1999 rate
 * via the fixed FRF/EUR peg 6.55957, real EUR/USD or EUR/JPY rate from 1999),
 * deflated by French CPI. `null` = MSCI Emerging Markets, for which no
 * reliable public annual-return series was found — treated as a point mass
 * using the same flat 5% real assumption the whole Actions bucket used
 * before this rewrite, rather than inventing a distribution.
 */
export const ACTIONS_INDEX_RETURN_STATS: Record<ReferenceIndex, ReturnStats | null> = {
  "msci-world": { meanPct: 7.81, stdPct: 18.16, n: 56, period: "1970-2025" },
  dow: { meanPct: 7.74, stdPct: 17.23, n: 66, period: "1960-2025" },
  nasdaq: { meanPct: 11.04, stdPct: 25.91, n: 54, period: "1972-2025" },
  nikkei225: { meanPct: 5.96, stdPct: 25.19, n: 64, period: "1961-2024" },
  cac40: { meanPct: 4.22, stdPct: 22.47, n: 56, period: "1970-2025" },
  eurostoxx50: { meanPct: 5.03, stdPct: 20.61, n: 39, period: "1987-2025" },
  "msci-em": null,
};

/** Point-mass fallback for MSCI Emerging Markets — same flat real rate the
 * whole Actions bucket used before per-index calibration existed. */
export const ACTIONS_POINT_MASS_REAL_RETURN_PCT = 5;

/** Une seule distribution nationale (Friggit/IGEDD), pas de détail par zone —
 * complémentaire à la sensibilité au taux OAT déjà calibrée par zone dans
 * `realEstateSensitivity.ts`, qui reste utilisée telle quelle pour le stress
 * test (question différente : réponse à un choc de taux ponctuel, pas une
 * distribution de rendement long terme). */
export const IMMOBILIER_RETURN_STATS: ReturnStats = {
  meanPct: 2.02,
  stdPct: 4.65,
  n: 51,
  period: "1970-2020",
};

/** SCPI : hypothèse de rendement réel net de frais de gestion (2,5 %) avec
 * une volatilité de 6 %, un ordre de grandeur choisi, pas une distribution
 * mesurée (aucune série longue fiable, voir la page Méthodologie). Les SCPI
 * publiant un rendement déjà net, elles ne portent pas de frais annuels
 * supplémentaires par défaut (DEFAULT_ANNUAL_FEES_PCT). */
export const SCPI_REAL_RETURN_PCT = 2.5;
export const SCPI_RETURN_STD_PCT = 6;

// Hypothèses point mass — ordres de grandeur consensuels de long terme,
// volatilité non modélisée faute de donnée fiable.
export const OBLIGATIONS_REAL_RETURN_PCT = 1.5;
export const LIQUIDITES_REAL_RETURN_PCT = 0;
export const MATIERES_PREMIERES_REAL_RETURN_PCT = 0;
/** Réel, comme tous les autres postes. L'ancienne hypothèse était 6,5 %
 * nominal, soit environ 4,4 % réel à 2 % d'inflation : même ordre de
 * grandeur, exprimé dans la même unité que le reste du moteur. Compté à
 * 100 % de sa valeur, comme dans la Vue d'ensemble ; la décote d'illiquidité
 * est réservée au stress test. */
export const PE_REAL_RETURN_PCT = 4.5;
/** Décote sur le rendement locatif brut pour charges/copropriété/vacance/
 * entretien uniquement — pas la fiscalité, qui dépend du régime choisi. */
export const RENTAL_YIELD_CHARGES_HAIRCUT_PCT = 30;

/** Annual fees per poste (management, custody, fund fees), subtracted from
 * the nominal return every simulated year. Editable per client in the
 * Objectif patrimonial tab; these are the defaults when nothing is set. */
export interface AnnualFeesPct {
  actions: number;
  obligations: number;
  scpi: number;
  privateEquity: number;
  immobilier: number;
}

export const DEFAULT_ANNUAL_FEES_PCT: AnnualFeesPct = {
  actions: 1.5,
  obligations: 1,
  scpi: 0,
  privateEquity: 2,
  immobilier: 0,
};

export const ANNUAL_FEES_LABELS: Record<keyof AnnualFeesPct, string> = {
  actions: "Actions",
  obligations: "Obligations",
  scpi: "SCPI",
  privateEquity: "Private Equity",
  immobilier: "Immobilier",
};
