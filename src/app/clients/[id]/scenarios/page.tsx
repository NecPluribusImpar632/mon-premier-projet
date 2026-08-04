import { notFound } from "next/navigation";
import { getClient } from "@/lib/actions/clients";
import { getSavedScenarios } from "@/lib/actions/scenarios";
import {
  actionsBreakdownFromClient,
  amountsFromClient,
  effectiveImmobilierAmount,
  financialTotalFromAmounts,
  overallEntriesFromAmounts,
} from "@/lib/allocation/mapping";
import { ScenarioSimulator } from "@/components/scenarios/ScenarioSimulator";
import { withResolvedSensitivity } from "@/lib/scenarios/resolvePropertySensitivity";

interface ScenariosPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScenariosPage({ params }: ScenariosPageProps) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const amounts = amountsFromClient(client);
  const overallEntries = overallEntriesFromAmounts(amounts, client.properties);
  const financialWealthTotal = financialTotalFromAmounts(amounts);
  const immobilierValue = effectiveImmobilierAmount(
    amounts.immobilier ?? 0,
    client.properties
  );

  const actionsPctOverall =
    overallEntries.find((entry) => entry.categoryId === "actions")?.percentage ??
    0;
  const actionsPctWithinFinancial =
    financialWealthTotal > 0
      ? ((amounts.actions ?? 0) / financialWealthTotal) * 100
      : 0;

  const propertiesWithSensitivity = withResolvedSensitivity(client.properties);
  const savedScenarios = await getSavedScenarios(id);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-14 sm:py-20">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
          Simulateur de scénarios
        </h1>
        <p className="mt-1 text-sm text-slate">Pour {client.name}</p>
      </div>

      <div className="mt-10">
        <ScenarioSimulator
          clientId={id}
          actionsPctOverall={actionsPctOverall}
          actionsPctWithinFinancial={actionsPctWithinFinancial}
          financialWealthTotal={financialWealthTotal}
          scpiAmount={amounts.scpi ?? 0}
          obligationsAmount={amounts.obligations ?? 0}
          privateEquityAmount={amounts["private-equity"] ?? 0}
          immobilierValue={immobilierValue}
          actionsBreakdown={actionsBreakdownFromClient(client)}
          properties={propertiesWithSensitivity}
          initialSavedScenarios={savedScenarios}
        />
      </div>
    </div>
  );
}
