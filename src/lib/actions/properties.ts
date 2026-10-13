"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isRateType } from "@/lib/property/rateType";
import { isDepartmentCode } from "@/lib/property/departments";
import { isAmortizationType } from "@/lib/property/loanTypes";
import { getCommunesForDepartment } from "@/lib/property/communesZonage";
import { PARIS_DEPARTMENT_CODE } from "@/lib/property/departments";
import { assertClientAccess } from "@/lib/auth/clientAccess";

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
  const isPrimaryResidence = formData.get("isPrimaryResidence") != null;

  const monthlyRentRaw = String(formData.get("monthlyRent") ?? "").trim();
  const monthlyRent =
    monthlyRentRaw === "" ? null : parseRequiredNonNegativeNumber(monthlyRentRaw);

  const acquisitionPriceRaw = String(formData.get("acquisitionPrice") ?? "").trim();
  const acquisitionPrice =
    acquisitionPriceRaw === "" ? null : parseRequiredNonNegativeNumber(acquisitionPriceRaw);

  const acquisitionDateRaw = String(formData.get("acquisitionDate") ?? "").trim();
  let acquisitionDate: Date | null = null;
  if (acquisitionDateRaw !== "") {
    const parsed = new Date(acquisitionDateRaw);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("La date d'acquisition n'est pas valide.");
    }
    acquisitionDate = parsed;
  }

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
  if (!isDepartmentCode(department)) {
    throw new Error("Merci de sélectionner un département valide.");
  }

  // The price/rate sensitivity resolves through the commune's A bis/A/B1/B2/C
  // zoning, so every department needs a commune except Paris, which is one
  // commune entirely in zone A bis (the arrondissement is kept for display).
  const needsCommune = department !== PARIS_DEPARTMENT_CODE;
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
    isPrimaryResidence,
    monthlyRent,
    acquisitionPrice,
    acquisitionDate,
    department,
    arrondissement,
    communeCode,
  };
}

function parseLoansFormData(formData: FormData) {
  const loanKeysRaw = String(formData.get("loanKeys") ?? "").trim();
  const loanKeys = loanKeysRaw === "" ? [] : loanKeysRaw.split(",");

  return loanKeys.map((key) => {
    const get = (field: string) => formData.get(`loan.${key}.${field}`);

    const labelRaw = String(get("label") ?? "").trim();
    const label = labelRaw === "" ? null : labelRaw;
    const originalAmount = parseRequiredNonNegativeNumber(get("originalAmount"));
    const remainingAmount = parseRequiredNonNegativeNumber(get("remainingAmount"));
    const rate = parseRequiredNonNegativeNumber(get("rate") || 0);
    const rateType = String(get("rateType") ?? "fixed");
    const amortizationType = String(get("amortizationType") ?? "amortissable");
    const termYearsRaw = Number(get("termYears"));

    if (!isRateType(rateType)) {
      throw new Error("Le type de taux d'un prêt doit être fixe ou variable.");
    }
    if (!isAmortizationType(amortizationType)) {
      throw new Error("Type d'amortissement de prêt invalide.");
    }
    if (!Number.isInteger(termYearsRaw) || termYearsRaw < 1) {
      throw new Error("La durée d'un prêt doit être un nombre entier d'années positif.");
    }

    let residualAmount: number | null = null;
    if (amortizationType === "partiel") {
      residualAmount = parseRequiredNonNegativeNumber(get("residualAmount"));
    }

    return {
      label,
      originalAmount,
      remainingAmount,
      rate,
      rateType,
      amortizationType,
      residualAmount,
      termYears: termYearsRaw,
    };
  });
}

// Each entry point checks the caller may see `clientId` (own client, or
// admin) before the property-belongs-to-client check that was already here.
export async function getProperty(propertyId: string, clientId: string) {
  await assertClientAccess(clientId);
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { loans: { orderBy: { createdAt: "asc" } } },
  });
  if (!property || property.clientId !== clientId) {
    return null;
  }
  return property;
}

export async function createProperty(clientId: string, formData: FormData) {
  await assertClientAccess(clientId);
  const data = parsePropertyFormData(formData);
  const loans = parseLoansFormData(formData);

  await prisma.property.create({
    data: { clientId, ...data, loans: { create: loans } },
  });

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
  const loans = parseLoansFormData(formData);

  // Simpler and just as correct as diffing: no other model references a
  // Loan by id, so a full delete-and-recreate of the set is safe.
  await prisma.$transaction([
    prisma.loan.deleteMany({ where: { propertyId } }),
    prisma.property.update({
      where: { id: propertyId },
      data: { ...data, loans: { create: loans } },
    }),
  ]);

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
