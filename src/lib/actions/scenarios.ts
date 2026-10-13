"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ScenarioParams } from "@/lib/scenarios/scenarioParams";
import { assertClientAccess } from "@/lib/auth/clientAccess";

function validateScenarioParams(name: string, params: ScenarioParams) {
  if (!name.trim()) {
    throw new Error("Le nom du scénario est requis.");
  }
  const numericFields = [
    params.marketShockPct,
    params.oatRateChangePts,
    params.scpiShockPct,
    params.inflationPct,
    params.inflationYears,
    params.vacancyMonths,
    params.obligationsDurationYears,
    params.peIlliquidityDiscountPct,
  ];
  if (numericFields.some((value) => !Number.isFinite(value))) {
    throw new Error("Les valeurs du scénario doivent être des nombres valides.");
  }
  const optionalFields = [params.realEstateShockPct, params.obligationsShockPct];
  if (optionalFields.some((value) => value !== null && !Number.isFinite(value))) {
    throw new Error("Les chocs directs doivent être des nombres valides ou absents.");
  }
}

export async function getSavedScenarios(clientId: string) {
  await assertClientAccess(clientId);
  return prisma.savedScenario.findMany({
    where: { clientId },
    orderBy: { name: "asc" },
  });
}

async function getSavedScenario(id: string, clientId: string) {
  await assertClientAccess(clientId);
  const scenario = await prisma.savedScenario.findUnique({ where: { id } });
  if (!scenario || scenario.clientId !== clientId) {
    return null;
  }
  return scenario;
}

export async function createSavedScenario(
  clientId: string,
  name: string,
  params: ScenarioParams
) {
  await assertClientAccess(clientId);
  validateScenarioParams(name, params);
  const created = await prisma.savedScenario.create({
    data: { clientId, name: name.trim(), ...params },
  });
  revalidatePath(`/clients/${clientId}/scenarios`);
  return created;
}

export async function updateSavedScenario(
  id: string,
  clientId: string,
  name: string,
  params: ScenarioParams
) {
  const existing = await getSavedScenario(id, clientId);
  if (!existing) {
    throw new Error("Scénario introuvable pour ce client.");
  }
  validateScenarioParams(name, params);
  const updated = await prisma.savedScenario.update({
    where: { id },
    data: { name: name.trim(), ...params },
  });
  revalidatePath(`/clients/${clientId}/scenarios`);
  return updated;
}

export async function deleteSavedScenario(id: string, clientId: string) {
  const existing = await getSavedScenario(id, clientId);
  if (!existing) {
    throw new Error("Scénario introuvable pour ce client.");
  }
  await prisma.savedScenario.delete({ where: { id } });
  revalidatePath(`/clients/${clientId}/scenarios`);
}
