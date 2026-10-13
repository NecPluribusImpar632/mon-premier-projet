import Link from "next/link";
import { Users } from "lucide-react";
import { getClients } from "@/lib/actions/clients";
import { requireUser } from "@/lib/auth/currentUser";
import { computeClientNetWorth } from "@/lib/wealth/netWorth";
import { ClientsList } from "@/components/client/ClientsList";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LinkPendingSpinner } from "@/components/ui/LinkPendingSpinner";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = await getClients();
  const isAdmin = user.role === "admin";

  const clientSummaries = clients.map((client) => ({
    id: client.id,
    name: client.name,
    age: client.age,
    netWealth: computeClientNetWorth(client, client.properties).netWealth,
    ownerEmail: client.owner?.email ?? null,
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
            <span className="text-slate/60"> · {user.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/clients/new" className={PRIMARY_BUTTON_CLASS}>
            Nouveau client
            <LinkPendingSpinner />
          </Link>
          {isAdmin && (
            <Link href="/comptes" className={SECONDARY_BUTTON_CLASS}>
              <Users className="h-4 w-4" />
              Comptes
            </Link>
          )}
          <LogoutButton />
        </div>
      </div>

      {clients.length === 0 ? (
        <p className="border-t border-line pt-8 text-sm text-slate">
          Aucun client pour l&apos;instant.
        </p>
      ) : (
        <ClientsList clients={clientSummaries} showOwner={isAdmin} />
      )}
    </div>
  );
}
