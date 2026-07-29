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
