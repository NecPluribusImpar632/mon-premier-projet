import type { ComponentType } from "react";
import { Building2, Coins, Key, Landmark, Percent } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import { RATE_TYPE_LABELS, type RateType } from "@/lib/property/rateType";

interface PropertyListProps {
  properties: Property[];
}

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function PropertyList({ properties }: PropertyListProps) {
  if (properties.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <p className="text-sm text-zinc-500">
          Aucun bien enregistré pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {properties.map((property) => (
        <li
          key={property.id}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <Building2 className="h-4 w-4" />
            </span>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {property.name}
            </p>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-zinc-100 pt-4 dark:border-zinc-900 sm:grid-cols-4">
            <PropertyMetric
              icon={Coins}
              label="Valeur actuelle"
              value={currencyFormatter.format(property.currentValue)}
            />
            <PropertyMetric
              icon={Key}
              label="Loyer mensuel"
              value={
                property.monthlyRent !== null
                  ? `${currencyFormatter.format(property.monthlyRent)}/mois`
                  : "Non loué"
              }
              muted={property.monthlyRent === null}
            />
            <PropertyMetric
              icon={Landmark}
              label="Capital restant dû"
              value={currencyFormatter.format(property.remainingLoanAmount)}
            />
            <PropertyMetric
              icon={Percent}
              label="Taux du crédit"
              value={`${property.loanRate}%`}
              hint={
                RATE_TYPE_LABELS[property.rateType as RateType] ??
                property.rateType
              }
            />
          </dl>
        </li>
      ))}
    </ul>
  );
}

interface PropertyMetricProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
}

function PropertyMetric({
  icon: Icon,
  label,
  value,
  hint,
  muted,
}: PropertyMetricProps) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
      <div>
        <dt className="text-xs text-zinc-500">{label}</dt>
        <dd
          className={`tabular-nums font-medium ${
            muted
              ? "text-zinc-400 dark:text-zinc-500"
              : "text-zinc-900 dark:text-zinc-50"
          }`}
        >
          {value}
          {hint && (
            <span className="ml-1 text-xs font-normal text-zinc-500">
              ({hint})
            </span>
          )}
        </dd>
      </div>
    </div>
  );
}
