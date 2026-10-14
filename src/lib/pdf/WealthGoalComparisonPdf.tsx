import {
  Document,
  Page,
  Polygon,
  Polyline,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import type { MonteCarloResult } from "@/lib/wealth/monteCarloProjection";
import type { WealthGoalComparison } from "@/lib/wealth/wealthGoalComparison";
import { deflate } from "@/lib/wealth/wealthGoalComparison";
import {
  CURRENT_SERIES_LABEL,
  PROPOSAL_SERIES_LABEL,
} from "@/lib/wealth/wealthGoalProposal";
import { USAGE_FRAME_TEXT, USAGE_FRAME_TITLE } from "@/lib/methodology/usageFrame";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const INK = "#14213d";
const SLATE = "#5b6472";
const LINE = "#d8dce2";
const ACCENT = "#0f9d6e";
const NEUTRAL = "#6b7280";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: INK },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 10, color: SLATE, marginBottom: 20 },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 4,
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  label: { color: SLATE },
  value: { fontFamily: "Helvetica-Bold" },
  headline: { flexDirection: "row", gap: 24, marginBottom: 6 },
  headlineBlock: { flex: 1 },
  headlineLabel: { fontSize: 9, color: SLATE, marginBottom: 2 },
  headlineValue: { fontSize: 30, fontFamily: "Helvetica-Bold" },
  headlineValueAccent: { fontSize: 30, fontFamily: "Helvetica-Bold", color: ACCENT },
  headlineNote: { fontSize: 9, color: SLATE },
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 3,
    marginBottom: 2,
    color: SLATE,
    fontSize: 9,
  },
  tableRow: { flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: LINE },
  cellLabel: { flex: 2.2 },
  cell: { flex: 1.3, textAlign: "right" },
  cellSmall: { flex: 1.6, textAlign: "right", color: SLATE, fontSize: 8.5 },
  legend: { flexDirection: "row", gap: 16, marginTop: 4, fontSize: 8.5, color: SLATE },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  swatch: { width: 12, height: 2 },
  text: { color: SLATE, lineHeight: 1.4 },
  frame: { borderWidth: 1, borderColor: LINE, padding: 10, marginBottom: 18 },
  frameTitle: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9aa1ac",
    textAlign: "center",
  },
});

function eur(value: number): string {
  return currencyFormatter.format(value);
}

function signedEur(value: number): string {
  if (Math.round(value) === 0) return eur(0);
  return `${value > 0 ? "+" : ""}${eur(value)}`;
}

function signedPts(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return "0 pt";
  return `${rounded > 0 ? "+" : ""}${rounded} pt${Math.abs(rounded) > 1 ? "s" : ""}`;
}

function pct(value: number | null, digits: number): string {
  if (value === null) return "";
  return `${value.toFixed(digits).replace(".", ",")} %`;
}

function returnCell(row: MonteCarloResult["breakdown"][number]): string {
  if (row.meanPct === null) return "non projeté";
  if (row.stdPct > 0) return `${pct(row.meanPct, 2)} ± ${pct(row.stdPct, 1)}`;
  return pct(row.meanPct, 2);
}

const CHART_W = 515;
const CHART_H = 170;
const PAD = { top: 10, right: 10, bottom: 18, left: 10 };

/** Two overlaid fan charts, straight segments: p10-p90 band as a polygon and
 * the median as a polyline, current situation in grey under the proposal. */
