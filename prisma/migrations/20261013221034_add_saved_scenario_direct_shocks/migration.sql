-- Additive only: the deployed build ignores these columns, existing saved
-- scenarios keep NULL = rate-derived behaviour.

-- AlterTable
ALTER TABLE "SavedScenario" ADD COLUMN "realEstateShockPct" DOUBLE PRECISION;
ALTER TABLE "SavedScenario" ADD COLUMN "obligationsShockPct" DOUBLE PRECISION;
