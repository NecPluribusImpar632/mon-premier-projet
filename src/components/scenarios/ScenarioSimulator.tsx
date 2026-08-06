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

const OPTIONAL_CARD_IDS = [
  "actions",
  "realEstate",
  "scpi",
  "obligations",
  "privateEquity",
  "vacancy",
] as const;
type OptionalCardId = (typeof OPTIONAL_CARD_IDS)[number];

const CARD_LABELS: Record<OptionalCardId, string> = {
  actions: "Choc actions",
  realEstate: "Choc immobilier",
  scpi: "Choc SCPI",
  obligations: "Choc obligataire",
  privateEquity: "Décote d'illiquidité Private Equity",
  vacancy: "Vacance locative prolongée",
};

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
  // Vacancy and PE illiquidity start neutral (0) rather than a "sensible
  // default" — those cards are hidden until added, and a nonzero default
  // would silently feed the combined banner before the user ever opens them.
  // The sensible starting value (3 months / 20%) is applied at add-time
  // instead, in addCard() below.
  const [vacancyMonths, setVacancyMonths] = useState(0);
  const [obligationsDurationYears, setObligationsDurationYears] = useState(6);
  const [peIlliquidityDiscountPct, setPeIlliquidityDiscountPct] = useState(0);
  const [addedCardIds, setAddedCardIds] = useState<Set<OptionalCardId>>(new Set());
  const [isAddCardMenuOpen, setIsAddCardMenuOpen] = useState(false);

  function markCustom() {
    // Leaving a named preset must not hide the cards it was showing — freeze
    // them into addedCardIds first, so switching to "Personnalisé" swaps
    // *why* they're visible without making them disappear mid-edit.
    setAddedCardIds((prev) => {
      const next = new Set(prev);
      OPTIONAL_CARD_IDS.forEach((id) => {
        if (presetTouchesCard[id]) next.add(id);
      });
      return next;
    });
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

  // Adjusting a preset-revealed card's own control is treated as a manual
  // customization: it keeps the card visible (and removable) even after the
  // preset selection moves on to "Personnalisé", instead of having it vanish
  // mid-edit once presetTouchesCard stops covering it.
  function addCard(id: OptionalCardId) {
    setAddedCardIds((prev) => new Set(prev).add(id));
    if (id === "privateEquity") setPeIlliquidityDiscountPct(20);
    if (id === "vacancy") setVacancyMonths(3);
  }

  function removeCard(id: OptionalCardId) {
    setAddedCardIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (id === "actions") setMarketShockPct(0);
    if (id === "scpi") setScpiShockPct(0);
    if (id === "privateEquity") setPeIlliquidityDiscountPct(0);
    if (id === "vacancy") setVacancyMonths(0);
    if (id === "obligations") setObligationsDurationYears(0);
    // oatRateChangePts is shared with the Obligations card's own shock —
    // only neutralize it if nothing else currently depends on it.
    if (id === "realEstate" && !isCardVisible("obligations")) setOatRateChangePts(0);
  }

  function handleMarketShockChange(value: number) {
    setMarketShockPct(value);
    markCustom();
    setAddedCardIds((prev) => new Set(prev).add("actions"));
  }

  function handleOatRateChangePts(value: number) {
    setOatRateChangePts(value);
    markCustom();
    setAddedCardIds((prev) => new Set(prev).add("realEstate"));
  }

  function handleScpiShockChange(value: number) {
    setScpiShockPct(value);
    markCustom();
    setAddedCardIds((prev) => new Set(prev).add("scpi"));
  }

  function handleInflationChange(value: number) {
    setInflationPct(value);
    markCustom();
  }

  function handleObligationsDurationChange(value: number) {
    setObligationsDurationYears(value);
    markCustom();
    setAddedCardIds((prev) => new Set(prev).add("obligations"));
  }

  function handlePeIlliquidityDiscountChange(value: number) {
    setPeIlliquidityDiscountPct(value);
    markCustom();
    setAddedCardIds((prev) => new Set(prev).add("privateEquity"));
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

  // A card is only ever offerable if the client actually holds the
  // corresponding asset — no point in a card that just says "aucune
  // allocation définie". Inflation and the projection stay unconditional
  // (useful regardless of allocation), so they sit outside this system.
  const cardRelevance: Record<OptionalCardId, boolean> = {
    actions: actionsPctOverall > 0,
    realEstate: properties.length > 0,
    scpi: scpiAmount > 0,
    obligations: obligationsAmount > 0,
    privateEquity: privateEquityAmount > 0,
    vacancy: properties.some((property) => property.monthlyRent !== null),
  };

  // Beyond being relevant, a card only shows by default when the currently
  // selected named preset actually drives it (2008/Choc pétrolier/Remontée
  // des taux all set marketShockPct and oatRateChangePts). SCPI, PE and
  // vacancy have no preset field, so they always require a manual add.
  const activePreset =
    SCENARIO_PRESETS.find((preset) => preset.id === selectedPresetId) ?? CUSTOM_PRESET;
  const presetTouchesCard: Record<OptionalCardId, boolean> = {
    actions: activePreset.id !== CUSTOM_PRESET_ID && activePreset.marketShockPct !== 0,
    realEstate: activePreset.id !== CUSTOM_PRESET_ID && activePreset.oatRateChangePts !== 0,
    obligations: activePreset.id !== CUSTOM_PRESET_ID && activePreset.oatRateChangePts !== 0,
    scpi: false,
    privateEquity: false,
    vacancy: false,
  };

  function isCardVisible(id: OptionalCardId) {
    return cardRelevance[id] && (addedCardIds.has(id) || presetTouchesCard[id]);
  }

  const hiddenCardIds = OPTIONAL_CARD_IDS.filter(
    (id) => cardRelevance[id] && !isCardVisible(id)
  );

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-slate">
        Testez l&apos;impact de différents chocs de marché sur le patrimoine du
        client, seuls ou combinés, pour anticiper les risques et en discuter en
        rendez-vous.
      </p>

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
        {isCardVisible("actions") && (
          <StockShockCard
            actionsPct={actionsPctOverall}
            actionsBreakdown={actionsBreakdown}
            marketShockPct={marketShockPct}
            onMarketShockPctChange={handleMarketShockChange}
            onRemove={addedCardIds.has("actions") ? () => removeCard("actions") : undefined}
          />
        )}
        {isCardVisible("realEstate") && (
          <RealEstateShockCard
            properties={properties}
            oatRateChangePts={oatRateChangePts}
            onOatRateChangePtsChange={handleOatRateChangePts}
            onRemove={addedCardIds.has("realEstate") ? () => removeCard("realEstate") : undefined}
          />
        )}
        {isCardVisible("scpi") && (
          <ScpiShockCard
            scpiAmount={scpiAmount}
            shockPct={scpiShockPct}
            onShockPctChange={handleScpiShockChange}
            onRemove={addedCardIds.has("scpi") ? () => removeCard("scpi") : undefined}
          />
        )}
        {isCardVisible("obligations") && (
          <ObligationsShockCard
            obligationsAmount={obligationsAmount}
            oatRateChangePts={oatRateChangePts}
            durationYears={obligationsDurationYears}
            onDurationYearsChange={handleObligationsDurationChange}
            onRemove={addedCardIds.has("obligations") ? () => removeCard("obligations") : undefined}
          />
        )}
        {isCardVisible("privateEquity") && (
          <PrivateEquityIlliquidityCard
            privateEquityAmount={privateEquityAmount}
            discountPct={peIlliquidityDiscountPct}
            onDiscountPctChange={handlePeIlliquidityDiscountChange}
            onRemove={
              addedCardIds.has("privateEquity") ? () => removeCard("privateEquity") : undefined
            }
          />
        )}
        <InflationScenarioCard
          properties={properties}
          inflationPct={inflationPct}
          onInflationPctChange={handleInflationChange}
          years={inflationYears}
          onYearsChange={setInflationYears}
        />
        {isCardVisible("vacancy") && (
          <VacancyCard
            properties={properties}
            propertyId={vacancyPropertyId}
            onPropertyIdChange={setVacancyPropertyId}
            months={vacancyMonths}
            onMonthsChange={setVacancyMonths}
            onRemove={addedCardIds.has("vacancy") ? () => removeCard("vacancy") : undefined}
          />
        )}
      </div>

      {hiddenCardIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {isAddCardMenuOpen ? (
            <>
              {hiddenCardIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => addCard(id)}
                  className="rounded-full border border-line px-4 py-2 text-sm font-medium text-slate transition-colors hover:border-emerald hover:text-emerald"
                >
                  + {CARD_LABELS[id]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsAddCardMenuOpen(false)}
                className="text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
              >
                Fermer
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddCardMenuOpen(true)}
              className="w-fit rounded-full border border-dashed border-line px-4 py-2 text-sm font-medium text-slate transition-colors hover:border-emerald hover:text-emerald"
            >
              + Ajouter un choc
            </button>
          )}
        </div>
      )}

      <ProjectionCard context={context} params={currentParams} />
    </div>
  );
}
