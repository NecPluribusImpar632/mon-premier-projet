import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, PieChart, User } from "lucide-react";
import { getClient } from "@/lib/actions/clients";
import { entriesFromClient } from "@/lib/allocation/mapping";
import { ClientAllocationEditor } from "@/components/allocation/ClientAllocationEditor";
import { PropertyList } from "@/components/property/PropertyList";
import { LinkPendingSpinner } from "@/components/ui/LinkPendingSpinner";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

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
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-14 sm:py-20">
      <header className="flex items-center gap-5 pb-10">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-slate">
          <User className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
            {client.name}
          </h1>
          <p className="mt-1 text-sm text-slate">{client.age} ans</p>
        </div>
      </header>

      <div className="flex flex-col gap-14 border-t border-line pt-12">
        <section className="flex flex-col gap-6">
          <SectionHeading
            icon={PieChart}
            title="Allocation d'actifs"
            subtitle="Répartition du patrimoine par classe d'actifs"
          />
          <div className="rounded-lg border border-line bg-surface p-7">
            <ClientAllocationEditor
              clientId={client.id}
              initialEntries={entriesFromClient(client)}
            />
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <SectionHeading
            icon={Building2}
            title="Biens immobiliers"
            subtitle="Patrimoine immobilier détenu par le client"
            action={
              <Link
                href={`/clients/${client.id}/properties/new`}
                className={PRIMARY_BUTTON_CLASS}
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
