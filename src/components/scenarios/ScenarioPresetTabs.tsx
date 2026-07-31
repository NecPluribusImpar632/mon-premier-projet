import type { ScenarioPreset } from "@/lib/scenarios/presets";

interface ScenarioPresetTabsProps {
  presets: ScenarioPreset[];
  selectedId: string;
  onSelect: (preset: ScenarioPreset) => void;
}

export function ScenarioPresetTabs({
  presets,
  selectedId,
  onSelect,
}: ScenarioPresetTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            selectedId === preset.id
              ? "border-emerald bg-emerald-tint text-emerald-strong"
              : "border-line bg-surface text-slate hover:text-ink"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
