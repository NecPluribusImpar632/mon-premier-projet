export const PRECIOUS_METALS = ["or", "argent"] as const;

export type PreciousMetal = (typeof PRECIOUS_METALS)[number];

export const PRECIOUS_METAL_LABELS: Record<PreciousMetal, string> = {
  or: "Or",
  argent: "Argent",
};

export type PreciousMetalsBreakdown = Record<PreciousMetal, number>;

export function emptyPreciousMetalsBreakdown(): PreciousMetalsBreakdown {
  return { or: 0, argent: 0 };
}

export function preciousMetalsBreakdownTotal(breakdown: PreciousMetalsBreakdown): number {
  return PRECIOUS_METALS.reduce((sum, metal) => sum + breakdown[metal], 0);
}
