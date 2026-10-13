export interface ScenarioPreset {
  id: string;
  label: string;
  marketShockPct: number;
  oatRateChangePts: number;
  inflationPct: number;
}

// oatRateChangePts est calibré pour reproduire approximativement l'ancien effet prix
// national (via le coefficient national de -2,05 %/point, voir realEstateSensitivity.ts) —
// pas une reconstitution historique exacte du taux OAT de chaque crise (2008 a par
// exemple vu les taux baisser dans les faits ; la modélisation mono-facteur "taux" ne
// capture pas un choc de crédit). Simplification pédagogique assumée.
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "2008",
    label: "Crise 2008",
    marketShockPct: -40,
    oatRateChangePts: 7,
    inflationPct: 0,
  },
  {
    id: "oil-shock",
    label: "Inflation et remontée brutale des taux",
    marketShockPct: -15,
    oatRateChangePts: 2.5,
    inflationPct: 6,
  },
  {
    id: "rate-rise",
    label: "Remontée des taux",
    marketShockPct: -10,
    oatRateChangePts: 4,
    inflationPct: 3,
  },
  {
    id: "custom",
    label: "Personnalisé",
    marketShockPct: 0,
    oatRateChangePts: 0,
    inflationPct: 0,
  },
];

export const CUSTOM_PRESET_ID = "custom";
