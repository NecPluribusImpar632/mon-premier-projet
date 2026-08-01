/*
  Warnings:

  - You are about to drop the column `actionsPct` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `autresPct` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `financialWealthTotal` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `liquiditesPct` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `matieresPremieresPct` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `obligationsPct` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `privateEquityPct` on the `Client` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "actionsAmount" REAL NOT NULL DEFAULT 0,
    "obligationsAmount" REAL NOT NULL DEFAULT 0,
    "liquiditesAmount" REAL NOT NULL DEFAULT 0,
    "privateEquityAmount" REAL NOT NULL DEFAULT 0,
    "matieresPremieresAmount" REAL NOT NULL DEFAULT 0,
    "autresAmount" REAL NOT NULL DEFAULT 0,
    "actionsIndicielPct" REAL NOT NULL DEFAULT 100,
    "actionsDefensifPct" REAL NOT NULL DEFAULT 0,
    "actionsCroissancePct" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Client" ("actionsCroissancePct", "actionsDefensifPct", "actionsIndicielPct", "age", "createdAt", "id", "name", "updatedAt") SELECT "actionsCroissancePct", "actionsDefensifPct", "actionsIndicielPct", "age", "createdAt", "id", "name", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
