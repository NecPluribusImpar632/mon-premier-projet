import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { isUserRole, type UserRole } from "@/lib/auth/roles";

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * The signed-in user, read from the session cookie and then from the
 * database (the cookie only carries the user id, so the role is always the
 * live one). Cached per request: pages and the actions they call share a
 * single lookup. The proxy's cookie check is the first barrier; this is the
 * one every data access actually relies on.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await verifySession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true },
  });
  if (!user) return null;
  return { id: user.id, email: user.email, role: isUserRole(user.role) ? user.role : "advisor" };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Admin-only pages and actions. A normal advisor gets a 404 rather than a
 * "forbidden" hint that the page exists. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}

/** The `where` fragment that restricts client queries to what this user may
 * see: everything for an admin, only their own clients otherwise. Clients
 * with no owner (none today, see the backfill migration) are admin-only. */
export function clientScope(user: CurrentUser): { ownerId?: string } {
  return user.role === "admin" ? {} : { ownerId: user.id };
}
