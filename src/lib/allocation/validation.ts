import type { AllocationEntry } from "@/types/allocation";

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function getTotalPercentage(entries: AllocationEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.percentage, 0);
}

export function isAllocationComplete(entries: AllocationEntry[]): boolean {
  return (
    entries.every((entry) => entry.percentage >= 0 && entry.percentage <= 100) &&
    getTotalPercentage(entries) === 100
  );
}

/**
 * Converts nominal amounts per category into whole-number percentages
 * that always sum to exactly 100 (when the total is positive), using
 * the largest-remainder method to distribute rounding.
 */
export function percentagesFromAmounts(
  amounts: Record<string, number>,
  categoryIds: string[]
): Record<string, number> {
  const total = categoryIds.reduce((sum, id) => sum + (amounts[id] ?? 0), 0);

  if (total <= 0) {
    return Object.fromEntries(categoryIds.map((id) => [id, 0]));
  }

  const shares = categoryIds.map((id) => {
    const exact = ((amounts[id] ?? 0) / total) * 100;
    return { id, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });

  const remaining = 100 - shares.reduce((sum, s) => sum + s.floor, 0);
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder);

  const result: Record<string, number> = {};
  for (const share of shares) result[share.id] = share.floor;
  for (let i = 0; i < remaining; i++) {
    result[byRemainder[i].id] += 1;
  }

  return result;
}
