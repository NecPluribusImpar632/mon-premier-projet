-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "expectedAnnualReturnPct" DOUBLE PRECISION,
ADD COLUMN     "monthlySavingsAmount" DOUBLE PRECISION,
ADD COLUMN     "retirementAge" INTEGER;
