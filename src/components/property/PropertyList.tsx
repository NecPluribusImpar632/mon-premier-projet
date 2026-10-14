import type { ComponentType } from "react";
import Link from "next/link";
import { Building2, Calculator, Coins, Key, Landmark, MapPin, PieChart, Scale, TrendingUp } from "lucide-react";
import { RATE_TYPE_LABELS, type RateType } from "@/lib/property/rateType";
import { AMORTIZATION_TYPE_LABELS, type AmortizationType } from "@/lib/property/loanTypes";
import { DEPARTMENT_LABEL, arrondissementLabel } from "@/lib/property/departments";
import {
  computeAmortizationSchedule,
  type PropertyWithLoans,
} from "@/lib/property/loanCalculations";
import { computeRentalYield } from "@/lib/property/rentalYield";
import {
  DISMEMBERMENT_NOTE,
  holdingModeLabel,
  isDismemberment,
  isPartialOwnership,
  ownedLoanAmount,
  ownedMonthlyRent,
  ownedValue,
} from "@/lib/property/ownership";
import { roundPercent } from "@/lib/format/percent";
import { DeletePropertyButton } from "@/components/property/DeletePropertyButton";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import type { PropertyWithSensitivity } from "@/lib/scenarios/resolvePropertySensitivity";

interface PropertyListProps {
  clientId: string;
  properties: PropertyWithSensitivity[];
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
      {properties.map((property) => {
        const rentalYield = computeRentalYield(property);
        const partial = isPartialOwnership(property);
        const shareLabel = `${roundPercent(property.ownershipSharePct, 2)} %`;
        const ownedRent = ownedMonthlyRent(property);

        return (
          <article key={property.id} className="border-b border-line py-5">
            <div className="mb-3 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 shrink-0 text-slate" />
                <h3 className="font-serif text-lg text-ink">{property.name}</h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/clients/${clientId}/properties/${property.id}/fiscalite`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-slate transition-colors hover:border-emerald hover:text-emerald"
                >
                  <Calculator className="h-3 w-3" />
                  Comparer la fiscalité
                </Link>
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
                    : (property.communeName ?? undefined)
                }
                muted={!property.department}
              />
              <PropertyLine
                icon={Coins}
                label={partial ? "Valeur totale du bien" : "Valeur actuelle"}
                value={currencyFormatter.format(property.currentValue)}
              />
              {partial && (
                <PropertyLine
                  icon={PieChart}
                  label={`Quote-part détenue (${shareLabel})`}
                  value={currencyFormatter.format(ownedValue(property))}
                />
              )}
              <PropertyLine
                icon={Scale}
                label="Mode de détention"
                value={holdingModeLabel(property.holdingMode)}
                hint={isDismemberment(property.holdingMode) ? DISMEMBERMENT_NOTE : undefined}
                warn={isDismemberment(property.holdingMode)}
              />
              <PropertyLine
                icon={Key}
                label={partial ? "Loyer mensuel (quote-part)" : "Loyer mensuel"}
                value={
                  ownedRent !== null ? `${currencyFormatter.format(ownedRent)}/mois` : "Non loué"
                }
                hint={
                  partial && property.monthlyRent !== null
                    ? `${currencyFormatter.format(property.monthlyRent)} au total`
                    : undefined
                }
                muted={ownedRent === null}
              />
              <PropertyLine
                icon={TrendingUp}
                label="Rendement locatif"
                value={rentalYield !== null ? `${roundPercent(rentalYield, 2)}%` : "—"}
                muted={rentalYield === null}
                last={property.loans.length === 0}
              />
              {property.loans.map((loan, index) => (
                <LoanLine
                  key={loan.id}
                  loan={loan}
                  ownedAmount={ownedLoanAmount(loan, property)}
                  last={index === property.loans.length - 1}
                />
              ))}
            </dl>
          </article>
        );
      })}
    </div>
  );
}

interface PropertyLineProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
  /** Bronze hint, for a caveat rather than a detail. */
  warn?: boolean;
  last?: boolean;
}

function PropertyLine({
  icon: Icon,
  label,
  value,
  hint,
  muted,
  warn,
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
        {hint && (
          <span className={`ml-1.5 font-sans text-xs ${warn ? "text-bronze" : "text-slate"}`}>
            ({hint})
          </span>
        )}
      </dd>
    </div>
  );
}

interface LoanLineProps {
  loan: PropertyWithLoans["loans"][number];
  /** The client's share of the remaining capital (see ownership.ts). */
  ownedAmount: number;
  last?: boolean;
}

function LoanLine({ loan, ownedAmount, last }: LoanLineProps) {
  const schedule = computeAmortizationSchedule(loan);

  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2 ${
        last ? "" : "border-b border-line/70"
      }`}
    >
      <dt className="flex items-center gap-2 text-sm text-slate">
        <Landmark className="h-3.5 w-3.5 shrink-0" />
        {loan.label ?? "Prêt"}
        <InfoTooltip label="Tableau d'amortissement">
          <p className="font-medium text-ink">
            {roundPercent(loan.rate, 2)}% ·{" "}
            {RATE_TYPE_LABELS[loan.rateType as RateType] ?? loan.rateType} ·{" "}
            {AMORTIZATION_TYPE_LABELS[loan.amortizationType as AmortizationType] ??
              loan.amortizationType}
          </p>
          <div className="mt-2 max-h-48 overflow-y-auto border-t border-line pt-2">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate">
                  <th className="font-normal">Année</th>
                  <th className="font-normal">Capital restant</th>
                  <th className="font-normal">Intérêts</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums text-ink">
                {schedule.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td>{currencyFormatter.format(row.remainingCapital)}</td>
                    <td>{currencyFormatter.format(row.interestPaidThisYear)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InfoTooltip>
      </dt>
      <dd className="font-mono text-sm tabular-nums text-ink">
        {currencyFormatter.format(ownedAmount)}
        {Math.round(ownedAmount) !== Math.round(loan.remainingAmount) && (
          <span className="ml-1.5 font-sans text-xs text-slate">
            ({currencyFormatter.format(loan.remainingAmount)} au total)
          </span>
        )}
        {loan.borneFullyByClient && (
          <span className="ml-1.5 font-sans text-xs text-slate">(porté à 100 %)</span>
        )}
      </dd>
    </div>
  );
}
