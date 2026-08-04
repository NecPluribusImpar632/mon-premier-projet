"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { allocationFieldsFromAmounts } from "@/lib/allocation/mapping";
import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import type { ActionsProfileBreakdown } from "@/lib/allocation/stockProfiles";
import { isRiskProfile } from "@/lib/client/riskProfile";

export async function getClients() {
  return prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { properties: { include: { loans: true } } },
  });
}

export async function getClient(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      properties: {
        orderBy: { createdAt: "asc" },
        include: { loans: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
}

export async function createClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const age = Number(formData.get("age"));

  if (!name || !Number.isFinite(age)) {
    throw new Error("Le nom et l'âge sont requis.");
  }

  const client = await prisma.client.create({
    data: { name, age },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function deleteClient(clientId: string) {
  await prisma.client.delete({ where: { id: clientId } });
  revalidatePath("/clients");
}

export async function updateClientAllocation(
  clientId: string,
  amounts: Record<string, number>
) {
  const hasValidAmounts = ASSET_CATEGORIES.every((category) => {
    const amount = amounts[category.id] ?? 0;
    return Number.isFinite(amount) && amount >= 0;
  });
  if (!hasValidAmounts) {
    throw new Error("Chaque montant doit être un nombre positif.");
  }

  await prisma.client.update({
    where: { id: clientId },
    data: allocationFieldsFromAmounts(amounts),
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function updateProfessionalToolMainIncome(
  clientId: string,
  mainIncome: boolean
) {
  await prisma.client.update({
    where: { id: clientId },
    data: { professionalToolMainIncome: mainIncome },
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function updateClientProfile(
  clientId: string,
  riskProfile: string | null,
  notes: string | null
) {
  if (riskProfile !== null && !isRiskProfile(riskProfile)) {
    throw new Error("Profil de risque invalide.");
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { riskProfile, notes },
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function updateRetirementGoal(
  clientId: string,
  retirementAge: number,
  monthlySavingsAmount: number,
  expectedAnnualReturnPct: number
) {
  if (!Number.isInteger(retirementAge) || retirementAge < 0) {
    throw new Error("L'âge de départ à la retraite doit être un nombre entier positif.");
  }
  if (!Number.isFinite(monthlySavingsAmount) || monthlySavingsAmount < 0) {
    throw new Error("L'épargne mensuelle doit être un nombre positif.");
  }
  if (!Number.isFinite(expectedAnnualReturnPct)) {
    throw new Error("Le rendement attendu doit être un nombre.");
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { retirementAge, monthlySavingsAmount, expectedAnnualReturnPct },
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function updateActionsProfile(
  clientId: string,
  breakdown: ActionsProfileBreakdown
) {
  const hasValidPercentages = Object.values(breakdown).every(
    (value) => Number.isFinite(value) && value >= 0 && value <= 100
  );
  if (!hasValidPercentages) {
    throw new Error("Chaque pourcentage doit être compris entre 0 et 100.");
  }

  await prisma.client.update({
    where: { id: clientId },
    data: {
      actionsIndicielPct: breakdown.indiciel,
      actionsDefensifPct: breakdown.defensif,
      actionsCroissancePct: breakdown.croissance,
    },
  });
  revalidatePath(`/clients/${clientId}`);
}
