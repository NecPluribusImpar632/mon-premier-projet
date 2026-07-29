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
      <p className="text-sm text-zinc-500">
        Aucun bien enregistré pour l&apos;instant.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {properties.map((property) => (
        <li
          key={property.id}
          className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {property.name}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-zinc-500">Valeur actuelle</dt>
              <dd className="tabular-nums text-zinc-900 dark:text-zinc-50">
                {currencyFormatter.format(property.currentValue)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Loyer mensuel</dt>
              <dd className="tabular-nums text-zinc-900 dark:text-zinc-50">
                {property.monthlyRent !== null
                  ? `${currencyFormatter.format(property.monthlyRent)}/mois`
                  : "Non loué"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Capital restant dû</dt>
              <dd className="tabular-nums text-zinc-900 dark:text-zinc-50">
                {currencyFormatter.format(property.remainingLoanAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Taux du crédit</dt>
              <dd className="tabular-nums text-zinc-900 dark:text-zinc-50">
                {property.loanRate}% (
                {RATE_TYPE_LABELS[property.rateType as RateType] ??
                  property.rateType}
                )
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
