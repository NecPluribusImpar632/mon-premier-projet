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
