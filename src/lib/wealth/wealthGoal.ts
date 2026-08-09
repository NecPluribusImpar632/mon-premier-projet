import { projectLoanBalance, type PropertyWithLoans } from "@/lib/property/loanCalculations";
import { computeRentalYield } from "@/lib/property/rentalYield";
import { DEFAULT_SCENARIO_PARAMS } from "@/lib/scenarios/scenarioParams";
import type { ProjectionYearPoint } from "@/lib/scenarios/projection";

// Hypothèses de rendement RÉEL annuel par classe d'actif — des ordres de grandeur
// consensuels de long terme, PAS calibrés sur données historiques françaises comme
// le stress test immobilier (Notaires-INSEE). Documentées dans le panneau
// méthodologie de WealthGoalSection, jamais saisies par l'utilisateur.
const OBLIGATIONS_REAL_RETURN_PCT = 1.5;
const SCPI_REAL_RETURN_PCT = 4;
const LIQUIDITES_REAL_RETURN_PCT = 0;
const MATIERES_PREMIERES_REAL_RETURN_PCT = 0;
/** Ordre de grandeur Friggit/IGEDD sur le long terme pour l'appréciation réelle des
 * prix immobiliers en France (proche de 0, pas les décennies exceptionnelles). */
const REAL_ESTATE_APPRECIATION_REAL_PCT = 0.5;
/** Nominal, pas réel — pas de conversion via toNominal. */
const PE_NOMINAL_RETURN_PCT = 6.5;
/** Décote sur le rendement locatif brut pour charges/copropriété/vacance/entretien
 * uniquement — PAS la fiscalité, qui dépend du régime choisi (voir le comparateur
 * fiscal LMNP/SCI/déficit foncier). */
const RENTAL_YIELD_CHARGES_HAIRCUT_PCT = 30;

/** Flat assumption for the whole Actions bucket regardless of index mix — a
 * consensus long-run figure (closer to MSCI World's real long-run return
 * than the US-heavy S&P 500's), not broken down per index since no long-run
 * real-return research exists per index yet (only the crisis-year shocks in
 * indexScenarioShocks.ts are calibrated that granularly). */
const ACTIONS_REAL_RETURN_PCT = 5;

/** (1+réel)×(1+inflation)−1 — nécessaire pour additionner les hypothèses "réelles"
 * ci-dessus au 6,5% nominal du Private Equity, et parce qu'un objectif de
 * patrimoine s'exprime naturellement en euros courants. */
function toNominal(realPct: number, inflationPct: number): number {
  return ((1 + realPct / 100) * (1 + inflationPct / 100) - 1) * 100;
}

export interface AssetClassGrowthRow {
  categoryId: string;
  label: string;
  amount: number;
  /** null = poche figée ("non projeté"), aucun taux appliqué. */
  nominalReturnPct: number | null;
}

export interface WealthGoalContext {
  amounts: Record<string, number>;
  properties: PropertyWithLoans[];
  /** Montant Immobilier manuel — utilisé uniquement si `properties` est vide, même
   * convention que `ClientScenarioContext.immobilierValue`. */
  immobilierValue: number;
}

export interface WealthGoalResult {
  points: ProjectionYearPoint[];
  blendedNominalReturnPct: number;
  breakdown: AssetClassGrowthRow[];
  targetAmount: number;
  horizonYears: number;
  finalNetWorth: number;
  isGoalReached: boolean;
  gapAmount: number;
}

interface RealEstatePocket {
  currentValue: number;
  nominalReturnPct: number;
}

/** Appréciation + (si loué) rendement locatif net, calculés bien par bien — pas une
 * moyenne de zone : `computeRentalYield` lit le loyer réellement saisi sur CE bien. */
function realEstatePockets(
  properties: PropertyWithLoans[],
  immobilierValue: number,
  inflationPct: number
): RealEstatePocket[] {
  const appreciationNominalPct = toNominal(REAL_ESTATE_APPRECIATION_REAL_PCT, inflationPct);

  if (properties.length === 0) {
    return immobilierValue > 0
      ? [{ currentValue: immobilierValue, nominalReturnPct: appreciationNominalPct }]
      : [];
  }

  return properties.map((property) => {
    const grossYieldPct = computeRentalYield(property);
    const netYieldPct =
      grossYieldPct !== null ? grossYieldPct * (1 - RENTAL_YIELD_CHARGES_HAIRCUT_PCT / 100) : 0;
    return {
      currentValue: property.currentValue,
      nominalReturnPct: appreciationNominalPct + netYieldPct,
    };
  });
}

/**
 * Projette le patrimoine net vers une cible en croissant chaque poche de
 * l'allocation à son propre taux (jamais un taux global saisi à la main), et
 * compare la valeur finale à l'objectif. La dette continue de s'amortir via
 * `projectLoanBalance` (même fonction que la projection de scénario et la
 * trajectoire de retraite) — un crédit lombard n'est pas modélisable, l'app ne
 * suit que les prêts adossés à un bien immobilier.
 */
