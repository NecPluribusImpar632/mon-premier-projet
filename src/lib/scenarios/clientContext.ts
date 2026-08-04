import type { Client } from "@/generated/prisma/client";
import {
  actionsBreakdownFromClient,
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
  client: Client & { properties: PropertyWithLoans[] }
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
    actionsBreakdown: actionsBreakdownFromClient(client),
    properties: withResolvedSensitivity(client.properties),
    immobilierValue,
    scpiAmount: amounts.scpi ?? 0,
    obligationsAmount: amounts.obligations ?? 0,
    privateEquityAmount: amounts["private-equity"] ?? 0,
  };
}
