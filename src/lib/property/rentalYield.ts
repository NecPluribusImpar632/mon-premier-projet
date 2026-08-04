import type { Property } from "@/generated/prisma/client";

/** Gross rental yield (loyer annuel / valeur actuelle), in %. Null if the
 * property isn't rented or has no value to divide by. */
export function computeRentalYield(property: Property): number | null {
  if (property.monthlyRent === null || property.currentValue <= 0) {
    return null;
  }
  return ((property.monthlyRent * 12) / property.currentValue) * 100;
}
