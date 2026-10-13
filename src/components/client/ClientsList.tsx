"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteClientButton } from "@/components/client/DeleteClientButton";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";

export interface ClientSummary {
  id: string;
  name: string;
  age: number;
  netWealth: number;
  /** Email of the advisor who owns the client; null for an orphan. */
  ownerEmail: string | null;
}

interface ClientsListProps {
  clients: ClientSummary[];
  /** Admins see every advisor's clients, so they get an owner column; an
   * advisor only ever sees their own and doesn't need it. */
  showOwner?: boolean;
}

type SortKey = "name" | "age" | "netWealth";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Nom",
  age: "Âge",
  netWealth: "Patrimoine net",
};

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function ClientsList({ clients, showOwner = false }: ClientsListProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const visibleClients = useMemo(() => {
    const filtered = search.trim()
      ? clients.filter((c) =>
          c.name.toLowerCase().includes(search.trim().toLowerCase())
        )
      : clients;

    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "fr");
      return b[sortKey] - a[sortKey];
    });
  }, [clients, search, sortKey]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client..."
          className={`flex-1 ${FIELD_CLASS}`}
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className={FIELD_CLASS}
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              Trier par {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {visibleClients.length === 0 ? (
        <p className="border-t border-line pt-8 text-sm text-slate">
          Aucun client ne correspond à cette recherche.
        </p>
      ) : (
        <ul className="flex flex-col border-t border-line">
          {visibleClients.map((client) => (
            <li key={client.id} className="flex items-center border-b border-line">
              <Link
                href={`/clients/${client.id}`}
                className="flex flex-1 items-center justify-between px-1 py-4 transition-colors hover:bg-emerald-tint/40"
              >
                <span className="flex flex-col">
                  <span className="font-medium text-ink">{client.name}</span>
                  {showOwner && (
                    <span className="text-xs text-slate">
                      {client.ownerEmail ?? "sans propriétaire"}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-4">
                  <span className="font-mono text-sm tabular-nums text-slate">
                    {client.age} ans
                  </span>
                  <span className="font-mono text-sm tabular-nums text-ink">
                    {currencyFormatter.format(client.netWealth)}
                  </span>
                </span>
              </Link>
              <DeleteClientButton clientId={client.id} clientName={client.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
