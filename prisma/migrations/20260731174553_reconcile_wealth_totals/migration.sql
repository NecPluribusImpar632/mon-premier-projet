/*
  Warnings:

  - You are about to drop the column `immobilierPct` on the `Client` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "financialWealthTotal" REAL NOT NULL DEFAULT 0,
    "actionsPct" REAL NOT NULL DEFAULT 0,
    "obligationsPct" REAL NOT NULL DEFAULT 0,
    "liquiditesPct" REAL NOT NULL DEFAULT 0,
    "privateEquityPct" REAL NOT NULL DEFAULT 0,
    "matieresPremieresPct" REAL NOT NULL DEFAULT 0,
    "autresPct" REAL NOT NULL DEFAULT 0,
    "actionsIndicielPct" REAL NOT NULL DEFAULT 100,
    "actionsDefensifPct" REAL NOT NULL DEFAULT 0,
    "actionsCroissancePct" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Client" ("actionsCroissancePct", "actionsDefensifPct", "actionsIndicielPct", "actionsPct", "age", "autresPct", "createdAt", "id", "liquiditesPct", "matieresPremieresPct", "name", "obligationsPct", "privateEquityPct", "updatedAt") SELECT "actionsCroissancePct", "actionsDefensifPct", "actionsIndicielPct", "actionsPct", "age", "autresPct", "createdAt", "id", "liquiditesPct", "matieresPremieresPct", "name", "obligationsPct", "privateEquityPct", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
