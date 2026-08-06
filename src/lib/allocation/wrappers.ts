export const WRAPPERS = ["assurance-vie", "per", "cto", "pea", "direct"] as const;

export type Wrapper = (typeof WRAPPERS)[number];

export const WRAPPER_LABELS: Record<Wrapper, string> = {
  "assurance-vie": "Assurance-vie",
  per: "PER",
  cto: "Compte-titres (CTO)",
  pea: "PEA",
  direct: "Détention directe",
};

export type WrapperBreakdown = Record<Wrapper, number>;

export function emptyWrapperBreakdown(): WrapperBreakdown {
  return { "assurance-vie": 0, per: 0, cto: 0, pea: 0, direct: 0 };
}

export function wrapperBreakdownTotal(breakdown: WrapperBreakdown): number {
  return WRAPPERS.reduce((sum, wrapper) => sum + breakdown[wrapper], 0);
}
