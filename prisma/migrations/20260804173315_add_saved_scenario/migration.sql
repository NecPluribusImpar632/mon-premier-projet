-- CreateTable
CREATE TABLE "SavedScenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marketShockPct" DOUBLE PRECISION NOT NULL,
    "oatRateChangePts" DOUBLE PRECISION NOT NULL,
    "scpiShockPct" DOUBLE PRECISION NOT NULL,
    "inflationPct" DOUBLE PRECISION NOT NULL,
    "inflationYears" INTEGER NOT NULL,
    "vacancyPropertyId" TEXT,
    "vacancyMonths" INTEGER NOT NULL,
    "obligationsDurationYears" DOUBLE PRECISION NOT NULL,
    "peIlliquidityDiscountPct" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "SavedScenario_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SavedScenario" ADD CONSTRAINT "SavedScenario_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
