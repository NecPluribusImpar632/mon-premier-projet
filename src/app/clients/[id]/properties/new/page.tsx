import { notFound } from "next/navigation";
import { getClient } from "@/lib/actions/clients";
import { createProperty } from "@/lib/actions/properties";
import { RATE_TYPES, RATE_TYPE_LABELS } from "@/lib/property/rateType";
import { LocationFields } from "@/components/property/LocationFields";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";
import { FIELD_CLASS, NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { SubmitButton } from "@/components/ui/SubmitButton";

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
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-6 py-14 sm:py-20">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
          Nouveau bien immobilier
        </h1>
        <p className="mt-1 text-sm text-slate">Pour {client.name}</p>
      </div>
      <form action={createPropertyForClient} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm text-slate">
          Nom / adresse
          <input name="name" type="text" required className={FIELD_CLASS} />
        </label>
        <LocationFields />
        <label className="flex flex-col gap-1.5 text-sm text-slate">
          Valeur actuelle (€)
          <FormattedNumberInput
            name="currentValue"
            required
            placeholder="0"
            className={NUMERIC_FIELD_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-slate">
          Loyer mensuel perçu (€, si loué)
          <FormattedNumberInput
            name="monthlyRent"
            placeholder="Laisser vide si non loué"
            className={NUMERIC_FIELD_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-slate">
          Capital restant dû (€)
          <FormattedNumberInput
            name="remainingLoanAmount"
            placeholder="0"
            className={NUMERIC_FIELD_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-slate">
          Taux du crédit (%)
          <input
            name="loanRate"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            className={NUMERIC_FIELD_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-slate">
          Type de taux
          <select name="rateType" defaultValue="fixed" className={FIELD_CLASS}>
            {RATE_TYPES.map((rateType) => (
              <option key={rateType} value={rateType}>
                {RATE_TYPE_LABELS[rateType]}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton>Créer</SubmitButton>
      </form>
    </div>
  );
}
