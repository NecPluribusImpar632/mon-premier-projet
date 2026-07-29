import Link from "next/link";
import { getClients } from "@/lib/actions/clients";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Clients
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {clients.length} client{clients.length > 1 ? "s" : ""} enregistré
            {clients.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Nouveau client
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun client pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/clients/${client.id}`}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {client.name}
                </span>
                <span className="text-sm text-zinc-500">{client.age} ans</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
