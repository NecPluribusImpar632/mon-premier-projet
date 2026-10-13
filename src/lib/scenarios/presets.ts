export interface ScenarioPreset {
  id: string;
  label: string;
  /** Generic equity shock, replaced by the per-index blend of
   * indexScenarioShocks.ts whenever the client's index breakdown is known. */
  marketShockPct: number;
  /** null = derived from the OAT move through each property's zone
   * sensitivity (realEstateSensitivity.ts). A number applies the same shock
   * to every property, regardless of zone. */
  realEstateShockPct: number | null;
  /** null = derived from the OAT move through the bond duration. */
  obligationsShockPct: number | null;
  scpiShockPct: number;
  oatRateChangePts: number;
  inflationPct: number;
}

// Each named preset fixes its shocks per poste from the reference year's own
// market data; the OAT move is the real one, it no longer back-solves a
// price effect. Where a preset leaves a shock null, the rate-derived
// mechanism (zone sensitivity, duration) applies, as in the custom mode.
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    // 2008: equities collapse, French prices dip, government bonds rally as
    // rates fall (OAT 10y about 2 points from the mid-2008 peak to the
    // 2009-2010 trough), SCPI barely move.
    id: "2008",
    label: "Crise 2008",
    marketShockPct: -40,
    realEstateShockPct: -8,
    obligationsShockPct: 8,
    scpiShockPct: -3,
    oatRateChangePts: -2,
    inflationPct: 0,
  },
  {
    // 2022: inflation surge and a sharp rate rise; real estate and bonds
    // follow the rate through their own mechanisms.
    id: "oil-shock",
    label: "Inflation et remontée brutale des taux",
    marketShockPct: -15,
    realEstateShockPct: null,
    obligationsShockPct: null,
    scpiShockPct: -12,
    oatRateChangePts: 3,
    inflationPct: 6,
  },
  {
    // 2018: a monetary tightening without an inflation shock.
    id: "rate-rise",
    label: "Remontée des taux",
    marketShockPct: -10,
    realEstateShockPct: null,
    obligationsShockPct: null,
    scpiShockPct: 0,
    oatRateChangePts: 1,
    inflationPct: 2,
  },
  {
    id: "custom",
    label: "Personnalisé",
    marketShockPct: 0,
    realEstateShockPct: null,
    obligationsShockPct: null,
    scpiShockPct: 0,
    oatRateChangePts: 0,
    inflationPct: 0,
  },
];

export const CUSTOM_PRESET_ID = "custom";
