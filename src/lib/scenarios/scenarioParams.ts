import type { SavedScenario } from "@/generated/prisma/client";
import type { ScenarioPreset } from "@/lib/scenarios/presets";

export interface ScenarioParams {
  marketShockPct: number;
  oatRateChangePts: number;
  scpiShockPct: number;
  inflationPct: number;
  inflationYears: number;
  vacancyPropertyId: string | null;
  vacancyMonths: number;
  obligationsDurationYears: number;
  peIlliquidityDiscountPct: number;
}

// Durée obligataire (6 ans) et décote PE (20%) sont des hypothèses de départ
// raisonnables mais arbitraires — ajustables via curseur, signalées comme telles
// dans l'InfoTooltip de chaque carte (l'app ne connaît pas les maturités réelles
// des titres obligataires ni les conditions du marché secondaire du client).
export const DEFAULT_SCENARIO_PARAMS: ScenarioParams = {
  marketShockPct: 0,
  oatRateChangePts: 0,
  scpiShockPct: 0,
  inflationPct: 0,
  inflationYears: 5,
  vacancyPropertyId: null,
  vacancyMonths: 3,
  obligationsDurationYears: 6,
  peIlliquidityDiscountPct: 20,
};

export function scenarioParamsFromPreset(preset: ScenarioPreset): ScenarioParams {
  return {
    ...DEFAULT_SCENARIO_PARAMS,
    marketShockPct: preset.marketShockPct,
    oatRateChangePts: preset.oatRateChangePts,
    inflationPct: preset.inflationPct,
  };
}

export function scenarioParamsFromSavedScenario(saved: SavedScenario): ScenarioParams {
  return {
    marketShockPct: saved.marketShockPct,
    oatRateChangePts: saved.oatRateChangePts,
    scpiShockPct: saved.scpiShockPct,
    inflationPct: saved.inflationPct,
    inflationYears: saved.inflationYears,
    vacancyPropertyId: saved.vacancyPropertyId,
    vacancyMonths: saved.vacancyMonths,
    obligationsDurationYears: saved.obligationsDurationYears,
    peIlliquidityDiscountPct: saved.peIlliquidityDiscountPct,
  };
}

/** Serializes the simulator's live state into URL query params, for the "Exporter
 * le rapport en PDF" link — the PDF route has no other way to know which scenario
 * (preset, saved, or freely tweaked) is currently on screen. */
export function scenarioParamsToSearchParams(params: ScenarioParams): URLSearchParams {
  return new URLSearchParams({
    marketShockPct: String(params.marketShockPct),
    oatRateChangePts: String(params.oatRateChangePts),
    scpiShockPct: String(params.scpiShockPct),
    inflationPct: String(params.inflationPct),
    inflationYears: String(params.inflationYears),
    vacancyPropertyId: params.vacancyPropertyId ?? "",
    vacancyMonths: String(params.vacancyMonths),
    obligationsDurationYears: String(params.obligationsDurationYears),
    peIlliquidityDiscountPct: String(params.peIlliquidityDiscountPct),
  });
}

export function scenarioParamsFromSearchParams(
  searchParams: URLSearchParams
): ScenarioParams {
  const num = (key: string, fallback: number) => {
    const parsed = Number(searchParams.get(key));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const vacancyPropertyId = searchParams.get("vacancyPropertyId");

  return {
    marketShockPct: num("marketShockPct", DEFAULT_SCENARIO_PARAMS.marketShockPct),
    oatRateChangePts: num("oatRateChangePts", DEFAULT_SCENARIO_PARAMS.oatRateChangePts),
    scpiShockPct: num("scpiShockPct", DEFAULT_SCENARIO_PARAMS.scpiShockPct),
    inflationPct: num("inflationPct", DEFAULT_SCENARIO_PARAMS.inflationPct),
    inflationYears: num("inflationYears", DEFAULT_SCENARIO_PARAMS.inflationYears),
    vacancyPropertyId: vacancyPropertyId ? vacancyPropertyId : null,
    vacancyMonths: num("vacancyMonths", DEFAULT_SCENARIO_PARAMS.vacancyMonths),
    obligationsDurationYears: num(
      "obligationsDurationYears",
      DEFAULT_SCENARIO_PARAMS.obligationsDurationYears
    ),
    peIlliquidityDiscountPct: num(
      "peIlliquidityDiscountPct",
      DEFAULT_SCENARIO_PARAMS.peIlliquidityDiscountPct
    ),
  };
}
