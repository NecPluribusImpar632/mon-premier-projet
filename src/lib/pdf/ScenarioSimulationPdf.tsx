import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  computeFullScenarioImpact,
  computeObligationsShockImpact,
  computeRealEstateShockImpact,
  computeStockShockImpact,
  type ClientScenarioContext,
  type FullScenarioResult,
} from "@/lib/scenarios/calculations";
import type { ScenarioParams } from "@/lib/scenarios/scenarioParams";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#14213d",
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: "#5b6472",
    marginBottom: 20,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#d8dce2",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  label: {
    color: "#5b6472",
  },
  value: {
    fontFamily: "Helvetica-Bold",
  },
  netWorthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: "#d8dce2",
    marginTop: 4,
  },
  methodologyBlock: {
    marginBottom: 8,
  },
  methodologyTitle: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  methodologyText: {
    color: "#5b6472",
    lineHeight: 1.4,
  },
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

interface BreakdownRowConfig {
  key: keyof Pick<
    FullScenarioResult["breakdown"],
    | "realEstateDelta"
    | "stocksDelta"
    | "scpiDelta"
    | "obligationsDelta"
    | "peDelta"
    | "debtErosion"
    | "vacancyCost"
  >;
  label: string;
  invert?: boolean;
}

const BREAKDOWN_ROWS: BreakdownRowConfig[] = [
  { key: "realEstateDelta", label: "Immobilier" },
  { key: "stocksDelta", label: "Actions" },
  { key: "scpiDelta", label: "SCPI" },
  { key: "obligationsDelta", label: "Obligations" },
  { key: "peDelta", label: "Private Equity" },
  { key: "debtErosion", label: "Érosion de la dette (inflation)" },
  { key: "vacancyCost", label: "Vacance locative", invert: true },
];

interface ScenarioSimulationPdfProps {
  clientName: string;
  scenarioLabel: string;
  context: ClientScenarioContext;
  params: ScenarioParams;
}

export function ScenarioSimulationPdf({
  clientName,
  scenarioLabel,
  context,
  params,
}: ScenarioSimulationPdfProps) {
  const result = computeFullScenarioImpact(context, params);
  const realEstateShock = computeRealEstateShockImpact(
    context.properties,
    params.oatRateChangePts
  );
  const stockShock = computeStockShockImpact(
    context.actionsBreakdown,
    context.actionsPctWithinFinancial,
    params.marketShockPct
  );
  const obligationsShock = computeObligationsShockImpact(
    context.obligationsAmount,
    params.oatRateChangePts,
    params.obligationsDurationYears
  );
  const vacancyProperty = context.properties.find(
    (p) => p.id === params.vacancyPropertyId
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Rapport de simulation</Text>
        <Text style={styles.subtitle}>
          {clientName} · Scénario : {scenarioLabel} · {dateFormatter.format(new Date())}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impact combiné sur le patrimoine net</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Patrimoine net avant</Text>
            <Text style={styles.value}>{currencyFormatter.format(result.totalBefore)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Patrimoine net après</Text>
            <Text style={styles.value}>{currencyFormatter.format(result.totalAfter)}</Text>
          </View>
          <View style={styles.netWorthRow}>
            <Text>Variation</Text>
            <Text style={styles.value}>
              {result.deltaAmount >= 0 ? "+" : ""}
              {currencyFormatter.format(result.deltaAmount)} (
              {result.deltaPct >= 0 ? "+" : ""}
              {result.deltaPct.toFixed(1)} %)
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail par choc</Text>
          {BREAKDOWN_ROWS.map(({ key, label, invert }) => {
            const raw = result.breakdown[key];
            const value = invert ? -raw : raw;
            if (value === 0) return null;
            return (
              <View key={key} style={styles.row}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>
                  {value >= 0 ? "+" : ""}
                  {currencyFormatter.format(value)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Méthodologie et données de calibration</Text>

          {context.properties.length > 0 && (
            <View style={styles.methodologyBlock}>
              <Text style={styles.methodologyTitle}>Choc immobilier</Text>
              {realEstateShock.perProperty.map((property) => (
                <Text key={property.propertyId} style={styles.methodologyText}>
                  {property.propertyName} — zone {property.sensitivity.zoneLabel},
                  coefficient {property.sensitivity.coefficient.toFixed(2)} %/pt (R²{" "}
                  {property.sensitivity.r2Pct.toFixed(1)} %, décalage{" "}
                  {property.sensitivity.lagQuarters} trim., n={property.sensitivity.n})
                </Text>
              ))}
            </View>
          )}

          {context.actionsPctWithinFinancial > 0 && (
            <View style={styles.methodologyBlock}>
              <Text style={styles.methodologyTitle}>Choc actions</Text>
              <Text style={styles.methodologyText}>
                Sensibilité pondérée du profil actions : ×{stockShock.weightedBeta.toFixed(2)}{" "}
                (moyenne des profils indiciel/défensif/croissance pondérée par leur poids
                dans la poche Actions).
              </Text>
            </View>
          )}

          {context.obligationsAmount > 0 && (
            <View style={styles.methodologyBlock}>
              <Text style={styles.methodologyTitle}>Choc obligataire</Text>
              <Text style={styles.methodologyText}>
                Approximation de duration modifiée (ΔPrix/Prix ≈ -duration × Δtaux) avec
                une duration de {params.obligationsDurationYears} ans — hypothèse manuelle,
                à ajuster selon les titres réellement détenus ({obligationsShock.shockPct.toFixed(1)} %
                de variation pour {params.oatRateChangePts} pt de variation du taux OAT).
              </Text>
            </View>
          )}

          {context.privateEquityAmount > 0 && (
            <View style={styles.methodologyBlock}>
              <Text style={styles.methodologyTitle}>Décote d&apos;illiquidité Private Equity</Text>
              <Text style={styles.methodologyText}>
                Décote de sortie de {params.peIlliquidityDiscountPct} % par rapport à la
                valeur de part (NAV) — hypothèse de marché secondaire, à ajuster selon le
                fonds réellement détenu.
              </Text>
            </View>
          )}

          {params.inflationPct !== 0 && (
            <View style={styles.methodologyBlock}>
              <Text style={styles.methodologyTitle}>Inflation</Text>
              <Text style={styles.methodologyText}>
                Taux d&apos;inflation annuel de {params.inflationPct} % sur{" "}
                {params.inflationYears} ans, érodant la valeur réelle de la dette à taux
                fixe restant due.
              </Text>
            </View>
          )}

          {vacancyProperty && (
            <View style={styles.methodologyBlock}>
              <Text style={styles.methodologyTitle}>Vacance locative</Text>
              <Text style={styles.methodologyText}>
                {vacancyProperty.name} — {params.vacancyMonths} mois de vacance simulés.
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          Document généré le {dateFormatter.format(new Date())} — simulation à but
          pédagogique, les hypothèses de calibration sont détaillées ci-dessus et ne
          constituent pas une garantie de résultat.
        </Text>
      </Page>
    </Document>
  );
}
