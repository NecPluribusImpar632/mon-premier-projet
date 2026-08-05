"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Download, PieChart, Target } from "lucide-react";
import type { SavedScenario } from "@/generated/prisma/client";
import type { ActionsProfileBreakdown } from "@/lib/allocation/stockProfiles";
import type { PropertyWithSensitivity } from "@/lib/scenarios/resolvePropertySensitivity";
import type { ClientScenarioContext } from "@/lib/scenarios/calculations";
import { ClientSidebar } from "@/components/client/ClientSidebar";
import type { ClientTab } from "@/lib/client/clientTabs";
import { ClientProfile } from "@/components/client/ClientProfile";
import { WealthGoalSection } from "@/components/client/WealthGoalSection";
import { RetirementGoalSection } from "@/components/client/RetirementGoalSection";
import { WealthSummary } from "@/components/allocation/WealthSummary";
import { ClientAllocationEditor } from "@/components/allocation/ClientAllocationEditor";
import { PropertyList } from "@/components/property/PropertyList";
import { PropertyOverview } from "@/components/property/PropertyOverview";
import { ScenarioSimulator } from "@/components/scenarios/ScenarioSimulator";
import { LinkPendingSpinner } from "@/components/ui/LinkPendingSpinner";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

interface ClientDetailTabsProps {
  clientId: string;
  clientName: string;
  currentAge: number;
  initialTab: ClientTab;

  initialRiskProfile: string | null;
  initialNotes: string | null;

  amounts: Record<string, number>;
  actionsBreakdown: ActionsProfileBreakdown;
  initialProfessionalToolMainIncome: boolean;
  financialWealthTotal: number;
  immobilierValue: number;
  properties: PropertyWithSensitivity[];

  actionsPctOverall: number;
  scenarioContext: ClientScenarioContext;
  initialSavedScenarios: SavedScenario[];

  initialRetirementAge: number | null;
  initialMonthlySavingsAmount: number | null;
  initialExpectedAnnualReturnPct: number | null;

  initialWealthGoalAmount: number | null;
  initialWealthGoalAge: number | null;
}

export function ClientDetailTabs({
  clientId,
  clientName,
  currentAge,
  initialTab,
  initialRiskProfile,
  initialNotes,
  amounts,
  actionsBreakdown,
  initialProfessionalToolMainIncome,
  financialWealthTotal,
  immobilierValue,
  properties,
  actionsPctOverall,
  scenarioContext,
  initialSavedScenarios,
  initialRetirementAge,
  initialMonthlySavingsAmount,
  initialExpectedAnnualReturnPct,
  initialWealthGoalAmount,
  initialWealthGoalAge,
}: ClientDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<ClientTab>(initialTab);

  return (
    <div className="flex h-screen">
      <ClientSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-line px-8 py-5">
          <div>
            <h1 className="font-serif text-2xl font-medium tracking-tight text-ink">
              {clientName}
            </h1>
            <p className="mt-0.5 text-sm text-slate">{currentAge} ans</p>
          </div>
          <a
            href={`/clients/${clientId}/pdf`}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-slate transition-colors hover:border-emerald hover:text-emerald"
          >
            <Download className="h-4 w-4" />
            Exporter en PDF
          </a>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-8">
          {activeTab === "overview" && (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
              <ClientProfile
                clientId={clientId}
                initialRiskProfile={initialRiskProfile}
                initialNotes={initialNotes}
              />
              <WealthSummary
                financialWealthTotal={financialWealthTotal}
                immobilierValue={immobilierValue}
                properties={properties}
                showConcentrationWarning={initialProfessionalToolMainIncome}
              />
            </div>
          )}

          {activeTab === "allocation" && (
            <div className="flex flex-col gap-4">
              <SectionHeading
                icon={PieChart}
                title="Allocation d'actifs"
                subtitle="Répartition du patrimoine par classe d'actifs"
              />
              <ClientAllocationEditor
                clientId={clientId}
                initialAmounts={amounts}
                initialActionsBreakdown={actionsBreakdown}
                initialProfessionalToolMainIncome={initialProfessionalToolMainIncome}
                properties={properties}
              />
            </div>
          )}

          {activeTab === "properties" && (
            <div className="flex flex-col gap-4">
              <SectionHeading
                icon={Building2}
                title="Biens immobiliers"
                subtitle="Patrimoine immobilier détenu par le client"
                action={
                  <Link
                    href={`/clients/${clientId}/properties/new`}
                    className={PRIMARY_BUTTON_CLASS}
                  >
                    Ajouter un bien
                    <LinkPendingSpinner />
                  </Link>
                }
              />
              <PropertyOverview properties={properties} />
              <PropertyList clientId={clientId} properties={properties} />
            </div>
          )}

          {activeTab === "scenarios" && (
            <ScenarioSimulator
              clientId={clientId}
              actionsPctOverall={actionsPctOverall}
              initialSavedScenarios={initialSavedScenarios}
              {...scenarioContext}
            />
          )}

          {activeTab === "goal" && (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
              <SectionHeading
                icon={Target}
                title="Objectif patrimonial"
                subtitle="La structure actuelle du portefeuille permet-elle d'atteindre une cible ?"
              />
              <WealthGoalSection
                clientId={clientId}
                currentAge={currentAge}
                amounts={amounts}
                actionsBreakdown={actionsBreakdown}
                properties={properties}
                immobilierValue={immobilierValue}
                initialWealthGoalAmount={initialWealthGoalAmount}
                initialWealthGoalAge={initialWealthGoalAge}
                retirementAge={initialRetirementAge}
              />
              <RetirementGoalSection
                clientId={clientId}
                currentAge={currentAge}
                financialWealthTotal={financialWealthTotal}
                immobilierValue={immobilierValue}
                properties={properties}
                initialRetirementAge={initialRetirementAge}
                initialMonthlySavingsAmount={initialMonthlySavingsAmount}
                initialExpectedAnnualReturnPct={initialExpectedAnnualReturnPct}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
