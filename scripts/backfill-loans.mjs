// One-time data migration: before removing the old single-loan fields from
// Property (remainingLoanAmount, loanRate, rateType), copy them into a Loan
// row per property so existing data isn't lost.
//
// originalAmount/amortizationType/termYears never existed before, so this
// backfills reasonable defaults (originalAmount = remainingAmount,
// amortizationType = "amortissable", termYears = 20) — an assumption, not a
// fact recovered from data. Review/correct migrated loans manually if the
// real original amount or term matters.
//
// Run once: node scripts/backfill-loans.mjs
import "dotenv/config";
import { Client } from "pg";
import { randomUUID } from "crypto";

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  const { rows: properties } = await client.query(
    'SELECT id, "remainingLoanAmount", "loanRate", "rateType" FROM "Property"'
  );

  let created = 0;
  for (const property of properties) {
    const { rows: existing } = await client.query(
      'SELECT id FROM "Loan" WHERE "propertyId" = $1 LIMIT 1',
      [property.id]
    );
    if (existing.length > 0) continue; // already backfilled, skip

    const remainingAmount = Number(property.remainingLoanAmount) || 0;
    if (remainingAmount === 0) continue; // no loan to preserve — leave it loan-free

    const rate = Number(property.loanRate) || 0;
    const rateType = property.rateType || "fixed";

    await client.query(
      `INSERT INTO "Loan"
        (id, "originalAmount", "remainingAmount", rate, "rateType", "amortizationType", "termYears", "propertyId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'amortissable', 20, $6, now(), now())`,
      [randomUUID(), remainingAmount, remainingAmount, rate, rateType, property.id]
    );
    created++;
  }

  console.log(`Backfilled ${created} loan(s) for ${properties.length} propertie(s).`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
