"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  allocationFieldsFromAmounts,
  wrapperAllocationRowsFromBreakdown,
  actionsIndexAllocationRowsFromBreakdown,
} from "@/lib/allocation/mapping";
import { ASSET_CATEGORIES, FINANCIAL_CATEGORY_IDS } from "@/lib/allocation/categories";
import type { ActionsIndexBreakdown } from "@/lib/allocation/actionsIndexBreakdown";
import { REFERENCE_INDICES } from "@/lib/allocation/referenceIndices";
import { WRAPPERS, type WrapperBreakdown } from "@/lib/allocation/wrappers";
import { PRECIOUS_METALS, type PreciousMetalsBreakdown } from "@/lib/allocation/preciousMetals";
import { isRiskProfile } from "@/lib/client/riskProfile";
import { isMaritalStatus } from "@/lib/client/maritalStatus";
import { clientScope, requireUser } from "@/lib/auth/currentUser";
import type { AnnualFeesPct } from "@/lib/wealth/monteCarloAssumptions";
import { assertClientAccess } from "@/lib/auth/clientAccess";
import { amountsFromClient } from "@/lib/allocation/mapping";
import {
  PROPOSAL_CATEGORY_IDS,
  PROPOSAL_TOTAL_TOLERANCE,
  actionsIndexBreakdownToJson,
  proposalTotal,
  type WealthGoalProposalData,
} from "@/lib/wealth/wealthGoalProposal";
import { actionsIndexBreakdownTotal } from "@/lib/allocation/actionsIndexBreakdown";

// Every read is scoped to the signed-in user (an admin sees everything, an
// advisor only their own clients), and every write starts with
// assertClientAccess: server actions are public POST endpoints, the proxy's
// cookie check alone would let any logged-in account edit any clientId.

export async function getClients() {
  const user = await requireUser();
  return prisma.client.findMany({
    where: clientScope(user),
    orderBy: { name: "asc" },
    include: {
      properties: { include: { loans: true } },
      owner: { select: { email: true } },
    },
  });
}

export async function getClient(id: string) {
  const user = await requireUser();
  return prisma.client.findFirst({
    where: { id, ...clientScope(user) },
    include: {
      properties: {
        orderBy: { createdAt: "asc" },
        include: { loans: { orderBy: { createdAt: "asc" } } },
      },
      wrapperAllocations: true,
      actionsIndexAllocations: true,
      wealthGoalProposal: true,
    },
  });
}

