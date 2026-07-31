import type { Property } from "@/generated/prisma/client";
import type { ActionsProfileBreakdown } from "@/lib/allocation/stockProfiles";
import { StockShockCard } from "@/components/scenarios/StockShockCard";
import { RealEstateShockCard } from "@/components/scenarios/RealEstateShockCard";
import { RateHikeShockCard } from "@/components/scenarios/RateHikeShockCard";
import { InflationScenarioCard } from "@/components/scenarios/InflationScenarioCard";
import { VacancyCard } from "@/components/scenarios/VacancyCard";

interface ScenarioSimulatorProps {
  actionsPct: number;
  actionsBreakdown: ActionsProfileBreakdown;
  properties: Property[];
}

export function ScenarioSimulator({
  actionsPct,
  actionsBreakdown,
  properties,
}: ScenarioSimulatorProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <StockShockCard actionsPct={actionsPct} actionsBreakdown={actionsBreakdown} />
      <RealEstateShockCard properties={properties} />
      <RateHikeShockCard properties={properties} />
      <InflationScenarioCard properties={properties} />
      <div className="md:col-span-2">
        <VacancyCard properties={properties} />
      </div>
    </div>
  );
}
