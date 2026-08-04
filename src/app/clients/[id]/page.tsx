import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Download, FlaskConical, PieChart, PiggyBank, User } from "lucide-react";
import { getClient } from "@/lib/actions/clients";
import {
  actionsBreakdownFromClient,
  amountsFromClient,
  effectiveImmobilierAmount,
  financialTotalFromAmounts,
  professionalToolMainIncomeFromClient,
} from "@/lib/allocation/mapping";
import { ClientAllocationEditor } from "@/components/allocation/ClientAllocationEditor";
import { ClientProfile } from "@/components/client/ClientProfile";
import { RetirementGoalSection } from "@/components/client/RetirementGoalSection";
import { PropertyList } from "@/components/property/PropertyList";
import { PropertyOverview } from "@/components/property/PropertyOverview";
import { LinkPendingSpinner } from "@/components/ui/LinkPendingSpinner";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const amounts = amountsFromClient(client);
  const financialWealthTotal = financialTotalFromAmounts(amounts);
  const immobilierValue = effectiveImmobilierAmount(
    amounts.immobilier ?? 0,
    client.properties
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between gap-5 pb-4">
          <div className="flex items-center gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-slate">
              <User className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
                {client.name}
              </h1>
              <p className="mt-1 text-sm text-slate">{client.age} ans</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <a
              href={`/clients/${client.id}/pdf`}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-slate transition-colors hover:border-emerald hover:text-emerald"
            >
              <Download className="h-4 w-4" />
              Exporter en PDF
            </a>
            <Link
              href={`/clients/${client.id}/scenarios`}
              className={PRIMARY_BUTTON_CLASS}
            >
              <FlaskConical className="h-4 w-4" />
              Simuler des scénarios
              <LinkPendingSpinner />
            </Link>
          </div>
        </header>

        <ClientProfile
          clientId={client.id}
          initialRiskProfile={client.riskProfile}
          initialNotes={client.notes}
        />
      </div>

      <div className="flex flex-col gap-5 border-t border-line pt-6">
        <section className="flex flex-col gap-4">
          <div className="mx-auto w-full max-w-3xl">
            <SectionHeading
              icon={PieChart}
              title="Allocation d'actifs"
              subtitle="Répartition du patrimoine par classe d'actifs"
            />
          </div>
          <ClientAllocationEditor
            clientId={client.id}
            initialAmounts={amountsFromClient(client)}
            initialActionsBreakdown={actionsBreakdownFromClient(client)}
            initialProfessionalToolMainIncome={professionalToolMainIncomeFromClient(
              client
            )}
            properties={client.properties}
          />
        </section>

        <div className="mx-auto w-full max-w-3xl">
          <section className="flex flex-col gap-4">
            <SectionHeading
              icon={Building2}
              title="Biens immobiliers"
              subtitle="Patrimoine immobilier détenu par le client"
              action={
                <Link
                  href={`/clients/${client.id}/properties/new`}
                  className={PRIMARY_BUTTON_CLASS}
                >
                  Ajouter un bien
                  <LinkPendingSpinner />
                </Link>
              }
            />
            <PropertyOverview properties={client.properties} />
            <PropertyList clientId={client.id} properties={client.properties} />
          </section>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <section className="flex flex-col gap-4">
            <SectionHeading
              icon={PiggyBank}
              title="Objectifs de retraite"
              subtitle="Trajectoire d'épargne jusqu'à la retraite"
            />
            <RetirementGoalSection
              clientId={client.id}
              currentAge={client.age}
              financialWealthTotal={financialWealthTotal}
              immobilierValue={immobilierValue}
              properties={client.properties}
              initialRetirementAge={client.retirementAge}
              initialMonthlySavingsAmount={client.monthlySavingsAmount}
              initialExpectedAnnualReturnPct={client.expectedAnnualReturnPct}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
