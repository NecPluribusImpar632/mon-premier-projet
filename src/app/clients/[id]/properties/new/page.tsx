import { notFound } from "next/navigation";
import { getClient } from "@/lib/actions/clients";
import { createProperty } from "@/lib/actions/properties";
import { RATE_TYPES, RATE_TYPE_LABELS } from "@/lib/property/rateType";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";

const MONEY_INPUT_CLASS =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums transition-shadow focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-zinc-50/10";

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
            className={MONEY_INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Valeur actuelle (€)
          <FormattedNumberInput
            name="currentValue"
            required
            placeholder="0"
            className={MONEY_INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Loyer mensuel perçu (€, si loué)
          <FormattedNumberInput
            name="monthlyRent"
            placeholder="Laisser vide si non loué"
            className={MONEY_INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Capital restant dû (€)
          <FormattedNumberInput
            name="remainingLoanAmount"
            placeholder="0"
            className={MONEY_INPUT_CLASS}
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
            className={MONEY_INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Type de taux
          <select
            name="rateType"
            defaultValue="fixed"
            className={MONEY_INPUT_CLASS}
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
