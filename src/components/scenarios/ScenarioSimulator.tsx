"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, GitCompare } from "lucide-react";
import type { SavedScenario } from "@/generated/prisma/client";
import type { ActionsProfileBreakdown } from "@/lib/allocation/stockProfiles";
import type { PropertyWithSensitivity } from "@/lib/scenarios/resolvePropertySensitivity";
import {
  computeFullScenarioImpact,
  type ClientScenarioContext,
} from "@/lib/scenarios/calculations";
import {
  SCENARIO_PRESETS,
  CUSTOM_PRESET_ID,
  type ScenarioPreset,
} from "@/lib/scenarios/presets";
import {
  scenarioParamsFromSavedScenario,
  scenarioParamsToSearchParams,
  type ScenarioParams,
} from "@/lib/scenarios/scenarioParams";
import {
  createSavedScenario,
  deleteSavedScenario,
} from "@/lib/actions/scenarios";
import { ScenarioPresetTabs } from "@/components/scenarios/ScenarioPresetTabs";
import { SavedScenarioTabs } from "@/components/scenarios/SavedScenarioTabs";
import { CombinedImpactBanner } from "@/components/scenarios/CombinedImpactBanner";
import { StockShockCard } from "@/components/scenarios/StockShockCard";
import { RealEstateShockCard } from "@/components/scenarios/RealEstateShockCard";
import { ScpiShockCard } from "@/components/scenarios/ScpiShockCard";
import { ObligationsShockCard } from "@/components/scenarios/ObligationsShockCard";
import { PrivateEquityIlliquidityCard } from "@/components/scenarios/PrivateEquityIlliquidityCard";
import { InflationScenarioCard } from "@/components/scenarios/InflationScenarioCard";
import { VacancyCard } from "@/components/scenarios/VacancyCard";
import { ProjectionCard } from "@/components/scenarios/ProjectionCard";

interface ScenarioSimulatorProps {
  clientId: string;
  actionsPctOverall: number;
  actionsPctWithinFinancial: number;
  financialWealthTotal: number;
  scpiAmount: number;
  obligationsAmount: number;
  privateEquityAmount: number;
  immobilierValue: number;
  actionsBreakdown: ActionsProfileBreakdown;
  properties: PropertyWithSensitivity[];
  initialSavedScenarios: SavedScenario[];
}

const CUSTOM_PRESET =
  SCENARIO_PRESETS.find((preset) => preset.id === CUSTOM_PRESET_ID) ??
  SCENARIO_PRESETS[0];