function FanChartSvg({ comparison }: { comparison: WealthGoalComparison }) {
  const series = [comparison.current.bands, comparison.proposed.bands];
  const values = series.flatMap((b) => [...b.p10, ...b.p50, ...b.p90]).map((p) => p.netWorth);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const room = (rawMax - rawMin) * 0.1 || Math.abs(rawMax) * 0.1 || 1;
  const minV = rawMin - room;
  const maxV = rawMax + room;
  const n = comparison.current.bands.p50.length;
  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * plotW : 0);
  const y = (v: number) => PAD.top + plotH - ((v - minV) / (maxV - minV || 1)) * plotH;

  function bandPoints(b: MonteCarloResult["bands"]): string {
    const top = b.p90.map((p, i) => `${x(i).toFixed(1)},${y(p.netWorth).toFixed(1)}`);
    const bottom = [...b.p10].reverse().map((p, i) => `${x(n - 1 - i).toFixed(1)},${y(p.netWorth).toFixed(1)}`);
    return [...top, ...bottom].join(" ");
  }
  function linePoints(points: MonteCarloResult["bands"]["p50"]): string {
    return points.map((p, i) => `${x(i).toFixed(1)},${y(p.netWorth).toFixed(1)}`).join(" ");
  }

  const horizon = comparison.current.horizonYears;
  return (
    <View>
      <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <Polyline
          points={`${PAD.left},${y(comparison.current.bands.p50[0].netWorth).toFixed(1)} ${(CHART_W - PAD.right).toFixed(1)},${y(comparison.current.bands.p50[0].netWorth).toFixed(1)}`}
          stroke={LINE}
          strokeWidth={1}
          fill="none"
        />
        <Polygon points={bandPoints(comparison.current.bands)} fill={NEUTRAL} fillOpacity={0.14} stroke="none" />
        <Polyline points={linePoints(comparison.current.bands.p50)} stroke={NEUTRAL} strokeWidth={1.8} fill="none" />
        <Polygon points={bandPoints(comparison.proposed.bands)} fill={ACCENT} fillOpacity={0.18} stroke="none" />
        <Polyline points={linePoints(comparison.proposed.bands.p50)} stroke={ACCENT} strokeWidth={1.8} fill="none" />
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: SLATE }}>
        <Text>Aujourd&apos;hui</Text>
        <Text>Dans {horizon} ans</Text>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: NEUTRAL }]} />
          <Text>{CURRENT_SERIES_LABEL}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: ACCENT }]} />
          <Text>{PROPOSAL_SERIES_LABEL}</Text>
        </View>
        <Text>Bandes : 10e au 90e centile, trait plein : médiane</Text>
      </View>
    </View>
  );
}

interface WealthGoalComparisonPdfProps {
  clientName: string;
  currentAge: number;
  targetAge: number;
  inflationPct: number;
  monthlySavingsAmount: number;
  comparison: WealthGoalComparison;
}

