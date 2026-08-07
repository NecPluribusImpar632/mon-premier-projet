-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "adultChildrenCount" INTEGER,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "minorChildrenCount" INTEGER,
ADD COLUMN     "spouseDebtAmount" DOUBLE PRECISION,
ADD COLUMN     "spouseImmobilierAmount" DOUBLE PRECISION,
ADD COLUMN     "spouseName" TEXT,
ADD COLUMN     "spouseScpiAmount" DOUBLE PRECISION;
