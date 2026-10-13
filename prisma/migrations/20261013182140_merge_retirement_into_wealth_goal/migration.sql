-- Fold the old "objectif retraite" into the wealth goal: a client who had a
-- retirement age but no goal horizon keeps that age as the horizon, then the
-- two retirement-only columns go away (the monthly savings column is kept,
-- it now feeds the Monte Carlo).
UPDATE "Client" SET "wealthGoalAge" = "retirementAge" WHERE "wealthGoalAge" IS NULL AND "retirementAge" IS NOT NULL;

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "retirementAge";
ALTER TABLE "Client" DROP COLUMN "expectedAnnualReturnPct";
