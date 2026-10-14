import { reliabilityTierForR2 } from "@/lib/scenarios/statisticalReliability";
import { USAGE_FRAME_TEXT, USAGE_FRAME_TITLE } from "@/lib/methodology/usageFrame";
import {
  methodologyRowsByGroup,
  type MethodologyConfidence,
} from "@/lib/methodology/methodologyRows";

function stripPrefix(label: string): string {
  return label.replace(/^[⚠·]\s*/, "");
}

function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function confidenceCell(confidence: MethodologyConfidence): { text: string; className: string } {
  switch (confidence.kind) {
    case "r2": {
      if (typeof confidence.r2Pct === "number") {
        const tier = reliabilityTierForR2(confidence.r2Pct);
        return {
          text: `${capitalize(stripPrefix(tier.label))} (R² ${Math.round(confidence.r2Pct)} %)`,
          className: tier.className,
        };
      }
      const [min, max] = confidence.r2Pct;
      const low = reliabilityTierForR2(min);
      const high = reliabilityTierForR2(max);
      const range = `R² ${Math.round(min)} % à ${Math.round(max)} %`;
      if (low.label === high.label) {
        return { text: `${capitalize(stripPrefix(low.label))} (${range})`, className: low.className };
      }
      return {
        text: `${capitalize(stripPrefix(low.label))} à ${stripPrefix(high.label).replace("fiabilité ", "")} selon la zone (${range})`,
        className: "text-ink",
      };
    }
    case "distribution":
      return { text: `Calibré sur ${confidence.years} de données`, className: "text-emerald" };
    case "historical":
      return { text: "Référence historique", className: "text-ink" };
    case "assumption":
      return { text: "Hypothèse fixe", className: "text-slate" };
  }
}

const SECTION_CLASS = "flex max-w-3xl flex-col gap-3";
const H2_CLASS = "font-serif text-xl text-ink";
const P_CLASS = "text-sm leading-relaxed text-slate";

