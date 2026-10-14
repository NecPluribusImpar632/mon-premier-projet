import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClient } from "@/lib/actions/clients";
import { getProperty } from "@/lib/actions/properties";
import { RentalTaxComparisonTool } from "@/components/property/RentalTaxComparisonTool";
import {
  loanShare,
  ownedAcquisitionPrice,
  ownedMonthlyRent,
  ownedValue,
  ownershipShare,
} from "@/lib/property/ownership";

interface FiscalitePageProps {
  params: Promise<{ id: string; propertyId: string }>;
}

export default async function FiscalitePage({ params }: FiscalitePageProps) {
  const { id, propertyId } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const property = await getProperty(propertyId, client.id);

  if (!property) {
    notFound();
  }

  const backLink = (
    <Link
      href={`/clients/${id}`}
      className="inline-flex items-center gap-1.5 text-sm text-slate transition-colors hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" />
      Retour à la fiche client
    </Link>
  );

  if (property.acquisitionPrice === null || property.acquisitionDate === null) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-14 sm:py-20">
        {backLink}
        <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-ink">
          Comparateur fiscal
        </h1>
        <p className="mt-1 text-sm text-slate">Pour {property.name}</p>
        <p className="mt-8 border-t border-line pt-6 text-sm text-slate">
          Le prix et la date d&apos;acquisition de ce bien ne sont pas renseignés — ils
          sont nécessaires pour calculer l&apos;amortissement et la plus-value à la
          revente.{" "}
          <Link
            href={`/clients/${id}/properties/${propertyId}/edit`}
            className="text-emerald underline decoration-dotted underline-offset-2 hover:text-emerald-strong"
          >
            Renseigner ces informations
          </Link>
          .
        </p>
      </div>
    );
  }

  // Everything at the client's quote-part (see ownership.ts): the regimes
  // compare what the client personally receives, pays and would sell.
  const annualRent = (ownedMonthlyRent(property) ?? 0) * 12;
  const annualInterestPaid = property.loans.reduce(
    (sum, loan) => sum + loan.remainingAmount * (loan.rate / 100) * loanShare(loan, property),
    0
  );
  const acquisitionPrice = ownedAcquisitionPrice(property) ?? 0;
  const sharePct = ownershipShare(property) * 100;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-14 sm:py-20">
      {backLink}
      <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-ink">
        Comparateur fiscal
      </h1>
      <p className="mt-1 text-sm text-slate">
        Pour {property.name} · {client.name}
        {sharePct < 100 && ` · quote-part détenue ${sharePct} %, montants ramenés à cette part`}
      </p>

      <div className="mt-10">
        <RentalTaxComparisonTool
          annualRent={annualRent}
          annualInterestPaid={annualInterestPaid}
          acquisitionPrice={acquisitionPrice}
          acquisitionDate={property.acquisitionDate}
          currentValue={ownedValue(property)}
          currentRegimeId={property.holdingMode === "sci_is" ? "sci-is" : null}
        />
      </div>
    </div>
  );
}
