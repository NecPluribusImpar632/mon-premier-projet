import type { FullScenarioResult, ScenarioImpactPost } from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";
import { roundPercent } from "@/lib/format/percent";

export type FactRole = "amortisseur" | "aggravant" | "contreIntuitif";

export interface HighlightedFact {
  role: FactRole;
  post: ScenarioImpactPost;
}

/**
 * Deterministic seed derived from which posts are active and by how much —
 * same scenario state always picks the same template variants (stable
 * across re-renders), while a different client/scenario naturally lands on
 * a different seed and therefore different phrasing.
 */
function seedFromPosts(posts: ScenarioImpactPost[]): number {
  const key = posts.map((post) => `${post.id}:${Math.round(post.delta)}`).join("|");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pick<T>(items: T[], seed: number, salt: number): T {
  return items[(seed + salt) % items.length];
}

/**
 * Picks 2-3 "faits marquants" from the posts already computed by
 * computeFullScenarioImpact — no post id is ever referenced by name here, so
 * a future asset class (assurance vie, or/argent...) is picked up
 * automatically the day it gets its own post.
 */
export function selectHighlightedFacts(
  posts: ScenarioImpactPost[],
  totalBefore: number
): HighlightedFact[] {
  const active = posts.filter((post) => post.delta !== 0);
  if (active.length === 0) return [];

  const facts: HighlightedFact[] = [];

  const amortisseur = active
    .filter((post) => post.delta > 0)
    .reduce<ScenarioImpactPost | null>(
      (best, post) => (!best || post.delta > best.delta ? post : best),
      null
    );
  if (amortisseur) facts.push({ role: "amortisseur", post: amortisseur });

  const aggravant = active
    .filter((post) => post.delta < 0)
    .reduce<ScenarioImpactPost | null>(
      (worst, post) => (!worst || post.delta < worst.delta ? post : worst),
      null
    );
  if (aggravant) facts.push({ role: "aggravant", post: aggravant });

  // Among what's left, the post whose relative swing (|deltaPct|) is large
  // despite carrying little weight in the overall patrimoine is the
  // "surprising" one — a comparative score between posts, never a fixed cutoff.
  const remaining = active.filter(
    (post) => post.id !== amortisseur?.id && post.id !== aggravant?.id
  );
  if (remaining.length > 0 && totalBefore > 0) {
    const surpriseScore = (post: ScenarioImpactPost) =>
      post.deltaPct !== null ? Math.abs(post.deltaPct) * (1 - post.valueBefore / totalBefore) : 0;

    const scored = remaining
      .filter((post): post is ScenarioImpactPost & { deltaPct: number } => post.deltaPct !== null)
      .map((post) => ({ post, surprise: surpriseScore(post) }))
      .sort((a, b) => b.surprise - a.surprise);

    // The 3rd fact must stand out from the other leftover posts (not just be
    // the least-uninteresting one) AND be roughly as intense as what the
    // amortisseur/aggravant already earned their spot with — otherwise a
    // barely-moving post could get called out as "surprising" purely for
    // lack of competition.
    const referenceScores = [amortisseur, aggravant].filter((post) => post !== null).map(surpriseScore);
    const referenceAvg =
      referenceScores.length > 0
        ? referenceScores.reduce((sum, value) => sum + value, 0) / referenceScores.length
        : 0;

    const top = scored[0];
    const runnerUpSurprise = scored[1]?.surprise ?? 0;
    if (
      top &&
      top.surprise > 0 &&
      top.surprise > runnerUpSurprise * 1.5 &&
      (referenceAvg === 0 || top.surprise > referenceAvg * 0.5)
    ) {
      facts.push({ role: "contreIntuitif", post: top.post });
    }
  }

  return facts;
}

// One-line factual note per post, shown only in the "En savoir plus" detail
// list — never reused inside the narrative paragraph itself.
export const POST_METHODOLOGY_NOTES: Record<string, string> = {
  actions: "Choc de marché pondéré selon le profil (indiciel / défensif / croissance).",
  realEstate: "Revalorisation selon la sensibilité prix/taux calibrée par zone.",
  scpi: "Décote de part appliquée au montant détenu.",
  obligations: "Approximation de duration : ΔPrix/Prix ≈ -duration × Δtaux.",
  privateEquity: "Décote de sortie anticipée sur le marché secondaire.",
  debtErosion: "Érosion de la valeur réelle de la dette à taux fixe restante.",
  vacancy: "Perte de loyer sur la durée de vacance simulée.",
};

interface Template {
  sg: string;
  pl: string;
}

// All templates lead with a lowercase {noun} — the composer capitalizes the
// opening sentence itself rather than baking capitalization into templates,
// since whether a given fact opens the paragraph depends on what else got
// selected alongside it.
const AMORTISSEUR_TEMPLATES: Template[] = [
  {
    sg: "{noun} joue un rôle d'amortisseur ici, avec un effet favorable de {value}.",
    pl: "{noun} jouent un rôle d'amortisseur ici, avec un effet favorable de {value}.",
  },
  {
    sg: "ce choc est en partie compensé par {noun}, qui progresse de {value}.",
    pl: "ce choc est en partie compensé par {noun}, qui progressent de {value}.",
  },
  {
    sg: "{noun} limite la casse, avec {value} de gain sur ce poste.",
    pl: "{noun} limitent la casse, avec {value} de gain sur ce poste.",
  },
  {
    sg: "{noun} apporte un vrai contrepoids, à hauteur de {value}.",
    pl: "{noun} apportent un vrai contrepoids, à hauteur de {value}.",
  },
];

const AGGRAVANT_TEMPLATES: Template[] = [
  {
    sg: "{noun} concentre l'essentiel du choc, avec {value} de perte.",
    pl: "{noun} concentrent l'essentiel du choc, avec {value} de perte.",
  },
  {
    sg: "c'est {noun} qui pèse le plus dans ce scénario, à hauteur de {value}.",
    pl: "ce sont {noun} qui pèsent le plus dans ce scénario, à hauteur de {value}.",
  },
  {
    sg: "{noun} reste le principal point de vigilance, avec {value} d'impact.",
    pl: "{noun} restent le principal point de vigilance, avec {value} d'impact.",
  },
  {
    sg: "{noun} encaisse le plus gros du choc, pour {value}.",
    pl: "{noun} encaissent le plus gros du choc, pour {value}.",
  },
];

// These already carry their own capitalized lead-in, so the composer never
// prefixes them with a connector or re-capitalizes them.
const CONTRE_INTUITIF_TEMPLATES: Template[] = [
  {
    sg: "Plus surprenant : {noun} varie de {value}, alors que ce poste pèse peu dans l'ensemble.",
    pl: "Plus surprenant : {noun} varient de {value}, alors que ce poste pèse peu dans l'ensemble.",
  },
  {
    sg: "On notera aussi {noun} : {value} d'effet, disproportionné au regard de son poids réel.",
    pl: "On notera aussi {noun} : {value} d'effet, disproportionné au regard de leur poids réel.",
  },
  {
    sg: "Fait notable : {noun} bouge de {value}, un mouvement disproportionné vu sa taille.",
    pl: "Fait notable : {noun} bougent de {value}, un mouvement disproportionné vu leur taille.",
  },
];

const INTRO_SINGLE_TEMPLATES: string[] = [
  "Sous ce choc, le patrimoine net passe de {totalBefore} à {totalAfter} ({deltaPct}).",
  "Ce choc fait évoluer le patrimoine net de {totalBefore} à {totalAfter}, soit {deltaPct}.",
];

const INTRO_COMBINED_TEMPLATES: string[] = [
  "Combinés, ces chocs font évoluer le patrimoine net de {totalBefore} à {totalAfter} ({deltaPct}).",
  "Une fois ces chocs combinés, le patrimoine net passe de {totalBefore} à {totalAfter} ({deltaPct}).",
];

const CONNECTORS: string[] = ["En revanche,", "À l'inverse,", "De son côté,", "Ce qui compense partiellement,"];

const ASSUMPTION_CAVEATS: string[] = [
  " — une hypothèse, pas une certitude.",
  " — une estimation, à ajuster selon le profil réel.",
];

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Rotates between amount-only, %-only, and both — so the same fact doesn't
// always present its number the same way scenario after scenario.
function formatFactValue(post: ScenarioImpactPost, mode: number): string {
  const amount = formatCurrency(Math.abs(post.delta));
  const pctText = post.deltaPct !== null ? `${roundPercent(Math.abs(post.deltaPct), 1)} %` : null;
  if (!pctText) return amount;
  if (mode % 3 === 1) return pctText;
  if (mode % 3 === 2) return `${amount} (${pctText})`;
  return amount;
}

function composeFactSentence(fact: HighlightedFact, seed: number, salt: number): string {
  const templates =
    fact.role === "amortisseur"
      ? AMORTISSEUR_TEMPLATES
      : fact.role === "aggravant"
        ? AGGRAVANT_TEMPLATES
        : CONTRE_INTUITIF_TEMPLATES;
  const template = pick(templates, seed, salt);
  const text = fact.post.isPlural ? template.pl : template.sg;
  const value = formatFactValue(fact.post, seed + salt);

  let sentence = text.replaceAll("{noun}", fact.post.nounPhrase).replace("{value}", value);

  if (fact.post.isAssumption) {
    sentence = sentence.replace(/\.$/, pick(ASSUMPTION_CAVEATS, seed, salt + 7));
  }

  return sentence;
}

/**
 * Composes the 2-4 sentence summary shown under a scenario's result. Pure
 * function of computeFullScenarioImpact's own output — no business logic
 * recomputed here, just narration over numbers that already exist.
 */
export function composeNarrativeParagraph(
  result: FullScenarioResult,
  activeChocCount: number
): string {
  const facts = selectHighlightedFacts(result.posts, result.totalBefore);
  const seed = seedFromPosts(result.posts.filter((post) => post.delta !== 0));

  const introTemplates = activeChocCount > 1 ? INTRO_COMBINED_TEMPLATES : INTRO_SINGLE_TEMPLATES;
  const deltaPctText = `${result.deltaPct >= 0 ? "+" : ""}${roundPercent(result.deltaPct, 1)} %`;
  const intro = pick(introTemplates, seed, 0)
    .replace("{totalBefore}", formatCurrency(result.totalBefore))
    .replace("{totalAfter}", formatCurrency(result.totalAfter))
    .replace("{deltaPct}", deltaPctText);

  if (facts.length === 0) {
    return intro;
  }

  const parts = [intro];
  facts.forEach((fact, index) => {
    const sentence = composeFactSentence(fact, seed, index * 3 + 1);
    if (fact.role === "contreIntuitif") {
      parts.push(sentence);
      return;
    }
    if (index === 0) {
      parts.push(upperFirst(sentence));
    } else {
      const connector = pick(CONNECTORS, seed, index * 11);
      parts.push(`${connector} ${sentence}`);
    }
  });

  return parts.join(" ");
}
