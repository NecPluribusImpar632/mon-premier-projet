"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { allocationFieldsFromEntries } from "@/lib/allocation/mapping";
import type { AllocationEntry } from "@/types/allocation";

export async function getClients() {
  return prisma.client.findMany({ orderBy: { name: "asc" } });
}

export async function getClient(id: string) {
  return prisma.client.findUnique({ where: { id } });
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

export async function updateClientAllocation(
  clientId: string,
  entries: AllocationEntry[]
) {
  await prisma.client.update({
    where: { id: clientId },
    data: allocationFieldsFromEntries(entries),
  });
  revalidatePath(`/clients/${clientId}`);
}
