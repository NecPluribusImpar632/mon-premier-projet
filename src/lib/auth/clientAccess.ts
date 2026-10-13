import "server-only";
import { prisma } from "@/lib/prisma";
import { clientScope, requireUser, type CurrentUser } from "@/lib/auth/currentUser";

/**
 * Guard for every server action that receives a `clientId`: server actions
 * are public POST endpoints, so the proxy's cookie check is not enough, each
 * one must confirm the client is visible to the caller. Throws the same
 * message whether the client doesn't exist or belongs to someone else, so
 * the error reveals nothing about other advisors' clients.
 */
export async function assertClientAccess(clientId: string): Promise<CurrentUser> {
  const user = await requireUser();
  const client = await prisma.client.findFirst({
    where: { id: clientId, ...clientScope(user) },
    select: { id: true },
  });
  if (!client) {
    throw new Error("Client introuvable.");
  }
  return user;
}
