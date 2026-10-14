-- Additive only: one proposed financial allocation per client for the
-- wealth-goal before/after comparison.

-- CreateTable
CREATE TABLE "WealthGoalProposal" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "actionsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "obligationsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scpiAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liquiditesAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "privateEquityAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matieresPremieresAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actionsIndexBreakdown" JSONB NOT NULL,
    "feesActionsPct" DOUBLE PRECISION NOT NULL,
    "feesObligationsPct" DOUBLE PRECISION NOT NULL,
    "feesScpiPct" DOUBLE PRECISION NOT NULL,
    "feesPrivateEquityPct" DOUBLE PRECISION NOT NULL,
    "feesImmobilierPct" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WealthGoalProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WealthGoalProposal_clientId_key" ON "WealthGoalProposal"("clientId");

-- AddForeignKey
ALTER TABLE "WealthGoalProposal" ADD CONSTRAINT "WealthGoalProposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