export function WealthGoalComparisonPdf({
  clientName,
  currentAge,
  targetAge,
  inflationPct,
  monthlySavingsAmount,
  comparison,
}: WealthGoalComparisonPdfProps) {
  const { current, proposed } = comparison;
  const horizon = current.horizonYears;
  const currentMedian = current.bands.p50[current.bands.p50.length - 1]?.netWorth ?? 0;
  const proposedMedian = proposed.bands.p50[proposed.bands.p50.length - 1]?.netWorth ?? 0;
  const proposedById = new Map(proposed.breakdown.map((row) => [row.categoryId, row]));
  const today = dateFormatter.format(new Date());

  return (
    <Document title={`Objectif patrimonial, comparaison, ${clientName}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Objectif patrimonial : avant / après</Text>
        <Text style={styles.subtitle}>
          {clientName} · {today}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Objectif de patrimoine net</Text>
            <Text style={styles.value}>{current.targetAmount > 0 ? eur(current.targetAmount) : "non saisi"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Échéance</Text>
            <Text style={styles.value}>
              {targetAge} ans, dans {horizon} ans (âge actuel {currentAge} ans)
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Épargne mensuelle</Text>
            <Text style={styles.value}>{eur(monthlySavingsAmount)} / mois</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Inflation retenue</Text>
            <Text style={styles.value}>{pct(inflationPct, 1)} par an</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Probabilité d&apos;atteindre l&apos;objectif</Text>
          {current.targetAmount > 0 ? (
            <>
              <View style={styles.headline}>
                <View style={styles.headlineBlock}>
                  <Text style={styles.headlineLabel}>{CURRENT_SERIES_LABEL}</Text>
                  <Text style={styles.headlineValue}>{Math.round(current.successPct)} %</Text>
                </View>
                <View style={styles.headlineBlock}>
                  <Text style={styles.headlineLabel}>
                    {PROPOSAL_SERIES_LABEL} ({signedPts(comparison.successGapPts)})
                  </Text>
                  <Text style={styles.headlineValueAccent}>{Math.round(proposed.successPct)} %</Text>
                </View>
              </View>
              <Text style={styles.headlineNote}>
                Part des 2000 trajectoires simulées où le patrimoine net dans {horizon} ans atteint ou
                dépasse {eur(current.targetAmount)}, en euros courants. Les deux allocations sont
                simulées sur les mêmes tirages.
              </Text>
            </>
          ) : (
            <Text style={styles.text}>
              Aucun objectif de patrimoine net n&apos;est saisi ; les trajectoires ci-dessous restent
              comparables.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trajectoires de patrimoine net</Text>
          <FanChartSvg comparison={comparison} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patrimoine net médian dans {horizon} ans</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.cellLabel} />
              <Text style={styles.cell}>{CURRENT_SERIES_LABEL}</Text>
              <Text style={styles.cell}>{PROPOSAL_SERIES_LABEL}</Text>
              <Text style={styles.cell}>Écart</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.cellLabel}>En euros courants</Text>
              <Text style={styles.cell}>{eur(currentMedian)}</Text>
              <Text style={styles.cell}>{eur(proposedMedian)}</Text>
              <Text style={[styles.cell, { color: ACCENT }]}>{signedEur(comparison.medianGapNominal)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.cellLabel}>En euros constants</Text>
              <Text style={styles.cell}>{eur(deflate(currentMedian, inflationPct, horizon))}</Text>
              <Text style={styles.cell}>{eur(deflate(proposedMedian, inflationPct, horizon))}</Text>
              <Text style={[styles.cell, { color: ACCENT }]}>{signedEur(comparison.medianGapReal)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          Document généré le {today} — simulation à but d&apos;information, voir le cadre d&apos;usage en
          dernière page.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail par poste</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.cellLabel}>Poste</Text>
              <Text style={styles.cell}>{CURRENT_SERIES_LABEL}</Text>
              <Text style={styles.cell}>{PROPOSAL_SERIES_LABEL}</Text>
              <Text style={styles.cell}>Écart</Text>
              <Text style={styles.cellSmall}>Rendement réel</Text>
              <Text style={[styles.cellSmall, { flex: 0.9 }]}>Frais / an</Text>
            </View>
            {current.breakdown.map((row) => {
              const proposedRow = proposedById.get(row.categoryId) ?? row;
              const sameReturn = returnCell(row) === returnCell(proposedRow);
              const sameFees = row.feesPct === proposedRow.feesPct;
              return (
                <View key={row.categoryId} style={styles.tableRow}>
                  <Text style={styles.cellLabel}>{row.label}</Text>
                  <Text style={styles.cell}>{eur(row.amount)}</Text>
                  <Text style={styles.cell}>{eur(proposedRow.amount)}</Text>
                  <Text style={styles.cell}>{signedEur(proposedRow.amount - row.amount)}</Text>
                  <Text style={styles.cellSmall}>
                    {sameReturn ? returnCell(row) : `${returnCell(row)} > ${returnCell(proposedRow)}`}
                  </Text>
                  <Text style={[styles.cellSmall, { flex: 0.9 }]}>
                    {row.feesPct === null
                      ? ""
                      : sameFees
                        ? pct(row.feesPct, 1)
                        : `${pct(row.feesPct, 1)} > ${pct(proposedRow.feesPct, 1)}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Méthode</Text>
          <Text style={styles.text}>
            Simulation de Monte Carlo : 2000 trajectoires sont tirées au hasard, année par année,
            jusqu&apos;à l&apos;échéance. Les postes calibrés (actions, immobilier) reçoivent chaque
            année un rendement tiré dans leur distribution historique ; les SCPI une distribution
            choisie comme ordre de grandeur ; les autres postes un rendement fixe. Les frais annuels
            par poste sont soustraits du rendement nominal. L&apos;épargne mensuelle est versée en
            fin d&apos;année dans la poche financière, au prorata de l&apos;allocation de chaque
            côté. La dette s&apos;amortit selon les prêts saisis.
          </Text>
          <Text style={[styles.text, { marginTop: 6 }]}>
            Les deux allocations sont simulées sur la même graine aléatoire, donc les mêmes 2000
            séries de tirages. Les biens immobiliers, les prêts, l&apos;entreprise, les autres
            actifs, l&apos;épargne, l&apos;inflation et l&apos;objectif sont identiques des deux
            côtés ; seules la répartition de la poche financière, la répartition par indice et les
            frais par poste changent. L&apos;écart vient donc de l&apos;allocation, pas du hasard.
            Aucun frais de transaction ni fiscalité d&apos;arbitrage n&apos;est modélisé. Sources,
            périodes et niveaux de confiance : page Méthodologie de l&apos;application.
          </Text>
        </View>

        <View style={styles.frame}>
          <Text style={styles.frameTitle}>{USAGE_FRAME_TITLE}</Text>
          <Text style={styles.text}>{USAGE_FRAME_TEXT}</Text>
        </View>

        <Text style={styles.footer}>
          Document généré le {today} — simulation à but d&apos;information, pas un conseil en
          investissement.
        </Text>
      </Page>
    </Document>
  );
}
