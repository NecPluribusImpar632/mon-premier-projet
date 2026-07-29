import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/actions/clients";
import { entriesFromClient } from "@/lib/allocation/mapping";
import { ClientAllocationEditor } from "@/components/allocation/ClientAllocationEditor";
import { PropertyList } from "@/components/property/PropertyList";
import { LinkPendingSpinner } from "@/components/ui/LinkPendingSpinner";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {client.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {client.age} ans
        </p>
      </div>
      <ClientAllocationEditor
        clientId={client.id}
        initialEntries={entriesFromClient(client)}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Biens immobiliers
          </h2>
          <Link
            href={`/clients/${client.id}/properties/new`}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Ajouter un bien
            <LinkPendingSpinner />
          </Link>
        </div>
        <PropertyList properties={client.properties} />
      </div>
    </div>
  );
}
