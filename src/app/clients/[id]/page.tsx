import { notFound } from "next/navigation";
import { getClient } from "@/lib/actions/clients";
import { getSavedScenarios } from "@/lib/actions/scenarios";
import {
  actionsBreakdownFromClient,
  amountsFromClient,
  overallEntriesFromAmounts,
  professionalToolMainIncomeFromClient,
  wrapperBreakdownsFromClient,
  preciousMetalsBreakdownFromClient,
} from "@/lib/allocation/mapping";
import { buildClientScenarioContext } from "@/lib/scenarios/clientContext";
import { ClientDetailTabs } from "@/components/client/ClientDetailTabs";
import { isClientTab } from "@/lib/client/clientTabs";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: ClientDetailPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const amounts = amountsFromClient(client);
  const scenarioContext = buildClientScenarioContext(client);
  const overallEntries = overallEntriesFromAmounts(amounts, client.properties);
  const actionsPctOverall =
    overallEntries.find((entry) => entry.categoryId === "actions")?.percentage ?? 0;
  const savedScenarios = await getSavedScenarios(id);

  return (
    <ClientDetailTabs
      clientId={client.id}
      clientName={client.name}
      currentAge={client.age}
      initialTab={tab && isClientTab(tab) ? tab : "overview"}
      initialRiskProfile={client.riskProfile}
      initialNotes={client.notes}
      initialMaritalStatus={client.maritalStatus}
      initialSpouseName={client.spouseName}
      initialSpouseImmobilierAmount={client.spouseImmobilierAmount}
      initialSpouseScpiAmount={client.spouseScpiAmount}
      initialSpouseDebtAmount={client.spouseDebtAmount}
      initialMinorChildrenCount={client.minorChildrenCount}
      initialAdultChildrenCount={client.adultChildrenCount}
      amounts={amounts}
      actionsBreakdown={actionsBreakdownFromClient(client)}
      initialProfessionalToolMainIncome={professionalToolMainIncomeFromClient(client)}
      initialWrapperBreakdowns={wrapperBreakdownsFromClient(client.wrapperAllocations)}
      initialPreciousMetalsBreakdown={preciousMetalsBreakdownFromClient(client)}
      financialWealthTotal={scenarioContext.financialWealthTotal}
      immobilierValue={scenarioContext.immobilierValue}
      properties={scenarioContext.properties}
      actionsPctOverall={actionsPctOverall}
      scenarioContext={scenarioContext}
      initialSavedScenarios={savedScenarios}
      initialRetirementAge={client.retirementAge}
      initialMonthlySavingsAmount={client.monthlySavingsAmount}
      initialExpectedAnnualReturnPct={client.expectedAnnualReturnPct}
      initialWealthGoalAmount={client.wealthGoalAmount}
      initialWealthGoalAge={client.wealthGoalAge}
    />
  );
}
