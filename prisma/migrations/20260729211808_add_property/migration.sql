-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "currentValue" REAL NOT NULL,
    "monthlyRent" REAL,
    "remainingLoanAmount" REAL NOT NULL DEFAULT 0,
    "loanRate" REAL NOT NULL DEFAULT 0,
    "rateType" TEXT NOT NULL DEFAULT 'fixed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "Property_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
