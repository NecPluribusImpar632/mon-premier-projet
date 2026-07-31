import Link from "next/link";
import { getClients } from "@/lib/actions/clients";
import { LinkPendingSpinner } from "@/components/ui/LinkPendingSpinner";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-14 sm:py-20">
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
        <ul className="flex flex-col border-t border-line">
          {clients.map((client) => (
            <li key={client.id} className="border-b border-line">
              <Link
                href={`/clients/${client.id}`}
                className="flex items-center justify-between px-1 py-4 transition-colors hover:bg-emerald-tint/40"
              >
                <span className="font-medium text-ink">{client.name}</span>
                <span className="font-mono text-sm tabular-nums text-slate">
                  {client.age} ans
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
