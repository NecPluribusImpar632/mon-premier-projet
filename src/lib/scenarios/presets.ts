export interface ScenarioPreset {
  id: string;
  label: string;
  marketShockPct: number;
  realEstateShockPct: number;
  inflationPct: number;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "2008",
    label: "Crise 2008",
    marketShockPct: -40,
    realEstateShockPct: -15,
    inflationPct: 0,
  },
  {
    id: "oil-shock",
    label: "Choc pétrolier / inflation durable",
    marketShockPct: -15,
    realEstateShockPct: -5,
    inflationPct: 6,
  },
  {
    id: "rate-rise",
    label: "Remontée des taux",
    marketShockPct: -10,
    realEstateShockPct: -8,
    inflationPct: 3,
  },
  {
    id: "custom",
    label: "Personnalisé",
    marketShockPct: 0,
    realEstateShockPct: 0,
    inflationPct: 0,
  },
];

export const CUSTOM_PRESET_ID = "custom";
