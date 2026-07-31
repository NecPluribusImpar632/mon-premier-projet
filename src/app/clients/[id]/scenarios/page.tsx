import { notFound } from "next/navigation";
import { getClient } from "@/lib/actions/clients";
import { actionsBreakdownFromClient, entriesFromClient } from "@/lib/allocation/mapping";
import { ScenarioSimulator } from "@/components/scenarios/ScenarioSimulator";

interface ScenariosPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScenariosPage({ params }: ScenariosPageProps) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const actionsPct =
    entriesFromClient(client).find((entry) => entry.categoryId === "actions")
      ?.percentage ?? 0;

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
          actionsPct={actionsPct}
          actionsBreakdown={actionsBreakdownFromClient(client)}
          properties={client.properties}
        />
      </div>
    </div>
  );
}
