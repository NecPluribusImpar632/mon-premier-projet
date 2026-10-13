import { projectLoanBalance, type PropertyWithLoans } from "@/lib/property/loanCalculations";
import { computeRentalYield } from "@/lib/property/rentalYield";
import { DEFAULT_SCENARIO_PARAMS } from "@/lib/scenarios/scenarioParams";
import { REFERENCE_INDICES, REFERENCE_INDEX_LABELS } from "@/lib/allocation/referenceIndices";
import {
  actionsIndexBreakdownTotal,
  type ActionsIndexBreakdown,
} from "@/lib/allocation/actionsIndexBreakdown";
import {
  ACTIONS_INDEX_RETURN_STATS,
  ACTIONS_POINT_MASS_REAL_RETURN_PCT,
  IMMOBILIER_RETURN_STATS,
  OBLIGATIONS_REAL_RETURN_PCT,
  SCPI_REAL_RETURN_PCT,
  LIQUIDITES_REAL_RETURN_PCT,
  MATIERES_PREMIERES_REAL_RETURN_PCT,
  PE_REAL_RETURN_PCT,
  RENTAL_YIELD_CHARGES_HAIRCUT_PCT,
} from "@/lib/wealth/monteCarloAssumptions";
import { mulberry32, hashSeed, drawStandardNormal } from "@/lib/wealth/monteCarloPrng";

/** 2000 simulated trajectories — cheap for pure JS math (≈2000 × 30 years ×
 * a handful of draws, well under 50ms) while giving stable percentiles. */
const TRIAL_COUNT = 2000;

function toNominalMean(realPct: number, inflationPct: number): number {
  return ((1 + realPct / 100) * (1 + inflationPct / 100) - 1) * 100;
}

/** Standard deviation scales linearly under a *deterministic* inflation
 * shift (nominal = real×(1+i)+i, exact — inflation itself isn't modeled as
 * random here, only each asset's own real return is), so this is an exact
 * conversion, not an approximation. */
function toNominalStd(realStdPct: number, inflationPct: number): number {
  return realStdPct * (1 + inflationPct / 100);
}

export interface MonteCarloYearPoint {
  year: number;
  netWorth: number;
}

export interface AssetClassMonteCarloRow {
  categoryId: string;
  label: string;
  amount: number;
  status: "calibrated" | "pointMass" | "frozen";
  /** Real annual mean return, null for frozen (non projeté) buckets. */
  meanPct: number | null;
  /** Real annual standard deviation, 0 for pointMass/frozen buckets. */
  stdPct: number;
  sourceNote: string | null;
}

export interface MonteCarloResult {
  successPct: number;
  bands: {
    p10: MonteCarloYearPoint[];
    p50: MonteCarloYearPoint[];
    p90: MonteCarloYearPoint[];
  };
  breakdown: AssetClassMonteCarloRow[];
  targetAmount: number;
  horizonYears: number;
}

export interface WealthGoalContext {
  amounts: Record<string, number>;
  properties: PropertyWithLoans[];
  /** Montant Immobilier manuel — utilisé uniquement si `properties` est vide, même
   * convention que `ClientScenarioContext.immobilierValue`. */
  immobilierValue: number;
}

interface RealEstatePocket {
  currentValue: number;
  /** Appréciation nationale + (si loué) rendement locatif net propre au bien —
   * la moyenne diffère d'une poche à l'autre, l'écart-type national est
   * partagé (un seul choc de marché immobilier par année, cf. Actions). */
  nominalMeanPct: number;
}

function realEstatePockets(
  properties: PropertyWithLoans[],
  immobilierValue: number,
  inflationPct: number
): RealEstatePocket[] {
  const appreciationNominalPct = toNominalMean(IMMOBILIER_RETURN_STATS.meanPct, inflationPct);

  if (properties.length === 0) {
    return immobilierValue > 0
      ? [{ currentValue: immobilierValue, nominalMeanPct: appreciationNominalPct }]
      : [];
  }

  return properties.map((property) => {
    const grossYieldPct = computeRentalYield(property);
    const netYieldPct =
      grossYieldPct !== null ? grossYieldPct * (1 - RENTAL_YIELD_CHARGES_HAIRCUT_PCT / 100) : 0;
    return {
      currentValue: property.currentValue,
      nominalMeanPct: appreciationNominalPct + netYieldPct,
    };
  });
}

