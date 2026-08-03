import type { ComponentType } from "react";
import Link from "next/link";
import { Building2, Coins, Key, Landmark, MapPin, Percent } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import { RATE_TYPE_LABELS, type RateType } from "@/lib/property/rateType";
import { DEPARTMENT_LABEL, arrondissementLabel } from "@/lib/property/departments";
import { roundPercent } from "@/lib/format/percent";
import { DeletePropertyButton } from "@/components/property/DeletePropertyButton";

interface PropertyListProps {
  clientId: string;
  properties: Property[];
}

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function PropertyList({ clientId, properties }: PropertyListProps) {
  if (properties.length === 0) {
    return (
      <div className="border-t border-line py-5 text-center">
        <p className="text-sm text-slate">
          Aucun bien enregistré pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-t border-line">
      {properties.map((property) => (
        <article key={property.id} className="border-b border-line py-5">
          <div className="mb-3 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 shrink-0 text-slate" />
              <h3 className="font-serif text-lg text-ink">{property.name}</h3>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/clients/${clientId}/properties/${property.id}/edit`}
                className="rounded-full border border-line px-3 py-1 text-xs font-medium text-slate transition-colors hover:border-emerald hover:text-emerald"
              >
                Modifier
              </Link>
              <DeletePropertyButton
                propertyId={property.id}
                clientId={clientId}
                propertyName={property.name}
              />
            </div>
          </div>

          <dl className="flex flex-col">
            <PropertyLine
              icon={MapPin}
              label="Localisation"
              value={
                property.department
                  ? DEPARTMENT_LABEL[property.department] ?? property.department
                  : "Non renseignée"
              }
              hint={
                property.department === "75" && property.arrondissement
                  ? arrondissementLabel(property.arrondissement)
                  : undefined
              }
              muted={!property.department}
            />
            <PropertyLine
              icon={Coins}
              label="Valeur actuelle"
              value={currencyFormatter.format(property.currentValue)}
            />
            <PropertyLine
              icon={Key}
              label="Loyer mensuel"
              value={
                property.monthlyRent !== null
                  ? `${currencyFormatter.format(property.monthlyRent)}/mois`
                  : "Non loué"
              }
              muted={property.monthlyRent === null}
            />
            <PropertyLine
              icon={Landmark}
              label="Capital restant dû"
              value={currencyFormatter.format(property.remainingLoanAmount)}
            />
            <PropertyLine
              icon={Percent}
              label="Taux du crédit"
              value={`${roundPercent(property.loanRate, 1)}%`}
              hint={
                RATE_TYPE_LABELS[property.rateType as RateType] ??
                property.rateType
              }
              last
            />
          </dl>
        </article>
      ))}
    </div>
  );
}

interface PropertyLineProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
  last?: boolean;
}

function PropertyLine({
  icon: Icon,
  label,
  value,
  hint,
  muted,
  last,
}: PropertyLineProps) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2 ${
        last ? "" : "border-b border-line/70"
      }`}
    >
      <dt className="flex items-center gap-2 text-sm text-slate">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </dt>
      <dd
        className={`font-mono text-sm tabular-nums ${
          muted ? "text-slate" : "text-ink"
        }`}
      >
        {value}
        {hint && <span className="ml-1.5 font-sans text-xs text-slate">({hint})</span>}
      </dd>
    </div>
  );
}
