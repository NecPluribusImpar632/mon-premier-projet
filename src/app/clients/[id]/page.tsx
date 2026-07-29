import { notFound } from "next/navigation";
import { getClient } from "@/lib/actions/clients";
import { entriesFromClient } from "@/lib/allocation/mapping";
import { ClientAllocationEditor } from "@/components/allocation/ClientAllocationEditor";

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
    </div>
  );
}
