import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { getClient } from "@/lib/actions/clients";
import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import { amountsFromClient, overallEntriesFromClient } from "@/lib/allocation/mapping";
import { RISK_PROFILE_LABELS, type RiskProfile } from "@/lib/client/riskProfile";
import { arrondissementLabel, DEPARTMENT_LABEL } from "@/lib/property/departments";
import {
  AMORTIZATION_TYPE_LABELS,
  type AmortizationType,
} from "@/lib/property/loanTypes";
import { totalRemainingDebt, type PropertyWithLoans } from "@/lib/property/loanCalculations";
import { RATE_TYPE_LABELS, type RateType } from "@/lib/property/rateType";
import { computeRentalYield } from "@/lib/property/rentalYield";
import { computeClientNetWorth } from "@/lib/wealth/netWorth";

type ClientWithDetails = NonNullable<Awaited<ReturnType<typeof getClient>>>;

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
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
  propertyBlock: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f3",
  },
  propertyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginBottom: 2,
  },
  propertyMeta: {
    color: "#5b6472",
    marginBottom: 4,
  },
  loanLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingVertical: 2,
  },
  notes: {
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

function propertyLocationLabel(property: PropertyWithLoans): string | null {
  if (!property.department) return null;
  if (property.department === "75" && property.arrondissement) {
    return `Paris ${arrondissementLabel(property.arrondissement)} arrondissement`;
  }
  return DEPARTMENT_LABEL[property.department] ?? property.department;
}

export function ClientProfilePdf({ client }: { client: ClientWithDetails }) {
  const amounts = amountsFromClient(client);
  const allocationEntries = overallEntriesFromClient(client, client.properties);
  const netWorth = computeClientNetWorth(client, client.properties);
  const riskProfileLabel = client.riskProfile
    ? RISK_PROFILE_LABELS[client.riskProfile as RiskProfile]
    : "Non renseigné";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{client.name}</Text>
        <Text style={styles.subtitle}>
          {client.age} ans · Profil de risque : {riskProfileLabel}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bilan patrimonial</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Patrimoine brut</Text>
            <Text style={styles.value}>{currencyFormatter.format(netWorth.grossWealth)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Dette totale</Text>
            <Text style={styles.value}>{currencyFormatter.format(netWorth.totalDebt)}</Text>
          </View>
          <View style={styles.netWorthRow}>
            <Text>Patrimoine net</Text>
            <Text style={styles.value}>{currencyFormatter.format(netWorth.netWealth)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allocation d&apos;actifs</Text>
          {ASSET_CATEGORIES.map((category) => {
            const entry = allocationEntries.find((e) => e.categoryId === category.id);
            const amount = amounts[category.id] ?? 0;
            return (
              <View key={category.id} style={styles.row}>
                <Text style={styles.label}>{category.label}</Text>
                <Text>
                  {currencyFormatter.format(amount)} (
                  {percentFormatter.format(entry?.percentage ?? 0)} %)
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biens immobiliers</Text>
          {client.properties.length === 0 ? (
            <Text style={styles.label}>Aucun bien renseigné.</Text>
          ) : (
            client.properties.map((property) => {
              const location = propertyLocationLabel(property);
              const yieldPct = computeRentalYield(property);
              const debt = totalRemainingDebt(property);
              const metaParts = [
                location,
                currencyFormatter.format(property.currentValue),
                yieldPct !== null
                  ? `${percentFormatter.format(yieldPct)} % de rendement locatif`
                  : null,
                debt > 0 ? `${currencyFormatter.format(debt)} de dette restante` : null,
              ].filter((part): part is string => Boolean(part));

              return (
                <View key={property.id} style={styles.propertyBlock} wrap={false}>
                  <Text style={styles.propertyName}>{property.name}</Text>
                  <Text style={styles.propertyMeta}>{metaParts.join(" · ")}</Text>
                  {property.loans.map((loan) => (
                    <View key={loan.id} style={styles.loanLine}>
                      <Text>
                        {loan.label || "Prêt"} — {RATE_TYPE_LABELS[loan.rateType as RateType]},{" "}
                        {AMORTIZATION_TYPE_LABELS[loan.amortizationType as AmortizationType]},{" "}
                        {loan.rate} %
                      </Text>
                      <Text style={styles.value}>
                        {currencyFormatter.format(loan.remainingAmount)}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </View>

        {client.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{client.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Document généré le {dateFormatter.format(new Date())} — usage interne, destiné au
          dossier de préconisation du conseiller.
        </Text>
      </Page>
    </Document>
  );
}
