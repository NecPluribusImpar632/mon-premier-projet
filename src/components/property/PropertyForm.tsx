import type { Property } from "@/generated/prisma/client";
import { RATE_TYPES, RATE_TYPE_LABELS } from "@/lib/property/rateType";
import { LocationFields } from "@/components/property/LocationFields";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";
import { FIELD_CLASS, NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { SubmitButton } from "@/components/ui/SubmitButton";

interface PropertyFormProps {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: Property;
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
      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Capital restant dû (€)
        <FormattedNumberInput
          name="remainingLoanAmount"
          placeholder="0"
          value={defaultValues?.remainingLoanAmount}
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
          defaultValue={defaultValues?.loanRate ?? 0}
          className={NUMERIC_FIELD_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Type de taux
        <select
          name="rateType"
          defaultValue={defaultValues?.rateType ?? "fixed"}
          className={FIELD_CLASS}
        >
          {RATE_TYPES.map((rateType) => (
            <option key={rateType} value={rateType}>
              {RATE_TYPE_LABELS[rateType]}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