/** Combine the client's real per-index Actions stats into a single effective
 * distribution, weighted by their actual holdings. A weighted sum of
 * perfectly-correlated normal variables is itself normal — mean and std both
 * combine linearly (not via a sum-of-squares) because of that shared-shock
 * simplification (see `documentedCorrelationNote` below and the InfoTooltip
 * in WealthGoalSection), not because it's a statistical identity for
 * independent variables. */
function blendedActionsStats(breakdown: ActionsIndexBreakdown): {
  meanPct: number;
  stdPct: number;
  calibratedWeightPct: number;
} {
  const total = actionsIndexBreakdownTotal(breakdown);
  if (total <= 0) {
    const stats = ACTIONS_INDEX_RETURN_STATS["msci-world"];
    return { meanPct: stats!.meanPct, stdPct: stats!.stdPct, calibratedWeightPct: 100 };
  }

  let meanPct = 0;
  let stdPct = 0;
  let calibratedWeight = 0;
  for (const index of REFERENCE_INDICES) {
    const pct = breakdown[index] ?? 0;
    if (pct <= 0) continue;
    const weight = pct / total;
    const stats = ACTIONS_INDEX_RETURN_STATS[index];
    if (stats) {
      meanPct += weight * stats.meanPct;
      stdPct += weight * stats.stdPct;
      calibratedWeight += weight;
    } else {
      meanPct += weight * ACTIONS_POINT_MASS_REAL_RETURN_PCT;
    }
  }
  return { meanPct, stdPct, calibratedWeightPct: calibratedWeight * 100 };
}

function actionsSourceNote(breakdown: ActionsIndexBreakdown, calibratedWeightPct: number): string {
  const total = actionsIndexBreakdownTotal(breakdown);
  if (total <= 0) return "MSCI World par défaut (aucune répartition saisie)";
  const held = REFERENCE_INDICES.filter((index) => (breakdown[index] ?? 0) > 0);
  const label = held.map((index) => REFERENCE_INDEX_LABELS[index]).join(", ");
  if (calibratedWeightPct >= 100) return `Pondéré sur les indices détenus : ${label}`;
  return `Pondéré sur les indices détenus : ${label} — hors MSCI Emerging Markets (hypothèse simple faute de donnée fiable)`;
}

/**
 * Simule `TRIAL_COUNT` trajectoires de patrimoine net, en tirant chaque année
 * un rendement pour chaque poche calibrée (Actions, Immobilier) et en
 * appliquant un taux fixe pour les postes en point mass. Les tirages sont
 * indépendants ENTRE classes d'actifs (Actions / Immobilier / le reste), mais
 * PARFAITEMENT corrélés AU SEIN de la poche Actions (un seul tirage partagé
 * pondéré par la volatilité propre de chaque indice détenu) et au sein de
 * l'Immobilier (un seul tirage partagé pour toutes les poches du client) —
 * une simplification assumée, pas une corrélation partielle mesurée.
 */