export function MethodologyContent() {
  return (
    <div className="flex w-full flex-col gap-12">
      <section className="rounded-md border border-line bg-paper px-5 py-4">
        <h2 className="text-sm font-medium text-ink">{USAGE_FRAME_TITLE}</h2>
        <p className={`mt-2 ${P_CLASS}`}>{USAGE_FRAME_TEXT}</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className={H2_CLASS}>Synthèse par poste</h2>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-xs font-medium text-slate">
                <th className="px-4 py-3 align-bottom">Poste</th>
                <th className="px-4 py-3 align-bottom">Utilisation</th>
                <th className="px-4 py-3 align-bottom">Source</th>
                <th className="px-4 py-3 align-bottom">Période</th>
                <th className="px-4 py-3 align-bottom">Valeur retenue</th>
                <th className="px-4 py-3 align-bottom">Niveau de confiance</th>
              </tr>
            </thead>
            {methodologyRowsByGroup().map(({ group, rows }) => (
              <tbody key={group} className="border-b border-line last:border-0">
                <tr className="bg-paper/60">
                  <th
                    scope="rowgroup"
                    colSpan={6}
                    className="px-4 pb-1.5 pt-3 text-left text-sm font-medium text-ink"
                  >
                    {group}
                  </th>
                </tr>
                {rows.map((row) => {
                  const confidence = confidenceCell(row.confidence);
                  return (
                    <tr key={row.id} className="border-t border-line/60 align-top">
                      <td className="px-4 py-3 pl-8 text-xs text-ink">{row.variant}</td>
                      <td className="px-4 py-3 text-xs text-slate">{row.usage}</td>
                      <td className="px-4 py-3 text-xs text-slate">{row.source}</td>
                      <td className="px-4 py-3 text-xs text-slate">{row.period}</td>
                      <td className="px-4 py-3 text-xs text-ink">{row.retained}</td>
                      <td className={`px-4 py-3 text-xs ${confidence.className}`}>
                        {confidence.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section className={SECTION_CLASS}>
        <h2 className={H2_CLASS}>Principe de calibration</h2>
        <p className={P_CLASS}>
          Chaque classe d&apos;actif est calée sur le marché qui détermine son prix.
          L&apos;immobilier est calibré sur des données françaises, parce que c&apos;est un
          marché local. L&apos;or et l&apos;argent sont calibrés sur le dollar et
          l&apos;inflation américaine, parce que c&apos;est un marché mondial libellé en
          dollars. Les actions reprennent l&apos;historique de l&apos;indice réellement détenu
          par le client, pas une moyenne de marché.
        </p>
        <p className={P_CLASS}>
          Quand aucune donnée fiable n&apos;existe, le poste reçoit une valeur fixe, signalée
          comme hypothèse. Aucune distribution n&apos;est inventée pour combler une absence de
          données.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2 className={H2_CLASS}>Lecture du niveau de confiance</h2>
        <p className={P_CLASS}>
          Le R² mesure la part de la variation d&apos;un prix qu&apos;une régression explique.
          100 % correspond à une explication complète, 0 % à l&apos;absence de relation. Moins
          de 25 % est qualifié de fiabilité faible, de 25 à 49 % de fiabilité modérée, 50 % et
          plus de fiabilité forte. Un R² faible ne signifie pas que la valeur retenue est
          fausse, mais que la relation statistique qui la soutient est ténue.
        </p>
        <p className={P_CLASS}>
          « Calibré » désigne une distribution de rendement (moyenne et volatilité) mesurée
          sur une série historique réelle. « Référence historique » désigne une donnée passée
          utilisée telle quelle, sans modèle. « Hypothèse fixe » désigne un ordre de grandeur
          choisi, sans variance.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2 className={H2_CLASS}>Stress test</h2>
        <p className={P_CLASS}>
          Le stress test applique un choc ponctuel à chaque poste et mesure l&apos;effet sur le
          patrimoine net. Les trois scénarios nommés fixent directement un choc par poste,
          calibré sur l&apos;année de référence (lignes « Scénarios de crise » du tableau).
          Pour les actions, le choc est la performance annuelle réelle de chaque indice
          détenu cette année-là : 2008 pour la crise financière, 2022 pour le choc
          inflationniste et la remontée brutale des taux, 2018 pour un resserrement
          monétaire sans choc d&apos;inflation.
        </p>
        <p className={P_CLASS}>
          La sensibilité prix/taux par zone (immobilier) et l&apos;approximation de duration
          (obligations) ne servent que lorsque le scénario ne fixe pas de choc direct : les
          scénarios 2022 et 2018, et le mode Personnalisé par défaut. En 2008, les prix
          immobiliers et les obligations d&apos;État reçoivent une valeur fixe, parce que les
          taux ont baissé cette année-là et que les mécanismes dérivés du taux donneraient le
          sens inverse de ce qui s&apos;est produit. Le taux OAT pilote dans tous les cas le
          surcoût des prêts à taux variable.
        </p>
        <p className={P_CLASS}>
          La zone d&apos;un bien est celle de sa commune dans le zonage réglementaire A bis,
          A, B1, B2 ou C. Paris est une seule commune, entièrement en zone A bis. Lorsque la
          commune n&apos;est pas connue, le coefficient national s&apos;applique. Les niveaux
          arrondissement, département et région ne sont plus utilisés : leurs régressions
          expliquaient trop peu de la variation des prix pour fonder une décision.
        </p>
        <p className={P_CLASS}>
          Pour l&apos;or et l&apos;argent, le choc dépend de l&apos;inflation du scénario, via
          une régression sur cinquante ans de prix. Les SCPI reçoivent la décote du scénario
          (−3 % en 2008, −12 % en 2022, d&apos;après l&apos;épisode de 2023). Le Private
          Equity reçoit une décote d&apos;illiquidité par défaut, ajustable.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2 className={H2_CLASS}>Objectif patrimonial</h2>
        <p className={P_CLASS}>
          L&apos;objectif patrimonial est simulé par méthode de Monte Carlo : 2000
          trajectoires sont tirées au hasard, année par année, jusqu&apos;à l&apos;échéance
          choisie. Chaque année, les postes calibrés reçoivent un rendement tiré dans leur
          distribution historique, les postes en hypothèse fixe reçoivent leur rendement
          constant. Des frais annuels par poste (ligne « Frais annuels » du tableau,
          modifiables par client) sont soustraits du rendement nominal chaque année.
          L&apos;épargne mensuelle est versée en fin d&apos;année dans les poches
          financières, au prorata de l&apos;allocation. Le Private Equity est compté à
          100 % de sa valeur, comme dans la vue d&apos;ensemble ; sa décote
          d&apos;illiquidité ne s&apos;applique qu&apos;au stress test. La dette
          s&apos;amortit selon les prêts saisis. Le résultat est la part des trajectoires où le patrimoine net final atteint
          l&apos;objectif, accompagnée des trajectoires médiane, optimiste (90e centile) et
          pessimiste (10e centile).
        </p>
        <p className={P_CLASS}>
          Les rendements des actions sont convertis en euros avant calcul : taux de change
          réel depuis 1999, taux synthétique fondé sur la parité fixe franc/euro avant. Ils
          sont ensuite déflatés par l&apos;inflation française. Les moyennes sont arithmétiques,
          le format requis pour un tirage annuel. Le CAC 40 est mesuré hors dividendes, faute
          de série publique complète avec dividendes ; son rendement est donc sous-estimé.
        </p>
        <p className={P_CLASS}>
          La comparaison avant / après simule deux fois le même client : la situation
          actuelle et l&apos;allocation proposée par le conseiller. Les deux simulations
          partagent la même graine aléatoire, donc les mêmes 2000 séries de tirages. Les
          biens immobiliers, les prêts, l&apos;entreprise, les autres actifs, l&apos;épargne
          mensuelle, l&apos;inflation et l&apos;objectif sont identiques des deux côtés.
          Seules la répartition de la poche financière entre actions, obligations, SCPI,
          liquidités, Private Equity et matières premières, la répartition par indice et
          les frais par poste changent. Le total proposé est contraint d&apos;être égal à la
          poche financière actuelle. L&apos;écart mesuré vient donc de l&apos;allocation et
          non du hasard. Aucun frais de transaction ni fiscalité d&apos;arbitrage
          n&apos;est modélisé.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2 className={H2_CLASS}>Simplifications</h2>
        <ul className={`list-disc space-y-2 pl-5 ${P_CLASS}`}>
          <li>
            Les tirages sont indépendants entre classes d&apos;actifs. Aucune corrélation
            n&apos;est modélisée entre actions, immobilier et autres postes.
          </li>
          <li>
            Au sein des actions, un seul tirage par année s&apos;applique à tous les indices
            détenus. La corrélation entre indices est traitée comme parfaite, pas mesurée.
          </li>
          <li>
            Une seule distribution nationale s&apos;applique à tous les biens immobiliers,
            quelle que soit leur zone. La sensibilité par zone ne sert qu&apos;au stress test.
          </li>
          <li>
            L&apos;inflation est un paramètre fixe choisi par le conseiller, pas une variable
            simulée. Les rendements en devise étrangère ne sont pas couverts du risque de
            change, hors conversion historique.
          </li>
          <li>
            La fiscalité des enveloppes, les frais de gestion et un éventuel crédit lombard ne
            sont pas modélisés.
          </li>
        </ul>
      </section>
    </div>
  );
}
