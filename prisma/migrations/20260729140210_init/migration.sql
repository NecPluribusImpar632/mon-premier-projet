-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "actionsPct" REAL NOT NULL DEFAULT 0,
    "obligationsPct" REAL NOT NULL DEFAULT 0,
    "immobilierPct" REAL NOT NULL DEFAULT 0,
    "liquiditesPct" REAL NOT NULL DEFAULT 0,
    "privateEquityPct" REAL NOT NULL DEFAULT 0,
    "matieresPremieresPct" REAL NOT NULL DEFAULT 0,
    "autresPct" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
