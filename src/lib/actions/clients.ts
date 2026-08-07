"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  allocationFieldsFromAmounts,
  wrapperAllocationRowsFromBreakdown,
} from "@/lib/allocation/mapping";
import { ASSET_CATEGORIES, FINANCIAL_CATEGORY_IDS } from "@/lib/allocation/categories";
import type { ActionsProfileBreakdown } from "@/lib/allocation/stockProfiles";
import { WRAPPERS, type WrapperBreakdown } from "@/lib/allocation/wrappers";
import { isRiskProfile } from "@/lib/client/riskProfile";
import { isMaritalStatus } from "@/lib/client/maritalStatus";

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
      wrapperAllocations: true,
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

export async function updateWealthGoal(
  clientId: string,
  wealthGoalAmount: number,
  wealthGoalAge: number
) {
  if (!Number.isFinite(wealthGoalAmount) || wealthGoalAmount < 0) {
    throw new Error("L'objectif de patrimoine doit être un nombre positif.");
  }
  if (!Number.isInteger(wealthGoalAge) || wealthGoalAge < 0) {
    throw new Error("L'échéance doit être un âge entier positif.");
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { wealthGoalAmount, wealthGoalAge },
  });
  revalidatePath(`/clients/${clientId}`);
}

export interface FoyerFiscalData {
  maritalStatus: string | null;
  spouseName: string | null;
  spouseImmobilierAmount: number | null;
  spouseScpiAmount: number | null;
  spouseDebtAmount: number | null;
  minorChildrenCount: number | null;
  adultChildrenCount: number | null;
}

export async function updateFoyerFiscal(clientId: string, data: FoyerFiscalData) {
  if (data.maritalStatus !== null && !isMaritalStatus(data.maritalStatus)) {
    throw new Error("Situation familiale invalide.");
  }

  const amountFields = [
    data.spouseImmobilierAmount,
    data.spouseScpiAmount,
    data.spouseDebtAmount,
  ];
  if (amountFields.some((value) => value !== null && (!Number.isFinite(value) || value < 0))) {
    throw new Error("Les montants du conjoint doivent être des nombres positifs.");
  }

  const countFields = [data.minorChildrenCount, data.adultChildrenCount];
  if (
    countFields.some((value) => value !== null && (!Number.isInteger(value) || value < 0))
  ) {
    throw new Error("Le nombre d'enfants doit être un entier positif.");
  }

  await prisma.client.update({
    where: { id: clientId },
    data: {
      maritalStatus: data.maritalStatus,
      spouseName: data.spouseName,
      spouseImmobilierAmount: data.spouseImmobilierAmount,
      spouseScpiAmount: data.spouseScpiAmount,
      spouseDebtAmount: data.spouseDebtAmount,
      minorChildrenCount: data.minorChildrenCount,
      adultChildrenCount: data.adultChildrenCount,
    },
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

/**
 * Replaces one category's wrapper breakdown wholesale (delete then recreate,
 * same full-replace approach as updateClientAllocation) — simpler than
 * reconciling individual row diffs, and the write is already scoped to a
 * single category so it can't clobber the others.
 *
 * No sum-vs-category-total constraint: unlike the actions profile (a closed
 * 100% partition), the wrapper breakdown is intentionally partial — an
 * advisor may detail only part of a category and leave the rest unclassified
 * indefinitely.
 */
export async function updateWrapperBreakdown(
  clientId: string,
  category: string,
  breakdown: WrapperBreakdown
) {
  if (!(FINANCIAL_CATEGORY_IDS as string[]).includes(category)) {
    throw new Error("Catégorie invalide.");
  }
  const hasValidAmounts = WRAPPERS.every((wrapper) => {
    const amount = breakdown[wrapper];
    return Number.isFinite(amount) && amount >= 0;
  });
  if (!hasValidAmounts) {
    throw new Error("Chaque montant doit être un nombre positif.");
  }

  await prisma.$transaction([
    prisma.wrapperAllocation.deleteMany({ where: { clientId, category } }),
    prisma.wrapperAllocation.createMany({
      data: wrapperAllocationRowsFromBreakdown(clientId, category, breakdown),
    }),
  ]);
  revalidatePath(`/clients/${clientId}`);
}
