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
      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Loyer mensuel perçu (€, si loué)
        <FormattedNumberInput
          name="monthlyRent"
          placeholder="Laisser vide si non loué"
          value={defaultValues?.monthlyRent ?? undefined}
          className={NUMERIC_FIELD_CLASS}
        />
      </label>
      <LoanFields defaultLoans={defaultValues?.loans} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
