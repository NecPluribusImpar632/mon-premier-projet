import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { getClient } from "@/lib/actions/clients";
import { ClientProfilePdf } from "@/lib/pdf/ClientProfilePdf";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/clients/[id]/pdf">
) {
  const { id } = await ctx.params;
  const client = await getClient(id);

  if (!client) {
    return new Response("Client introuvable", { status: 404 });
  }

  const buffer = await renderToBuffer(
    createElement(ClientProfilePdf, { client }) as ReactElement<DocumentProps>
  );
  const filename = `dossier-${client.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
