import { notFound } from "next/navigation";
import { getClient } from "@/lib/actions/clients";
import { getSavedScenarios } from "@/lib/actions/scenarios";
import { amountsFromClient, overallEntriesFromAmounts } from "@/lib/allocation/mapping";
import { ScenarioSimulator } from "@/components/scenarios/ScenarioSimulator";
import { buildClientScenarioContext } from "@/lib/scenarios/clientContext";

interface ScenariosPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScenariosPage({ params }: ScenariosPageProps) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const context = buildClientScenarioContext(client);
  const overallEntries = overallEntriesFromAmounts(amountsFromClient(client), client.properties);
  const actionsPctOverall =
    overallEntries.find((entry) => entry.categoryId === "actions")?.percentage ?? 0;
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
          initialSavedScenarios={savedScenarios}
          {...context}
        />
      </div>
    </div>
  );
}
