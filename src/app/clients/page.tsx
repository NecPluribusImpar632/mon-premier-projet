import Link from "next/link";
import { getClients } from "@/lib/actions/clients";
import { computeClientNetWorth } from "@/lib/wealth/netWorth";
import { ClientsList } from "@/components/client/ClientsList";
import { LinkPendingSpinner } from "@/components/ui/LinkPendingSpinner";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

export default async function ClientsPage() {
  const clients = await getClients();

  const clientSummaries = clients.map((client) => ({
    id: client.id,
    name: client.name,
    age: client.age,
    netWealth: computeClientNetWorth(client, client.properties).netWealth,
  }));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-6 py-14 sm:py-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
            Clients
          </h1>
          <p className="mt-1 text-sm text-slate">
            {clients.length} client{clients.length > 1 ? "s" : ""} enregistré
            {clients.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/clients/new" className={PRIMARY_BUTTON_CLASS}>
          Nouveau client
          <LinkPendingSpinner />
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="border-t border-line pt-8 text-sm text-slate">
          Aucun client pour l&apos;instant.
        </p>
      ) : (
        <ClientsList clients={clientSummaries} />
      )}
    </div>
  );
}
