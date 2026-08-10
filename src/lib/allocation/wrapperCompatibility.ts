import type { Wrapper } from "./wrappers";

/**
 * Which enveloppes fiscales are actually legally/practically usable for each
 * category — sourced from the Code monétaire et financier (PEA, art. L221-31)
 * and standard assurance-vie/PER/CTO practice, not assumed. Full audit and
 * sources in the chat history. Two categories of exclusion:
 *
 *  - Hard exclusions (PEA for anything but Actions, SCPI on a CTO, any
 *    wrapper but "direct" for Entreprise/outil professionnel...): the
 *    combination is not legally/structurally possible, so it's not offered
 *    at all.
 *  - Marginal cases deliberately left out even though technically possible
 *    (PER/CTO for Liquidités, or/argent via assurance-vie/PER): either the
 *    match is misleading for what the category represents in this app
 *    (PER's capital is locked until retirement — not "liquide" in the sense
 *    this category means) or too contract-dependent/rare to be a useful
 *    default (a gold-tracking UC in assurance-vie exists on some contracts,
 *    but far from all).
 *
 * "Autres" is deliberately NOT restricted — it's an undefined catch-all, so
 * narrowing its options would be an unfounded guess about what it holds for
 * a given client.
 */
export const WRAPPER_COMPATIBILITY: Record<string, readonly Wrapper[]> = {
  actions: ["assurance-vie", "per", "cto", "pea", "direct"],
  obligations: ["assurance-vie", "per", "cto", "direct"],
  scpi: ["assurance-vie", "per", "direct"],
  liquidites: ["assurance-vie", "direct"],
  "private-equity": ["assurance-vie", "per", "cto", "direct"],
  "outil-professionnel": ["direct"],
  "matieres-premieres": ["cto", "direct"],
  autres: ["assurance-vie", "per", "cto", "pea", "direct"],
};

/** Short caveat shown next to a kept-but-nuanced combination — the wrapper
 * is genuinely usable, but not unconditionally the way the others are. */
export const WRAPPER_COMPATIBILITY_NOTES: Partial<
  Record<string, Partial<Record<Wrapper, string>>>
> = {
  actions: {
    pea: "Éligible même pour un indice non européen (S&P 500, Nasdaq...) via un ETF PEA à réplication synthétique — à vérifier sur le fonds réellement détenu.",
  },
  "private-equity": {
    cto: "Via des véhicules cotés (sociétés de capital-investissement cotées) — pas les FCPR/FPCI classiques, souscrits hors compte-titres.",
  },
  "matieres-premieres": {
    cto: "ETC or coté (réplique le cours spot) — pas l'or physique.",
  },
};

export function compatibleWrappers(categoryId: string): readonly Wrapper[] {
  return WRAPPER_COMPATIBILITY[categoryId] ?? [];
}
