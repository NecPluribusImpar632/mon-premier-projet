"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isRateType } from "@/lib/property/rateType";
import { isDepartmentCode } from "@/lib/property/departments";

function parseRequiredNonNegativeNumber(value: unknown): number {
  const sanitized = String(value ?? "").replace(/[^\d.]/g, "");
  const parsed = Number(sanitized);
  if (sanitized === "" || !Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Merci de saisir un nombre positif.");
  }
  return parsed;
}

export async function createProperty(clientId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const currentValue = parseRequiredNonNegativeNumber(formData.get("currentValue"));

  const monthlyRentRaw = String(formData.get("monthlyRent") ?? "").trim();
  const monthlyRent =
    monthlyRentRaw === "" ? null : parseRequiredNonNegativeNumber(monthlyRentRaw);

  const remainingLoanAmount = parseRequiredNonNegativeNumber(
    formData.get("remainingLoanAmount") || 0
  );
  const loanRate = parseRequiredNonNegativeNumber(formData.get("loanRate") || 0);
  const rateType = String(formData.get("rateType") ?? "fixed");
  const department = String(formData.get("department") ?? "").trim();

  const arrondissementRaw = String(formData.get("arrondissement") ?? "").trim();
  let arrondissement: number | null = null;
  if (department === "75" && arrondissementRaw !== "") {
    const parsed = Number(arrondissementRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
      throw new Error("L'arrondissement doit être compris entre 1 et 20.");
    }
    arrondissement = parsed;
  }

  if (!name) {
    throw new Error("Le nom / l'adresse du bien est requis.");
  }
  if (!isRateType(rateType)) {
    throw new Error("Le type de taux doit être fixe ou variable.");
  }
  if (!isDepartmentCode(department)) {
    throw new Error("Merci de sélectionner un département valide.");
  }

  await prisma.property.create({
    data: {
      clientId,
      name,
      currentValue,
      monthlyRent,
      remainingLoanAmount,
      loanRate,
      rateType,
      department,
      arrondissement,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}
