import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, PieChart, User } from "lucide-react";
import { getClient } from "@/lib/actions/clients";
import { entriesFromClient } from "@/lib/allocation/mapping";
import { ClientAllocationEditor } from "@/components/allocation/ClientAllocationEditor";
import { PropertyList } from "@/components/property/PropertyList";
import { LinkPendingSpinner } from "@/components/ui/LinkPendingSpinner";
import { SectionHeading } from "@/components/ui/SectionHeading";

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
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-12 sm:py-16">
      <header className="flex items-center gap-4 pb-8">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <User className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {client.name}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {client.age} ans
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-10 border-t border-zinc-200 pt-10 dark:border-zinc-800">
        <section className="flex flex-col gap-5">
          <SectionHeading
            icon={PieChart}
            title="Allocation d'actifs"
            subtitle="Répartition du patrimoine par classe d'actifs"
          />
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <ClientAllocationEditor
              clientId={client.id}
              initialEntries={entriesFromClient(client)}
            />
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <SectionHeading
            icon={Building2}
            title="Biens immobiliers"
            subtitle="Patrimoine immobilier détenu par le client"
            action={
              <Link
                href={`/clients/${client.id}/properties/new`}
                className="flex shrink-0 items-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Ajouter un bien
                <LinkPendingSpinner />
              </Link>
            }
          />
          <PropertyList properties={client.properties} />
        </section>
      </div>
    </div>
  );
}
