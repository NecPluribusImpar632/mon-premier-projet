-- Additive only: the build currently deployed does not read these columns,
-- so applying this before redeploying keeps the live site working. Existing
-- clients keep savingsFromFlows = false, i.e. the manual monthly savings.

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "incomeFranceAnnual" DOUBLE PRECISION,
ADD COLUMN "incomeForeignAnnual" DOUBLE PRECISION,
ADD COLUMN "livingExpensesAnnual" DOUBLE PRECISION,
ADD COLUMN "savingsFromFlows" BOOLEAN NOT NULL DEFAULT false;