export function ScenarioSimulator({
  clientId,
  actionsPctOverall,
  actionsPctWithinFinancial,
  financialWealthTotal,
  scpiAmount,
  obligationsAmount,
  privateEquityAmount,
  immobilierValue,
  actionsBreakdown,
  properties,
  initialSavedScenarios,
}: ScenarioSimulatorProps) {
  const [savedScenarios, setSavedScenarios] = useState(initialSavedScenarios);
  const [selectedPresetId, setSelectedPresetId] = useState(CUSTOM_PRESET.id);
  const [selectedSavedScenarioId, setSelectedSavedScenarioId] = useState<string | null>(
    null
  );
  const [marketShockPct, setMarketShockPct] = useState(CUSTOM_PRESET.marketShockPct);
  const [oatRateChangePts, setOatRateChangePts] = useState(
    CUSTOM_PRESET.oatRateChangePts
  );
  const [scpiShockPct, setScpiShockPct] = useState(0);
  const [inflationPct, setInflationPct] = useState(CUSTOM_PRESET.inflationPct);
  const [inflationYears, setInflationYears] = useState(5);
  const [vacancyPropertyId, setVacancyPropertyId] = useState(properties[0]?.id ?? "");
  const [vacancyMonths, setVacancyMonths] = useState(3);
  const [obligationsDurationYears, setObligationsDurationYears] = useState(6);
  const [peIlliquidityDiscountPct, setPeIlliquidityDiscountPct] = useState(20);

  function markCustom() {
    setSelectedPresetId(CUSTOM_PRESET_ID);
    setSelectedSavedScenarioId(null);
  }

  function applyPreset(preset: ScenarioPreset) {
    setSelectedPresetId(preset.id);
    setSelectedSavedScenarioId(null);
    setMarketShockPct(preset.marketShockPct);
    setOatRateChangePts(preset.oatRateChangePts);
    setInflationPct(preset.inflationPct);
  }

  function applySavedScenario(scenario: SavedScenario) {
    const p = scenarioParamsFromSavedScenario(scenario);
    setMarketShockPct(p.marketShockPct);
    setOatRateChangePts(p.oatRateChangePts);
    setScpiShockPct(p.scpiShockPct);
    setInflationPct(p.inflationPct);
    setInflationYears(p.inflationYears);
    setVacancyPropertyId(p.vacancyPropertyId ?? "");
    setVacancyMonths(p.vacancyMonths);
    setObligationsDurationYears(p.obligationsDurationYears);
    setPeIlliquidityDiscountPct(p.peIlliquidityDiscountPct);
    setSelectedPresetId(CUSTOM_PRESET_ID);
    setSelectedSavedScenarioId(scenario.id);
  }

  async function handleSaveScenario(name: string) {
    const created = await createSavedScenario(clientId, name, currentParams);
    setSavedScenarios((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "fr"))
    );
  }

  async function handleDeleteScenario(id: string) {
    await deleteSavedScenario(id, clientId);
    setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
    setSelectedSavedScenarioId((current) => (current === id ? null : current));
  }

  function handleMarketShockChange(value: number) {
    setMarketShockPct(value);
    markCustom();
  }

  function handleOatRateChangePts(value: number) {
    setOatRateChangePts(value);
    markCustom();
  }

  function handleScpiShockChange(value: number) {
    setScpiShockPct(value);
    markCustom();
  }

  function handleInflationChange(value: number) {
    setInflationPct(value);
    markCustom();
  }

  function handleObligationsDurationChange(value: number) {
    setObligationsDurationYears(value);
    markCustom();
  }

  function handlePeIlliquidityDiscountChange(value: number) {
    setPeIlliquidityDiscountPct(value);
    markCustom();
  }

  const context: ClientScenarioContext = {
    financialWealthTotal,
    actionsPctWithinFinancial,
    actionsBreakdown,
    properties,
    immobilierValue,
    scpiAmount,
    obligationsAmount,
    privateEquityAmount,
  };

  const currentParams: ScenarioParams = {
    marketShockPct,
    oatRateChangePts,
    scpiShockPct,
    inflationPct,
    inflationYears,
    vacancyPropertyId,
    vacancyMonths,
    obligationsDurationYears,
    peIlliquidityDiscountPct,
  };

  const combinedImpact = computeFullScenarioImpact(context, currentParams);

  const activeScenarioLabel = selectedSavedScenarioId
    ? savedScenarios.find((s) => s.id === selectedSavedScenarioId)?.name ??
      "Scénario personnalisé"
    : SCENARIO_PRESETS.find((p) => p.id === selectedPresetId)?.label ??
      "Scénario personnalisé";

  const pdfSearchParams = scenarioParamsToSearchParams(currentParams);
  pdfSearchParams.set("scenarioLabel", activeScenarioLabel);
  const pdfHref = `/clients/${clientId}/scenarios/pdf?${pdfSearchParams.toString()}`;

  return (
    <div className="flex flex-col gap-8">
      <CombinedImpactBanner result={combinedImpact} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <ScenarioPresetTabs
            presets={SCENARIO_PRESETS}
            selectedId={selectedPresetId}
            onSelect={applyPreset}
          />
          <SavedScenarioTabs
            savedScenarios={savedScenarios}
            selectedId={selectedSavedScenarioId}
            onSelect={applySavedScenario}
            onSave={handleSaveScenario}
            onDelete={handleDeleteScenario}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={pdfHref}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-slate transition-colors hover:border-emerald hover:text-emerald"
          >
            <Download className="h-4 w-4" />
            Exporter le rapport en PDF
          </a>
          <Link
            href={`/clients/${clientId}/scenarios/compare`}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-slate transition-colors hover:border-emerald hover:text-emerald"
          >
            <GitCompare className="h-4 w-4" />
            Comparer deux scénarios
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <StockShockCard
          actionsPct={actionsPctOverall}
          actionsBreakdown={actionsBreakdown}
          marketShockPct={marketShockPct}
          onMarketShockPctChange={handleMarketShockChange}
        />
        <RealEstateShockCard
          properties={properties}
          oatRateChangePts={oatRateChangePts}
          onOatRateChangePtsChange={handleOatRateChangePts}
        />
        <ScpiShockCard
          scpiAmount={scpiAmount}
          shockPct={scpiShockPct}
          onShockPctChange={handleScpiShockChange}
        />
        <ObligationsShockCard
          obligationsAmount={obligationsAmount}
          oatRateChangePts={oatRateChangePts}
          durationYears={obligationsDurationYears}
          onDurationYearsChange={handleObligationsDurationChange}
        />
        <PrivateEquityIlliquidityCard
          privateEquityAmount={privateEquityAmount}
          discountPct={peIlliquidityDiscountPct}
          onDiscountPctChange={handlePeIlliquidityDiscountChange}
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

      <ProjectionCard context={context} params={currentParams} />
    </div>
  );
}
