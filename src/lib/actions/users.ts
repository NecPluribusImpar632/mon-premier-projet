"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/currentUser";
import { hashPassword } from "@/lib/auth/password";
import { isUserRole, MIN_PASSWORD_LENGTH, type UserRole } from "@/lib/auth/roles";

export interface AccountSummary {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  clientCount: number;
}

export type AccountFormState = { error?: string; success?: string } | undefined;

export async function getAccounts(): Promise<AccountSummary[]> {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { clients: true } },
    },
  });
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    role: isUserRole(user.role) ? user.role : "advisor",
    createdAt: user.createdAt,
    clientCount: user._count.clients,
  }));
}

function readPassword(formData: FormData): string | { error: string } {
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.` };
  }
  return password;
}

export async function createUser(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "advisor");
  const password = readPassword(formData);

  if (!email.includes("@")) return { error: "Adresse email invalide." };
  if (!isUserRole(role)) return { error: "Rôle inconnu." };
  if (typeof password !== "string") return password;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "Un compte existe déjà avec cet email." };

  await prisma.user.create({
    data: { email, role, passwordHash: await hashPassword(password) },
  });
  revalidatePath("/comptes");
  return { success: `Compte ${email} créé.` };
}

export async function resetUserPassword(
  userId: string,
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  await requireAdmin();

  const password = readPassword(formData);
  if (typeof password !== "string") return password;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return { error: "Compte introuvable." };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });
  return { success: `Mot de passe de ${user.email} mis à jour.` };
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  await requireAdmin();
  if (!isUserRole(role)) throw new Error("Rôle inconnu.");

  // Never demote the last admin: there would be nobody left able to manage
  // accounts, including restoring the role.
  if (role !== "admin") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (target?.role === "admin" && adminCount <= 1) {
      throw new Error("Impossible de retirer le rôle administrateur au dernier administrateur.");
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/comptes");
}
