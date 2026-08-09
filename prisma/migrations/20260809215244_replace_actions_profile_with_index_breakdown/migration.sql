-- AlterTable
ALTER TABLE "Client" DROP COLUMN "actionsCroissancePct",
DROP COLUMN "actionsDefensifPct",
DROP COLUMN "actionsIndicielPct",
DROP COLUMN "actionsReferenceIndex";

-- CreateTable
CREATE TABLE "ActionsIndexAllocation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "index" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionsIndexAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionsIndexAllocation_clientId_index_key" ON "ActionsIndexAllocation"("clientId", "index");

-- AddForeignKey
ALTER TABLE "ActionsIndexAllocation" ADD CONSTRAINT "ActionsIndexAllocation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
