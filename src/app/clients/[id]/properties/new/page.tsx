import { notFound } from "next/navigation";
import { getClient } from "@/lib/actions/clients";
import { createProperty } from "@/lib/actions/properties";
import { RATE_TYPES, RATE_TYPE_LABELS } from "@/lib/property/rateType";

interface NewPropertyPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewPropertyPage({ params }: NewPropertyPageProps) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const createPropertyForClient = createProperty.bind(null, client.id);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Nouveau bien immobilier
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pour {client.name}
        </p>
      </div>
      <form action={createPropertyForClient} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Nom / adresse
          <input
            name="name"
            type="text"
            required
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Valeur actuelle (€)
          <input
            name="currentValue"
            type="number"
            min={0}
            step="0.01"
            required
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Loyer mensuel perçu (€, si loué)
          <input
            name="monthlyRent"
            type="number"
            min={0}
            step="0.01"
            placeholder="Laisser vide si non loué"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Capital restant dû (€)
          <input
            name="remainingLoanAmount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Taux du crédit (%)
          <input
            name="loanRate"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Type de taux
          <select
            name="rateType"
            defaultValue="fixed"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {RATE_TYPES.map((rateType) => (
              <option key={rateType} value={rateType}>
                {RATE_TYPE_LABELS[rateType]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="mt-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Créer
        </button>
      </form>
    </div>
  );
}
