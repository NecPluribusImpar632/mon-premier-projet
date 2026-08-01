-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "actionsAmount" REAL NOT NULL DEFAULT 0,
    "obligationsAmount" REAL NOT NULL DEFAULT 0,
    "immobilierAmount" REAL NOT NULL DEFAULT 0,
    "scpiAmount" REAL NOT NULL DEFAULT 0,
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
INSERT INTO "new_Client" ("actionsAmount", "actionsCroissancePct", "actionsDefensifPct", "actionsIndicielPct", "age", "autresAmount", "createdAt", "id", "liquiditesAmount", "matieresPremieresAmount", "name", "obligationsAmount", "privateEquityAmount", "updatedAt") SELECT "actionsAmount", "actionsCroissancePct", "actionsDefensifPct", "actionsIndicielPct", "age", "autresAmount", "createdAt", "id", "liquiditesAmount", "matieresPremieresAmount", "name", "obligationsAmount", "privateEquityAmount", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
