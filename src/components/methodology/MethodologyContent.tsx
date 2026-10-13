import { Scale } from "lucide-react";
import { reliabilityTierForR2 } from "@/lib/scenarios/statisticalReliability";
import { METHODOLOGY_ROWS, type MethodologyRow } from "@/lib/methodology/methodologyRows";

function stripPrefix(label: string): string {
  return label.replace(/^[⚠·]\s*/, "");
}

function calibratedStatus(r2Pct: number | [number, number]): {
  text: string;
  className: string;
} {
  if (typeof r2Pct === "number") {
    const tier = reliabilityTierForR2(r2Pct);
    return {
      text: `Calcul calibré — ${tier.label} (R²=${Math.round(r2Pct)} %)`,
      className: tier.className,
    };
  }
  const [min, max] = r2Pct;
  const lowTier = reliabilityTierForR2(min);
  const highTier = reliabilityTierForR2(max);
  if (lowTier.label === highTier.label) {
    return {
      text: `Calcul calibré — ${lowTier.label} (R² ${Math.round(min)} % à ${Math.round(max)} %)`,
      className: lowTier.className,
    };
  }
  return {
    text: `Calcul calibré — de ${stripPrefix(lowTier.label)} à ${stripPrefix(highTier.label)} selon le cas (R² ${Math.round(min)} % à ${Math.round(max)} %)`,
    className: "text-ink",
  };
}

function rowStatus(row: MethodologyRow): { text: string; className: string } {
  if (row.status === "calibrated") return calibratedStatus(row.r2Pct);
  return { text: row.statusLabel, className: "text-ink" };
}

export function MethodologyContent() {
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <section className="flex items-start gap-2.5 rounded-md border border-bronze bg-bronze-tint p-4 text-sm text-bronze">
        <Scale className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex flex-col gap-1.5">
          <h2 className="font-serif text-base text-bronze">Cadre d&apos;usage</h2>
          <p className="leading-relaxed">
            Cet outil est un instrument de simulation et d&apos;aide à la décision destiné
            aux conseillers en gestion de patrimoine. Il ne constitue pas, par lui-même, un
            conseil en investissement ni une recommandation personnalisée au sens
            réglementaire. Les résultats affichés reposent sur les hypothèses et données
            historiques documentées sur cette page, qui ne garantissent aucune performance
            future et ne dispensent pas d&apos;une analyse individualisée de la situation du
            client. La formulation de toute recommandation, et la responsabilité qui
            l&apos;accompagne, reste entièrement celle du conseiller qui utilise l&apos;outil.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-xl text-ink">Un principe simple</h2>
        <p className="text-sm leading-relaxed text-slate">
          Chaque classe d&apos;actif est calée sur le marché qui détermine réellement son
          prix, pas sur un cadre imposé par défaut. L&apos;immobilier et les SCPI sont
          calibrés sur des données françaises (Notaires-INSEE), parce que c&apos;est un
          marché local. L&apos;or et l&apos;argent sont calibrés sur le dollar et
          l&apos;inflation américaine, parce que c&apos;est un marché mondial dominé par le
          dollar. Les actions reprennent l&apos;historique réel de l&apos;indice
          effectivement détenu par le client, pas une moyenne théorique.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-serif text-xl text-ink">Tableau de bord de fiabilité</h2>
          <p className="mt-1 text-sm text-slate">
            Le R² mesure la part de la variation d&apos;un prix qu&apos;un modèle arrive à
            expliquer statistiquement — 100 % serait une explication parfaite, 0 % aucune
            relation détectable. Un R² faible ne veut pas dire que le chiffre utilisé est
            faux, seulement que la relation statistique qui le sous-tend est ténue ; c&apos;est
            justement ce que ce tableau rend visible plutôt que de le taire.
          </p>
        </div>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-xs text-slate">
                <th className="px-4 py-2.5 font-normal">Poste</th>
                <th className="px-4 py-2.5 font-normal">Niveau de rigueur</th>
                <th className="px-4 py-2.5 font-normal">Détail</th>
              </tr>
            </thead>
            <tbody>
              {METHODOLOGY_ROWS.map((row) => {
                const status = rowStatus(row);
                return (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 align-top font-medium text-ink">{row.label}</td>
                    <td className={`px-4 py-3 align-top font-mono text-xs tabular-nums ${status.className}`}>
                      {status.text}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate">
                      <p>{row.description}</p>
                      <p className="mt-1.5 text-slate/70">{row.sourceReference}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-8">
        <h2 className="font-serif text-xl text-ink">Pourquoi documenter les limites</h2>
        <p className="text-sm leading-relaxed text-slate">
          Sur la SCPI par exemple, une régression a été testée et n&apos;a pas donné de
          résultat statistiquement significatif. Plutôt que d&apos;habiller ce résultat en
          calcul convaincant, la décote affichée est présentée pour ce qu&apos;elle est : un
          seul épisode réel documenté, pas une formule. C&apos;est le principe appliqué
          partout dans l&apos;outil — un chiffre honnête et daté vaut mieux qu&apos;un chiffre
          rassurant et inventé.
        </p>
      </section>
    </div>
  );
}