export async function createClient(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const age = Number(formData.get("age"));

  if (!name || !Number.isFinite(age)) {
    throw new Error("Le nom et l'âge sont requis.");
  }

  const client = await prisma.client.create({
    data: { name, age, ownerId: user.id },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function deleteClient(clientId: string) {
  await assertClientAccess(clientId);
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

  await assertClientAccess(clientId);
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
  await assertClientAccess(clientId);
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

  await assertClientAccess(clientId);
  await prisma.client.update({
    where: { id: clientId },
    data: { riskProfile, notes },
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function updateWealthGoal(
  clientId: string,
  wealthGoalAmount: number,
  wealthGoalAge: number,
  wealthGoalInflationPct: number,
  monthlySavingsAmount: number
) {
  if (!Number.isFinite(wealthGoalAmount) || wealthGoalAmount < 0) {
    throw new Error("L'objectif de patrimoine doit être un nombre positif.");
  }
  if (!Number.isInteger(wealthGoalAge) || wealthGoalAge < 0) {
    throw new Error("L'échéance doit être un âge entier positif.");
  }
  if (
    !Number.isFinite(wealthGoalInflationPct) ||
    wealthGoalInflationPct < 0 ||
    wealthGoalInflationPct > 20
  ) {
    throw new Error("Le taux d'inflation doit être compris entre 0 et 20 %.");
  }
  if (!Number.isFinite(monthlySavingsAmount) || monthlySavingsAmount < 0) {
    throw new Error("L'épargne mensuelle doit être un nombre positif.");
  }

  await assertClientAccess(clientId);
  await prisma.client.update({
    where: { id: clientId },
    data: { wealthGoalAmount, wealthGoalAge, wealthGoalInflationPct, monthlySavingsAmount },
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function updateWealthGoalFees(clientId: string, fees: AnnualFeesPct) {
  validateFees(fees);

  await assertClientAccess(clientId);
  await prisma.client.update({
    where: { id: clientId },
    data: {
      feesActionsPct: fees.actions,
      feesObligationsPct: fees.obligations,
      feesScpiPct: fees.scpi,
      feesPrivateEquityPct: fees.privateEquity,
      feesImmobilierPct: fees.immobilier,
    },
  });
  revalidatePath(`/clients/${clientId}`);
}

function validateFees(fees: AnnualFeesPct) {
  const values = Object.values(fees);
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 10)) {
    throw new Error("Chaque taux de frais doit être compris entre 0 et 10 %.");
  }
}

/**
 * One proposed allocation per client (upsert). The "same total" constraint
 * is checked against the client's financial wealth as stored right now, not
 * against a figure sent by the browser: the proposal reallocates the six
 * financial postes, it never creates money. Outil professionnel and Autres
 * are part of the financial total but stay fixed, so the proposal must
 * match the six-poste share of that total.
 */
export async function saveWealthGoalProposal(clientId: string, data: WealthGoalProposalData) {
  for (const id of PROPOSAL_CATEGORY_IDS) {
    const value = data.amounts[id];
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Chaque montant proposé doit être un nombre positif.");
    }
  }
  if (actionsIndexBreakdownTotal(data.actionsIndexBreakdown) !== 100) {
    throw new Error("La répartition par indice de la proposition doit faire 100 %.");
  }
  validateFees(data.fees);

  await assertClientAccess(clientId);
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new Error("Client introuvable.");

  const currentAmounts = amountsFromClient(client);
  const reallocatableTotal = PROPOSAL_CATEGORY_IDS.reduce(
    (sum, id) => sum + (currentAmounts[id] ?? 0),
    0
  );
  if (Math.abs(proposalTotal(data.amounts) - reallocatableTotal) > PROPOSAL_TOTAL_TOLERANCE) {
    throw new Error(
      "Le total de la proposition doit être égal à la poche financière actuelle : on réalloue, on ne crée pas d'argent."
    );
  }

  const row = {
    actionsAmount: data.amounts.actions,
    obligationsAmount: data.amounts.obligations,
    scpiAmount: data.amounts.scpi,
    liquiditesAmount: data.amounts.liquidites,
    privateEquityAmount: data.amounts["private-equity"],
    matieresPremieresAmount: data.amounts["matieres-premieres"],
    actionsIndexBreakdown: actionsIndexBreakdownToJson(data.actionsIndexBreakdown),
    feesActionsPct: data.fees.actions,
    feesObligationsPct: data.fees.obligations,
    feesScpiPct: data.fees.scpi,
    feesPrivateEquityPct: data.fees.privateEquity,
    feesImmobilierPct: data.fees.immobilier,
  };
  await prisma.wealthGoalProposal.upsert({
    where: { clientId },
    update: row,
    create: { clientId, ...row },
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteWealthGoalProposal(clientId: string) {
  await assertClientAccess(clientId);
  await prisma.wealthGoalProposal.deleteMany({ where: { clientId } });
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

  await assertClientAccess(clientId);
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

/**
 * Replaces the Actions bucket's index breakdown wholesale (delete then
 * recreate, same full-replace approach as the wrapper breakdown). Unlike the
 * wrapper breakdown, this stays a closed 100% partition (validated client-side
 * by clamping each field as you type, same UX contract as the old
 * Indiciel/Défensif/Croissance breakdown) — but the server only checks each
 * value is a valid percentage, not that they sum to 100, so a mid-edit or
 * partial state never fails to save.
 */
export async function updateActionsIndexBreakdown(
  clientId: string,
  breakdown: ActionsIndexBreakdown
) {
  const hasValidPercentages = REFERENCE_INDICES.every((index) => {
    const value = breakdown[index];
    return Number.isFinite(value) && value >= 0 && value <= 100;
  });
  if (!hasValidPercentages) {
    throw new Error("Chaque pourcentage doit être compris entre 0 et 100.");
  }

  await assertClientAccess(clientId);
  await prisma.$transaction([
    prisma.actionsIndexAllocation.deleteMany({ where: { clientId } }),
    prisma.actionsIndexAllocation.createMany({
      data: actionsIndexAllocationRowsFromBreakdown(clientId, breakdown),
    }),
  ]);
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

  await assertClientAccess(clientId);
  await prisma.$transaction([
    prisma.wrapperAllocation.deleteMany({ where: { clientId, category } }),
    prisma.wrapperAllocation.createMany({
      data: wrapperAllocationRowsFromBreakdown(clientId, category, breakdown),
    }),
  ]);
  revalidatePath(`/clients/${clientId}`);
}

/**
 * Or/argent split of the "Matières premières" amount — real holdings data
 * (the advisor knows this the way they know the Actions sub-profile), so it
 * lives on Client directly, not as a scenario parameter re-entered per
 * simulation. No sum-vs-category-total constraint, same reasoning as the
 * wrapper breakdown: partial detail is allowed, the rest just stays
 * unclassified (and unshocked) rather than blocking the save.
 */
export async function updateMatieresPremieresBreakdown(
  clientId: string,
  breakdown: PreciousMetalsBreakdown
) {
  const hasValidAmounts = PRECIOUS_METALS.every((metal) => {
    const amount = breakdown[metal];
    return Number.isFinite(amount) && amount >= 0;
  });
  if (!hasValidAmounts) {
    throw new Error("Chaque montant doit être un nombre positif.");
  }

  await assertClientAccess(clientId);
  await prisma.client.update({
    where: { id: clientId },
    data: {
      matieresPremieresGoldAmount: breakdown.or,
      matieresPremieresSilverAmount: breakdown.argent,
    },
  });
  revalidatePath(`/clients/${clientId}`);
}
