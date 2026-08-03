"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isRateType } from "@/lib/property/rateType";
import { isDepartmentCode } from "@/lib/property/departments";
import { DEPARTMENT_SENSITIVITY } from "@/lib/scenarios/realEstateSensitivity";
import { getCommunesForDepartment } from "@/lib/property/communesZonage";

function parseRequiredNonNegativeNumber(value: unknown): number {
  const sanitized = String(value ?? "").replace(/[^\d.]/g, "");
  const parsed = Number(sanitized);
  if (sanitized === "" || !Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Merci de saisir un nombre positif.");
  }
  return parsed;
}

function parsePropertyFormData(formData: FormData) {
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

  // A commune is only meaningful (and only asked for in the form) for
  // departments without their own dedicated Notaires-INSEE coefficient: Paris
  // uses its arrondissement instead, and the other 7 IDF departments already
  // have a department-level coefficient regardless of commune.
  const needsCommune = department !== "75" && !(department in DEPARTMENT_SENSITIVITY);
  const communeCodeRaw = String(formData.get("communeCode") ?? "").trim();
  let communeCode: string | null = null;
  if (needsCommune) {
    const validCommunes = getCommunesForDepartment(department);
    if (!validCommunes.some((c) => c.code === communeCodeRaw)) {
      throw new Error("Merci de sélectionner une commune valide pour ce département.");
    }
    communeCode = communeCodeRaw;
  }

  return {
    name,
    currentValue,
    monthlyRent,
    remainingLoanAmount,
    loanRate,
    rateType,
    department,
    arrondissement,
    communeCode,
  };
}

export async function getProperty(propertyId: string, clientId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property || property.clientId !== clientId) {
    return null;
  }
  return property;
}

export async function createProperty(clientId: string, formData: FormData) {
  const data = parsePropertyFormData(formData);

  await prisma.property.create({ data: { clientId, ...data } });

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

export async function updateProperty(
  propertyId: string,
  clientId: string,
  formData: FormData
) {
  const existing = await getProperty(propertyId, clientId);
  if (!existing) {
    throw new Error("Bien introuvable pour ce client.");
  }

  const data = parsePropertyFormData(formData);

  await prisma.property.update({ where: { id: propertyId }, data });

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

export async function deleteProperty(propertyId: string, clientId: string) {
  const existing = await getProperty(propertyId, clientId);
  if (!existing) {
    throw new Error("Bien introuvable pour ce client.");
  }

  await prisma.property.delete({ where: { id: propertyId } });
  revalidatePath(`/clients/${clientId}`);
}
