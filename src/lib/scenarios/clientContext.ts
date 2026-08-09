import type { ActionsIndexAllocation, Client } from "@/generated/prisma/client";
import {
  actionsIndexBreakdownFromClient,
  amountsFromClient,
  effectiveImmobilierAmount,
  financialTotalFromAmounts,
} from "@/lib/allocation/mapping";
import type { ClientScenarioContext } from "@/lib/scenarios/calculations";
import { withResolvedSensitivity } from "@/lib/scenarios/resolvePropertySensitivity";
import type { PropertyWithLoans } from "@/lib/property/loanCalculations";

/**
 * Assembles the scenario context (financial wealth, real estate, per-category
 * amounts) from a raw client row — the same construction was previously
 * duplicated across the simulator page, the comparison page, and now the PDF
 * export route, so it's centralized here.
 */
export function buildClientScenarioContext(
  client: Client & {
    properties: PropertyWithLoans[];
    actionsIndexAllocations: ActionsIndexAllocation[];
  }
): ClientScenarioContext {
  const amounts = amountsFromClient(client);
  const financialWealthTotal = financialTotalFromAmounts(amounts);
  const immobilierValue = effectiveImmobilierAmount(
    amounts.immobilier ?? 0,
    client.properties
  );
  const actionsPctWithinFinancial =
    financialWealthTotal > 0 ? ((amounts.actions ?? 0) / financialWealthTotal) * 100 : 0;

  return {
    financialWealthTotal,
    actionsPctWithinFinancial,
    actionsIndexBreakdown: actionsIndexBreakdownFromClient(client.actionsIndexAllocations),
    properties: withResolvedSensitivity(client.properties),
    immobilierValue,
    scpiAmount: amounts.scpi ?? 0,
    obligationsAmount: amounts.obligations ?? 0,
    privateEquityAmount: amounts["private-equity"] ?? 0,
    matieresPremieresAmount: amounts["matieres-premieres"] ?? 0,
    goldAmount: client.matieresPremieresGoldAmount,
    silverAmount: client.matieresPremieresSilverAmount,
  };
}
