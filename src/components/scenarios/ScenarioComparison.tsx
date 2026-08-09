"use client";

import { useState } from "react";
import type { SavedScenario } from "@/generated/prisma/client";
import { SCENARIO_PRESETS, type ScenarioPreset } from "@/lib/scenarios/presets";
import {
  scenarioParamsFromPreset,
  scenarioParamsFromSavedScenario,
  type ScenarioParams,
} from "@/lib/scenarios/scenarioParams";
import {
  computeFullScenarioImpact,
  type ClientScenarioContext,
  type FullScenarioResult,
} from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";

interface ScenarioComparisonProps {
  context: ClientScenarioContext;
  savedScenarios: SavedScenario[];
}

type ComparisonOption =
  | { kind: "preset"; preset: ScenarioPreset }
  | { kind: "saved"; saved: SavedScenario };

function optionKey(option: ComparisonOption): string {
  return option.kind === "preset" ? `preset:${option.preset.id}` : `saved:${option.saved.id}`;
}

function optionLabel(option: ComparisonOption): string {
  return option.kind === "preset" ? option.preset.label : option.saved.name;
}

function paramsForOption(option: ComparisonOption): ScenarioParams {
  return option.kind === "preset"
    ? scenarioParamsFromPreset(option.preset)
    : scenarioParamsFromSavedScenario(option.saved);
}

type BreakdownKey = keyof Pick<
  FullScenarioResult["breakdown"],
  | "realEstateDelta"
  | "stocksDelta"
  | "scpiDelta"
  | "obligationsDelta"
  | "peDelta"
  | "goldDelta"
  | "silverDelta"
  | "debtErosion"
  | "vacancyCost"
>;

const BREAKDOWN_ROWS: { key: BreakdownKey; label: string; invert?: boolean }[] = [
  { key: "realEstateDelta", label: "Immobilier" },
  { key: "stocksDelta", label: "Actions" },
  { key: "scpiDelta", label: "SCPI" },
  { key: "obligationsDelta", label: "Obligations" },
  { key: "peDelta", label: "Private Equity" },
  { key: "goldDelta", label: "Or" },
  { key: "silverDelta", label: "Argent" },
  { key: "debtErosion", label: "Érosion de la dette (inflation)" },
  { key: "vacancyCost", label: "Vacance locative", invert: true },
];

export function ScenarioComparison({ context, savedScenarios }: ScenarioComparisonProps) {
  const options: ComparisonOption[] = [
    ...SCENARIO_PRESETS.map((preset) => ({ kind: "preset" as const, preset })),
    ...savedScenarios.map((saved) => ({ kind: "saved" as const, saved })),
  ];

  const [keyA, setKeyA] = useState(optionKey(options[0]));
  const [keyB, setKeyB] = useState(optionKey(options[2] ?? options[0]));

  const optionA = options.find((o) => optionKey(o) === keyA) ?? options[0];
  const optionB = options.find((o) => optionKey(o) === keyB) ?? options[0];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <ComparisonColumn
        context={context}
        options={options}
        selectedKey={keyA}
        onSelectKey={setKeyA}
        option={optionA}
      />
      <ComparisonColumn
        context={context}
        options={options}
        selectedKey={keyB}
        onSelectKey={setKeyB}
        option={optionB}
      />
    </div>
  );
}

interface ComparisonColumnProps {
  context: ClientScenarioContext;
  options: ComparisonOption[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
  option: ComparisonOption;
}

function ComparisonColumn({
  context,
  options,
  selectedKey,
  onSelectKey,
  option,
}: ComparisonColumnProps) {
  const presets = options.filter(
    (o): o is Extract<ComparisonOption, { kind: "preset" }> => o.kind === "preset"
  );
  const saved = options.filter(
    (o): o is Extract<ComparisonOption, { kind: "saved" }> => o.kind === "saved"
  );

  const result = computeFullScenarioImpact(context, paramsForOption(option));
  const isNegative = result.deltaAmount < 0;

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <select
        value={selectedKey}
        onChange={(e) => onSelectKey(e.target.value)}
        className={`w-full ${FIELD_CLASS}`}
      >
        <optgroup label="Préréglages">
          {presets.map((o) => (
            <option key={optionKey(o)} value={optionKey(o)}>
              {optionLabel(o)}
            </option>
          ))}
        </optgroup>
        {saved.length > 0 && (
          <optgroup label="Mes scénarios">
            {saved.map((o) => (
              <option key={optionKey(o)} value={optionKey(o)}>
                {optionLabel(o)}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      <div className="mt-5 flex flex-col gap-1 border-t border-line pt-4 text-sm">
        <p className="flex items-center justify-between text-ink">
          <span>Patrimoine net avant</span>
          <span className="font-mono tabular-nums">{formatCurrency(result.totalBefore)}</span>
        </p>
        <p className="flex items-center justify-between text-ink">
          <span>Patrimoine net après</span>
          <span className="font-mono tabular-nums">{formatCurrency(result.totalAfter)}</span>
        </p>
        <p className="flex items-center justify-between">
          <span className="text-ink">Variation</span>
          <span
            className={`font-mono tabular-nums ${
              isNegative ? "text-bronze" : "text-emerald-strong"
            }`}
          >
            {isNegative ? "" : "+"}
            {formatCurrency(result.deltaAmount)} ({isNegative ? "" : "+"}
            {result.deltaPct.toFixed(1)}%)
          </span>
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-1 border-t border-line pt-4 text-xs">
        {BREAKDOWN_ROWS.map(({ key, label, invert }) => {
          const raw = result.breakdown[key];
          const value = invert ? -raw : raw;
          if (value === 0) return null;
          return (
            <p key={key} className="flex items-center justify-between text-slate">
              <span>{label}</span>
              <span
                className={`font-mono tabular-nums ${
                  value < 0 ? "text-bronze" : "text-emerald-strong"
                }`}
              >
                {value >= 0 ? "+" : ""}
                {formatCurrency(value)}
              </span>
            </p>
          );
        })}
      </div>
    </div>
  );
}
