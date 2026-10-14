-- Additive only, with defaults: existing properties stay at 100 % in direct
-- ownership and existing loans follow the property's share, so nothing the
-- live build computes changes until an advisor edits a property.

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "ownershipSharePct" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN "holdingMode" TEXT NOT NULL DEFAULT 'direct';

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN "borneFullyByClient" BOOLEAN NOT NULL DEFAULT false;
