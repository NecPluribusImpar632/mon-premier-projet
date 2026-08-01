"use client";

import { useState } from "react";
import type { Property } from "@/generated/prisma/client";
import type { ActionsProfileBreakdown } from "@/lib/allocation/stockProfiles";
import {
  computeCombinedNetWorthImpact,
  computeScpiShockImpact,
} from "@/lib/scenarios/calculations";
import {
  SCENARIO_PRESETS,
  CUSTOM_PRESET_ID,
  type ScenarioPreset,
} from "@/lib/scenarios/presets";
import { ScenarioPresetTabs } from "@/components/scenarios/ScenarioPresetTabs";
import { CombinedImpactBanner } from "@/components/scenarios/CombinedImpactBanner";
import { StockShockCard } from "@/components/scenarios/StockShockCard";
import { RealEstateShockCard } from "@/components/scenarios/RealEstateShockCard";
import { ScpiShockCard } from "@/components/scenarios/ScpiShockCard";
import { InflationScenarioCard } from "@/components/scenarios/InflationScenarioCard";
import { VacancyCard } from "@/components/scenarios/VacancyCard";

interface ScenarioSimulatorProps {
  actionsPctOverall: number;
  actionsPctWithinFinancial: number;
  financialWealthTotal: number;
  scpiAmount: number;
  immobilierValue: number;
  actionsBreakdown: ActionsProfileBreakdown;
  properties: Property[];
}

const CUSTOM_PRESET =
  SCENARIO_PRESETS.find((preset) => preset.id === CUSTOM_PRESET_ID) ??
  SCENARIO_PRESETS[0];

export function ScenarioSimulator({
  actionsPctOverall,
  actionsPctWithinFinancial,
  financialWealthTotal,
  scpiAmount,
  immobilierValue,
  actionsBreakdown,
  properties,
}: ScenarioSimulatorProps) {
  const [selectedPresetId, setSelectedPresetId] = useState(CUSTOM_PRESET.id);
  const [marketShockPct, setMarketShockPct] = useState(
    CUSTOM_PRESET.marketShockPct
  );
  const [realEstateShockPct, setRealEstateShockPct] = useState(
    CUSTOM_PRESET.realEstateShockPct
  );
  const [scpiShockPct, setScpiShockPct] = useState(0);
  const [inflationPct, setInflationPct] = useState(CUSTOM_PRESET.inflationPct);
  const [inflationYears, setInflationYears] = useState(5);
  const [vacancyPropertyId, setVacancyPropertyId] = useState(
    properties[0]?.id ?? ""
  );
  const [vacancyMonths, setVacancyMonths] = useState(3);

  function applyPreset(preset: ScenarioPreset) {
    setSelectedPresetId(preset.id);
    setMarketShockPct(preset.marketShockPct);
    setRealEstateShockPct(preset.realEstateShockPct);
    setInflationPct(preset.inflationPct);
  }

  function handleMarketShockChange(value: number) {
    setMarketShockPct(value);
    setSelectedPresetId(CUSTOM_PRESET_ID);
  }

  function handleRealEstateShockChange(value: number) {
    setRealEstateShockPct(value);
    setSelectedPresetId(CUSTOM_PRESET_ID);
  }

  function handleScpiShockChange(value: number) {
    setScpiShockPct(value);
    setSelectedPresetId(CUSTOM_PRESET_ID);
  }

  function handleInflationChange(value: number) {
    setInflationPct(value);
    setSelectedPresetId(CUSTOM_PRESET_ID);
  }

  const baseImpact = computeCombinedNetWorthImpact({
    financialWealthTotal,
    actionsPctWithinFinancial,
    actionsBreakdown,
    marketShockPct,
    properties,
    realEstateShockPct,
    inflationPct,
    inflationYears,
    vacancyPropertyId,
    vacancyMonths,
  });

  // computeCombinedNetWorthImpact only knows about detailed properties. Fold
  // in what it can't see: the manual Immobilier amount when no property is
  // itemized (used as-is, unshocked — there's no per-property data to model
  // a price move against), and the SCPI shock on top of the flat SCPI amount
  // already counted inside financialWealthTotal.
  const immobilierBaseline = properties.length === 0 ? immobilierValue : 0;
  const scpiShock = computeScpiShockImpact(scpiAmount, scpiShockPct);
  const totalBefore = baseImpact.totalBefore + immobilierBaseline;
  const totalAfter = baseImpact.totalAfter + immobilierBaseline + scpiShock.deltaValue;
  const deltaAmount = totalAfter - totalBefore;
  const combinedImpact = {
    totalBefore,
    totalAfter,
    deltaAmount,
    deltaPct: totalBefore !== 0 ? (deltaAmount / totalBefore) * 100 : 0,
  };

  return (
    <div className="flex flex-col gap-8">
      <CombinedImpactBanner result={combinedImpact} />

      <ScenarioPresetTabs
        presets={SCENARIO_PRESETS}
        selectedId={selectedPresetId}
        onSelect={applyPreset}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <StockShockCard
          actionsPct={actionsPctOverall}
          actionsBreakdown={actionsBreakdown}
          marketShockPct={marketShockPct}
          onMarketShockPctChange={handleMarketShockChange}
        />
        <RealEstateShockCard
          properties={properties}
          shockPct={realEstateShockPct}
          onShockPctChange={handleRealEstateShockChange}
        />
        <ScpiShockCard
          scpiAmount={scpiAmount}
          shockPct={scpiShockPct}
          onShockPctChange={handleScpiShockChange}
        />
        <InflationScenarioCard
          properties={properties}
          inflationPct={inflationPct}
          onInflationPctChange={handleInflationChange}
          years={inflationYears}
          onYearsChange={setInflationYears}
        />
        <VacancyCard
          properties={properties}
          propertyId={vacancyPropertyId}
          onPropertyIdChange={setVacancyPropertyId}
          months={vacancyMonths}
          onMonthsChange={setVacancyMonths}
        />
      </div>
    </div>
  );
}
