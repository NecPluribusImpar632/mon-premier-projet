import type { Client } from "@/generated/prisma/client";
import type { ClientFlowsData } from "@/lib/actions/clients";
import { fiscalPartsFromFoyer } from "@/lib/fiscal/incomeTax";
import type { WealthGoalFlows } from "@/lib/wealth/cashFlows";

/** The persisted flows as the tab edits them (null columns read as 0). */
export function flowsDataFromClient(client: Client): ClientFlowsData {
  return {
    incomeFranceAnnual: client.incomeFranceAnnual ?? 0,
    incomeForeignAnnual: client.incomeForeignAnnual ?? 0,
    livingExpensesAnnual: client.livingExpensesAnnual ?? 0,
    savingsFromFlows: client.savingsFromFlows,
  };
}

/** What the Monte Carlo engine needs, or null when the client is in manual
 * savings mode. Server-side counterpart of what WealthGoalSection builds. */
export function engineFlowsFromClient(client: Client): WealthGoalFlows | null {
  if (!client.savingsFromFlows) return null;
  const data = flowsDataFromClient(client);
  return {
    incomeFranceAnnual: data.incomeFranceAnnual,
    incomeForeignAnnual: data.incomeForeignAnnual,
    livingExpensesAnnual: data.livingExpensesAnnual,
    fiscalParts: fiscalPartsFromFoyer(client.maritalStatus, client.minorChildrenCount),
  };
}