export function computeWealthGoalProjection(
  context: WealthGoalContext,
  currentAge: number,
  targetAge: number,
  targetAmount: number,
  inflationPct: number
): WealthGoalResult {
  const { amounts, properties, immobilierValue } = context;
  const horizonYears = Math.max(targetAge - currentAge, 0);
  const peDiscountFactor = 1 - DEFAULT_SCENARIO_PARAMS.peIlliquidityDiscountPct / 100;

  const financialBreakdown: AssetClassGrowthRow[] = [
    {
      categoryId: "actions",
      label: "Actions",
      amount: amounts.actions ?? 0,
      nominalReturnPct: toNominal(ACTIONS_REAL_RETURN_PCT, inflationPct),
    },
    {
      categoryId: "obligations",
      label: "Obligations",
      amount: amounts.obligations ?? 0,
      nominalReturnPct: toNominal(OBLIGATIONS_REAL_RETURN_PCT, inflationPct),
    },
    {
      categoryId: "scpi",
      label: "SCPI",
      amount: amounts.scpi ?? 0,
      nominalReturnPct: toNominal(SCPI_REAL_RETURN_PCT, inflationPct),
    },
    {
      categoryId: "liquidites",
      label: "Liquidités",
      amount: amounts.liquidites ?? 0,
      nominalReturnPct: toNominal(LIQUIDITES_REAL_RETURN_PCT, inflationPct),
    },
    {
      categoryId: "private-equity",
      label: "Private Equity",
      amount: amounts["private-equity"] ?? 0,
      nominalReturnPct: PE_NOMINAL_RETURN_PCT,
    },
    {
      categoryId: "matieres-premieres",
      label: "Matières premières",
      amount: amounts["matieres-premieres"] ?? 0,
      nominalReturnPct: toNominal(MATIERES_PREMIERES_REAL_RETURN_PCT, inflationPct),
    },
    {
      categoryId: "outil-professionnel",
      label: "Entreprise / outil professionnel",
      amount: amounts["outil-professionnel"] ?? 0,
      nominalReturnPct: null,
    },
    {
      categoryId: "autres",
      label: "Autres",
      amount: amounts.autres ?? 0,
      nominalReturnPct: null,
    },
  ];

  const pockets = realEstatePockets(properties, immobilierValue, inflationPct);
  const immobilierAmount = pockets.reduce((sum, p) => sum + p.currentValue, 0);
  const immobilierBlendedRate =
    immobilierAmount > 0
      ? pockets.reduce((sum, p) => sum + p.currentValue * p.nominalReturnPct, 0) /
        immobilierAmount
      : 0;

  const breakdown: AssetClassGrowthRow[] = [
    ...financialBreakdown,
    {
      categoryId: "immobilier",
      label: "Immobilier",
      amount: immobilierAmount,
      nominalReturnPct: immobilierAmount > 0 ? immobilierBlendedRate : null,
    },
  ];

  const totalAmount = breakdown.reduce((sum, row) => sum + row.amount, 0);
  const blendedNominalReturnPct =
    totalAmount > 0
      ? breakdown.reduce((sum, row) => sum + row.amount * (row.nominalReturnPct ?? 0), 0) /
        totalAmount
      : 0;

  const points: ProjectionYearPoint[] = [];
  for (let year = 0; year <= horizonYears; year++) {
    let grossAssets = 0;

    for (const row of financialBreakdown) {
      if (row.nominalReturnPct === null) {
        grossAssets += row.amount;
      } else if (row.categoryId === "private-equity") {
        grossAssets +=
          row.amount * Math.pow(1 + row.nominalReturnPct / 100, year) * peDiscountFactor;
      } else {
        grossAssets += row.amount * Math.pow(1 + row.nominalReturnPct / 100, year);
      }
    }

    for (const pocket of pockets) {
      grossAssets += pocket.currentValue * Math.pow(1 + pocket.nominalReturnPct / 100, year);
    }

    const totalDebt = properties.reduce(
      (sum, property) =>
        sum +
        property.loans.reduce((loanSum, loan) => loanSum + projectLoanBalance(loan, year), 0),
      0
    );

    const netWorth = grossAssets - totalDebt;
    const deflator = Math.pow(1 + inflationPct / 100, year);
    points.push({ year, netWorth, realNetWorth: netWorth / deflator, totalDebt });
  }

  const finalNetWorth = points[points.length - 1].netWorth;
  const gapAmount = finalNetWorth - targetAmount;

  return {
    points,
    blendedNominalReturnPct,
    breakdown,
    targetAmount,
    horizonYears,
    finalNetWorth,
    isGoalReached: gapAmount >= 0,
    gapAmount,
  };
}
