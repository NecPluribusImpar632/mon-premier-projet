import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { getClient } from "@/lib/actions/clients";
import { buildClientScenarioContext } from "@/lib/scenarios/clientContext";
import { scenarioParamsFromSearchParams } from "@/lib/scenarios/scenarioParams";
import { ScenarioSimulationPdf } from "@/lib/pdf/ScenarioSimulationPdf";

export async function GET(
  request: Request,
  ctx: RouteContext<"/clients/[id]/scenarios/pdf">
) {
  const { id } = await ctx.params;
  const client = await getClient(id);

  if (!client) {
    return new Response("Client introuvable", { status: 404 });
  }

  const url = new URL(request.url);
  const params = scenarioParamsFromSearchParams(url.searchParams);
  const scenarioLabel = url.searchParams.get("scenarioLabel") || "Scénario personnalisé";
  const context = buildClientScenarioContext(client);

  const buffer = await renderToBuffer(
    createElement(ScenarioSimulationPdf, {
      clientName: client.name,
      scenarioLabel,
      context,
      params,
    }) as ReactElement<DocumentProps>
  );
  const filename = `simulation-${client.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
