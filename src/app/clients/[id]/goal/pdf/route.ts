import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { getClient } from "@/lib/actions/clients";
import {
  actionsIndexBreakdownFromClient,
  amountsFromClient,
  effectiveImmobilierAmount,
} from "@/lib/allocation/mapping";
import { DEFAULT_ANNUAL_FEES_PCT } from "@/lib/wealth/monteCarloAssumptions";
import { computeWealthGoalComparison } from "@/lib/wealth/wealthGoalComparison";
import { proposalDataFromRow } from "@/lib/wealth/wealthGoalProposal";
import { WealthGoalComparisonPdf } from "@/lib/pdf/WealthGoalComparisonPdf";
import { engineFlowsFromClient } from "@/lib/wealth/clientFlows";

/** The before/after comparison, recomputed server-side from what is
 * persisted (goal, horizon, inflation, savings, fees, proposal), so the
 * printed figures are exactly those the tab shows after its last save. */
export async function GET(_request: Request, ctx: RouteContext<"/clients/[id]/goal/pdf">) {
  const { id } = await ctx.params;
  const client = await getClient(id);

  if (!client) {
    return new Response("Client introuvable", { status: 404 });
  }
  if (!client.wealthGoalProposal) {
    return new Response("Aucune allocation proposée pour ce client", { status: 404 });
  }

  const amounts = amountsFromClient(client);
  const targetAge = client.wealthGoalAge ?? client.age + 20;
  const inflationPct = client.wealthGoalInflationPct ?? 2;
  const monthlySavingsAmount = client.monthlySavingsAmount ?? 0;
  const flows = engineFlowsFromClient(client);

  const comparison = computeWealthGoalComparison(
    {
      amounts,
      properties: client.properties,
      immobilierValue: effectiveImmobilierAmount(amounts.immobilier ?? 0, client.properties),
    },
    {
      currentAge: client.age,
      targetAge,
      targetAmount: client.wealthGoalAmount ?? 0,
      inflationPct,
      actionsIndexBreakdown: actionsIndexBreakdownFromClient(client.actionsIndexAllocations),
      monthlySavingsAmount,
      flows,
      fees: {
        actions: client.feesActionsPct ?? DEFAULT_ANNUAL_FEES_PCT.actions,
        obligations: client.feesObligationsPct ?? DEFAULT_ANNUAL_FEES_PCT.obligations,
        scpi: client.feesScpiPct ?? DEFAULT_ANNUAL_FEES_PCT.scpi,
        privateEquity: client.feesPrivateEquityPct ?? DEFAULT_ANNUAL_FEES_PCT.privateEquity,
        immobilier: client.feesImmobilierPct ?? DEFAULT_ANNUAL_FEES_PCT.immobilier,
      },
    },
    proposalDataFromRow(client.wealthGoalProposal)
  );

  const buffer = await renderToBuffer(
    createElement(WealthGoalComparisonPdf, {
      clientName: client.name,
      currentAge: client.age,
      targetAge,
      inflationPct,
      monthlySavingsAmount,
      comparison,
    }) as ReactElement<DocumentProps>
  );
  const filename = `objectif-comparaison-${client.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