export function computeWealthGoalMonteCarlo(
  context: WealthGoalContext,
  currentAge: number,
  targetAge: number,
  targetAmount: number,
  inflationPct: number,
  actionsIndexBreakdown: ActionsIndexBreakdown,
  monthlySavingsAmount: number = 0
): MonteCarloResult {
  const { amounts, properties, immobilierValue } = context;
  const horizonYears = Math.max(targetAge - currentAge, 0);
  const peDiscountFactor = 1 - DEFAULT_SCENARIO_PARAMS.peIlliquidityDiscountPct / 100;
  const annualSavings = Math.max(monthlySavingsAmount, 0) * 12;

  const actionsAmount = amounts.actions ?? 0;
  const { meanPct: actionsRealMean, stdPct: actionsRealStd, calibratedWeightPct } =
    blendedActionsStats(actionsIndexBreakdown);
  const actionsNominalMean = toNominalMean(actionsRealMean, inflationPct);
  const actionsNominalStd = toNominalStd(actionsRealStd, inflationPct);

  const pockets = realEstatePockets(properties, immobilierValue, inflationPct);
  const immobilierNominalStd = toNominalStd(IMMOBILIER_RETURN_STATS.stdPct, inflationPct);

  const obligationsNominalRate = toNominalMean(OBLIGATIONS_REAL_RETURN_PCT, inflationPct);
  const scpiNominalRate = toNominalMean(SCPI_REAL_RETURN_PCT, inflationPct);
  const liquiditesNominalRate = toNominalMean(LIQUIDITES_REAL_RETURN_PCT, inflationPct);
  const matieresPremieresNominalRate = toNominalMean(
    MATIERES_PREMIERES_REAL_RETURN_PCT,
    inflationPct
  );
  const peNominalRate = toNominalMean(PE_REAL_RETURN_PCT, inflationPct);

  const obligationsAmount = amounts.obligations ?? 0;
  const scpiAmount = amounts.scpi ?? 0;
  const liquiditesAmount = amounts.liquidites ?? 0;
  const peAmount = amounts["private-equity"] ?? 0;
  const matieresPremieresAmount = amounts["matieres-premieres"] ?? 0;
  const outilProfessionnelAmount = amounts["outil-professionnel"] ?? 0;
  const autresAmount = amounts.autres ?? 0;

  // L'épargne mensuelle est versée en fin de chaque année simulée dans les
  // poches financières, au prorata de l'allocation financière actuelle (jamais
  // dans l'immobilier ni dans les poches gelées) — sans rendement l'année du
  // versement, hypothèse prudente. Sans aucune poche financière, elle va en
  // Liquidités (0 % réel), faute de mieux.
  const savingsBase = {
    actions: actionsAmount,
    obligations: obligationsAmount,
    scpi: scpiAmount,
    liquidites: liquiditesAmount,
    pe: peAmount,
    matieresPremieres: matieresPremieresAmount,
  };
  const savingsBaseTotal = Object.values(savingsBase).reduce((s, v) => s + v, 0);
  const savingsShare = (bucketAmount: number, isLiquidites: boolean) =>
    savingsBaseTotal > 0 ? annualSavings * (bucketAmount / savingsBaseTotal) : isLiquidites ? annualSavings : 0;
  const savingsActions = savingsShare(savingsBase.actions, false);
  const savingsObligations = savingsShare(savingsBase.obligations, false);
  const savingsScpi = savingsShare(savingsBase.scpi, false);
  const savingsLiquidites = savingsShare(savingsBase.liquidites, true);
  const savingsPe = savingsShare(savingsBase.pe, false);
  const savingsMatieresPremieres = savingsShare(savingsBase.matieresPremieres, false);

  const random = mulberry32(
    hashSeed(
      `${targetAmount}|${targetAge}|${currentAge}|${inflationPct}|${annualSavings}|${actionsAmount}|${JSON.stringify(actionsIndexBreakdown)}|${properties.map((p) => p.id).join(",")}|${immobilierValue}`
    )
  );

  // trials[trial][year] = net worth
  const trials: number[][] = [];

  for (let trial = 0; trial < TRIAL_COUNT; trial++) {
    let actionsValue = actionsAmount;
    let pocketValues = pockets.map((p) => p.currentValue);
    let obligationsValue = obligationsAmount;
    let scpiValue = scpiAmount;
    let liquiditesValue = liquiditesAmount;
    let peValue = peAmount;
    let matieresPremieresValue = matieresPremieresAmount;

    const trialSeries: number[] = [];

    for (let year = 0; year <= horizonYears; year++) {
      if (year > 0) {
        const zActions = drawStandardNormal(random);
        actionsValue *= 1 + (actionsNominalMean + zActions * actionsNominalStd) / 100;

        if (pocketValues.length > 0) {
          // One shared shock per year for every property — pockets[i].nominalMeanPct
          // is already nominal (computed once via realEstatePockets), only the
          // std is random, and it's the same national std for every pocket.
          const zImmobilier = drawStandardNormal(random);
          pocketValues = pocketValues.map((value, i) => {
            const pocketReturn =
              (pockets[i].nominalMeanPct + zImmobilier * immobilierNominalStd) / 100;
            return value * (1 + pocketReturn);
          });
        }

        obligationsValue *= 1 + obligationsNominalRate / 100;
        scpiValue *= 1 + scpiNominalRate / 100;
        liquiditesValue *= 1 + liquiditesNominalRate / 100;
        peValue *= 1 + peNominalRate / 100;
        matieresPremieresValue *= 1 + matieresPremieresNominalRate / 100;

        actionsValue += savingsActions;
        obligationsValue += savingsObligations;
        scpiValue += savingsScpi;
        liquiditesValue += savingsLiquidites;
        peValue += savingsPe;
        matieresPremieresValue += savingsMatieresPremieres;
      }

      const totalDebt = properties.reduce(
        (sum, property) =>
          sum +
          property.loans.reduce((loanSum, loan) => loanSum + projectLoanBalance(loan, year), 0),
        0
      );

      const grossAssets =
        actionsValue +
        pocketValues.reduce((sum, v) => sum + v, 0) +
        obligationsValue +
        scpiValue +
        liquiditesValue +
        peValue * peDiscountFactor +
        matieresPremieresValue +
        outilProfessionnelAmount +
        autresAmount;

      trialSeries.push(grossAssets - totalDebt);
    }

    trials.push(trialSeries);
  }

  const successCount = trials.reduce(
    (count, series) => count + (series[horizonYears] >= targetAmount ? 1 : 0),
    0
  );
  const successPct = (successCount / TRIAL_COUNT) * 100;

  function percentileBand(p: number): MonteCarloYearPoint[] {
    const band: MonteCarloYearPoint[] = [];
    for (let year = 0; year <= horizonYears; year++) {
      const column = trials.map((series) => series[year]).sort((a, b) => a - b);
      const index = Math.min(
        column.length - 1,
        Math.max(0, Math.round(p * (column.length - 1)))
      );
      band.push({ year, netWorth: column[index] });
    }
    return band;
  }

  const breakdown: AssetClassMonteCarloRow[] = [
    {
      categoryId: "actions",
      label: "Actions",
      amount: actionsAmount,
      status: "calibrated",
      meanPct: actionsRealMean,
      stdPct: actionsRealStd,
      sourceNote: actionsSourceNote(actionsIndexBreakdown, calibratedWeightPct),
    },
    {
      categoryId: "immobilier",
      label: "Immobilier",
      amount: pockets.reduce((sum, p) => sum + p.currentValue, 0),
      status: pockets.length > 0 ? "calibrated" : "frozen",
      meanPct: pockets.length > 0 ? IMMOBILIER_RETURN_STATS.meanPct : null,
      stdPct: pockets.length > 0 ? IMMOBILIER_RETURN_STATS.stdPct : 0,
      sourceNote:
        pockets.length > 0
          ? `Distribution nationale (n=${IMMOBILIER_RETURN_STATS.n}, ${IMMOBILIER_RETURN_STATS.period}), pas de détail par zone dans ce module`
          : null,
    },
    {
      categoryId: "obligations",
      label: "Obligations",
      amount: obligationsAmount,
      status: "pointMass",
      meanPct: OBLIGATIONS_REAL_RETURN_PCT,
      stdPct: 0,
      sourceNote: "Hypothèse simple, volatilité non modélisée",
    },
    {
      categoryId: "scpi",
      label: "SCPI",
      amount: scpiAmount,
      status: "pointMass",
      meanPct: SCPI_REAL_RETURN_PCT,
      stdPct: 0,
      sourceNote: "Hypothèse simple, volatilité non modélisée",
    },
    {
      categoryId: "liquidites",
      label: "Liquidités",
      amount: liquiditesAmount,
      status: "pointMass",
      meanPct: LIQUIDITES_REAL_RETURN_PCT,
      stdPct: 0,
      sourceNote: "Hypothèse simple, volatilité non modélisée",
    },
    {
      categoryId: "private-equity",
      label: "Private Equity",
      amount: peAmount,
      status: "pointMass",
      meanPct: PE_REAL_RETURN_PCT,
      stdPct: 0,
      sourceNote: "Hypothèse simple, décote d'illiquidité du stress test appliquée",
    },
    {
      categoryId: "matieres-premieres",
      label: "Matières premières",
      amount: matieresPremieresAmount,
      status: "pointMass",
      meanPct: MATIERES_PREMIERES_REAL_RETURN_PCT,
      stdPct: 0,
      sourceNote:
        "Hypothèse simple — l'or/argent sont calibrés ailleurs (stress test uniquement), pas encore repris ici",
    },
    {
      categoryId: "outil-professionnel",
      label: "Entreprise / outil professionnel",
      amount: outilProfessionnelAmount,
      status: "frozen",
      meanPct: null,
      stdPct: 0,
      sourceNote: null,
    },
    {
      categoryId: "autres",
      label: "Autres",
      amount: autresAmount,
      status: "frozen",
      meanPct: null,
      stdPct: 0,
      sourceNote: null,
    },
  ];

  return {
    successPct,
    bands: {
      p10: percentileBand(0.1),
      p50: percentileBand(0.5),
      p90: percentileBand(0.9),
    },
    breakdown,
    targetAmount,
    horizonYears,
  };
}
