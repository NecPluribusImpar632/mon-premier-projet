-- Additive only: per-poste annual fees for the wealth-goal simulation,
-- NULL = application default.

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "feesActionsPct" DOUBLE PRECISION;
ALTER TABLE "Client" ADD COLUMN "feesObligationsPct" DOUBLE PRECISION;
ALTER TABLE "Client" ADD COLUMN "feesScpiPct" DOUBLE PRECISION;
ALTER TABLE "Client" ADD COLUMN "feesPrivateEquityPct" DOUBLE PRECISION;
ALTER TABLE "Client" ADD COLUMN "feesImmobilierPct" DOUBLE PRECISION;
