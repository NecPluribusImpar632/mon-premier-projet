import { LocationFields } from "@/components/property/LocationFields";
import { LoanFields } from "@/components/property/LoanFields";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";
import { NUMERIC_FIELD_CLASS, FIELD_CLASS } from "@/components/ui/fieldStyles";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { PropertyWithLoans } from "@/lib/property/loanCalculations";

interface PropertyFormProps {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: PropertyWithLoans;
  submitLabel: string;
}

// Shared by the create and edit pages so both stay in sync — only the bound
// action, pre-filled values, and submit label differ between the two.
export function PropertyForm({ action, defaultValues, submitLabel }: PropertyFormProps) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Nom / adresse
        <input
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name}
          className={FIELD_CLASS}
        />
      </label>
      <LocationFields
        defaultDepartment={defaultValues?.department ?? undefined}
        defaultArrondissement={defaultValues?.arrondissement ?? undefined}
        defaultCommuneCode={defaultValues?.communeCode ?? undefined}
      />
      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Valeur actuelle (€)
        <FormattedNumberInput
          name="currentValue"
          required
          placeholder="0"
          value={defaultValues?.currentValue}
          className={NUMERIC_FIELD_CLASS}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate">
        <input
          name="isPrimaryResidence"
          type="checkbox"
          defaultChecked={defaultValues?.isPrimaryResidence}
          className="h-4 w-4 rounded border-line text-emerald focus:outline-none focus:ring-2 focus:ring-emerald/15"
        />
        Résidence principale
        <span className="text-xs text-slate/70">(abattement de 30 % pour l&apos;IFI)</span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Loyer mensuel perçu (€, si loué)
        <FormattedNumberInput
          name="monthlyRent"
          placeholder="Laisser vide si non loué"
          value={defaultValues?.monthlyRent ?? undefined}
          className={NUMERIC_FIELD_CLASS}
        />
      </label>
      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1.5 text-sm text-slate">
          Prix d&apos;acquisition (€)
          <FormattedNumberInput
            name="acquisitionPrice"
            placeholder="Optionnel"
            value={defaultValues?.acquisitionPrice ?? undefined}
            className={NUMERIC_FIELD_CLASS}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm text-slate">
          Date d&apos;acquisition
          <input
            name="acquisitionDate"
            type="date"
            defaultValue={
              defaultValues?.acquisitionDate
                ? defaultValues.acquisitionDate.toISOString().slice(0, 10)
                : undefined
            }
            className={FIELD_CLASS}
          />
        </label>
      </div>
      <LoanFields defaultLoans={defaultValues?.loans} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
