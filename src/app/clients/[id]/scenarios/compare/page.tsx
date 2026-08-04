import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClient } from "@/lib/actions/clients";
import { getSavedScenarios } from "@/lib/actions/scenarios";
import { buildClientScenarioContext } from "@/lib/scenarios/clientContext";
import { ScenarioComparison } from "@/components/scenarios/ScenarioComparison";

interface CompareScenariosPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompareScenariosPage({
  params,
}: CompareScenariosPageProps) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const context = buildClientScenarioContext(client);
  const savedScenarios = await getSavedScenarios(id);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-14 sm:py-20">
      <div>
        <Link
          href={`/clients/${id}/scenarios`}
          className="inline-flex items-center gap-1.5 text-sm text-slate transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au simulateur
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-ink">
          Comparer deux scénarios
        </h1>
        <p className="mt-1 text-sm text-slate">Pour {client.name}</p>
      </div>

      <div className="mt-10">
        <ScenarioComparison context={context} savedScenarios={savedScenarios} />
      </div>
    </div>
  );
}
