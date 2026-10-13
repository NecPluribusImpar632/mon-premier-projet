import type { FullScenarioResult, ScenarioImpactPost } from "@/lib/scenarios/calculations";
import { formatCurrency } from "@/lib/format/currency";
import { formatPercent } from "@/lib/format/percent";

// One-line factual note per post, shown only in the "En savoir plus" detail
// list — never reused inside the narrative paragraph itself. Posts whose
// method depends on the scenario (real estate, bonds) carry their own
// methodologyNote from computeFullScenarioImpact, which takes precedence.
export const POST_METHODOLOGY_NOTES: Record<string, string> = {
  actions: "Choc de marché pondéré selon la répartition par indice détenue.",
  realEstate: "Revalorisation selon la sensibilité prix/taux calibrée par zone.",
  scpi: "Décote de part appliquée au montant détenu.",
  obligations: "Approximation de duration : ΔPrix/Prix ≈ -duration × Δtaux.",
  privateEquity: "Décote de sortie anticipée sur le marché secondaire.",
  or: "Tendance de fond régressée sur l'inflation US (1972+), pas la volatilité de court terme.",
  argent: "Tendance de fond régressée sur l'inflation US (1972+), pas la volatilité de court terme.",
  debtErosion: "Érosion de la valeur réelle de la dette à taux fixe restante.",
  vacancy: "Perte de loyer sur la durée de vacance simulée.",
};

/** Beyond this many named contributors on one side, the rest is summed as
 * "les autres postes" so the paragraph stays readable. */
const MAX_NAMED_CONTRIBUTORS = 4;

function signedCurrency(value: number): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatCurrency(Math.abs(value))}`;
}

/** "l'immobilier 81 % (−448 800 €)" — share of the gross move on that side,
 * then the amount. */
function contribution(post: ScenarioImpactPost, grossSameSign: number): string {
  const share = grossSameSign > 0 ? (Math.abs(post.delta) / grossSameSign) * 100 : 0;
  return `${post.nounPhrase} ${formatPercent(share)} (${signedCurrency(post.delta)})`;
}

function listContributions(posts: ScenarioImpactPost[], gross: number): string {
  const sorted = [...posts].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const named = sorted.slice(0, MAX_NAMED_CONTRIBUTORS);
  const rest = sorted.slice(MAX_NAMED_CONTRIBUTORS);
  const parts = named.map((post) => contribution(post, gross));
  if (rest.length > 0) {
    const restDelta = rest.reduce((sum, post) => sum + post.delta, 0);
    const restShare = gross > 0 ? (Math.abs(restDelta) / gross) * 100 : 0;
    parts.push(`les autres postes ${formatPercent(restShare)} (${signedCurrency(restDelta)})`);
  }
  return parts.join(", ");
}

/**
 * Composes the summary shown under a scenario's result: the net move, then
 * each poste's contribution in euros and as a share of the gross loss (or
 * gross gain), largest first, then what the other side compensates. Pure
 * function of computeFullScenarioImpact's output, no business logic here.
 */
export function composeNarrativeParagraph(
  result: FullScenarioResult,
  activeChocCount: number
): string {
  const active = result.posts.filter((post) => post.delta !== 0);
  const deltaPctText = `${result.deltaPct > 0 ? "+" : result.deltaPct < 0 ? "−" : ""}${formatPercent(Math.abs(result.deltaPct), 1)}`;
  const intro = `${activeChocCount > 1 ? "Combinés, ces chocs font passer" : "Ce choc fait passer"} le patrimoine net de ${formatCurrency(result.totalBefore)} à ${formatCurrency(result.totalAfter)} (${signedCurrency(result.deltaAmount)}, ${deltaPctText}).`;

  if (active.length === 0) return intro;

  const losers = active.filter((post) => post.delta < 0);
  const gainers = active.filter((post) => post.delta > 0);
  const grossLoss = losers.reduce((sum, post) => sum - post.delta, 0);
  const grossGain = gainers.reduce((sum, post) => sum + post.delta, 0);

  const sentences = [intro];

  if (grossLoss > 0) {
    sentences.push(
      `La perte brute est de ${formatCurrency(grossLoss)} : ${listContributions(losers, grossLoss)}.`
    );
    if (grossGain > 0) {
      const offsetShare = formatPercent((grossGain / grossLoss) * 100);
      const exceeds = grossGain > grossLoss;
      if (gainers.length === 1) {
        const only = gainers[0];
        const verb = only.isPlural ? "compensent" : "compense";
        sentences.push(
          exceeds
            ? `${upperFirst(only.nounPhrase)} fait plus que ${verb.replace(/ent$|e$/, "er")} cette perte : ${signedCurrency(grossGain)}, soit ${offsetShare} de la perte brute.`
            : `${upperFirst(only.nounPhrase)} ${verb} ${formatCurrency(grossGain)}, soit ${offsetShare} de cette perte.`
        );
      } else {
        const listed = [...gainers]
          .sort((a, b) => b.delta - a.delta)
          .map((post) => `${post.nounPhrase} (${signedCurrency(post.delta)})`)
          .join(", ");
        sentences.push(
          exceeds
            ? `En sens inverse, ${listed} font plus que compenser cette perte : ${signedCurrency(grossGain)} au total, soit ${offsetShare} de la perte brute.`
            : `En sens inverse, ${listed} compensent ${formatCurrency(grossGain)} au total, soit ${offsetShare} de cette perte.`
        );
      }
    }
  } else {
    sentences.push(
      `Le gain brut est de ${formatCurrency(grossGain)} : ${listContributions(gainers, grossGain)}.`
    );
  }

  return sentences.join(" ");
}

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
