-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "actionsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "obligationsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "immobilierAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scpiAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liquiditesAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "privateEquityAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outilProfessionnelAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "professionalToolMainIncome" BOOLEAN NOT NULL DEFAULT false,
    "matieresPremieresAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autresAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actionsIndicielPct" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "actionsDefensifPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actionsCroissancePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "monthlyRent" DOUBLE PRECISION,
    "remainingLoanAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loanRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rateType" TEXT NOT NULL DEFAULT 'fixed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
