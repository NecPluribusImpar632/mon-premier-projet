-- Additive only: the build currently deployed does not read these columns,
-- so applying this before redeploying keeps the live site working.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'advisor';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "Client_ownerId_idx" ON "Client"("ownerId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: the original account becomes the administrator (it sees every
-- client regardless of owner); the clients created before ownership existed
-- are the demo dossiers, so they go to the demo account, which must land on
-- filled-in files rather than an empty list.
UPDATE "User" SET "role" = 'admin' WHERE "email" = 'johandufour99@gmail.com';
UPDATE "Client"
SET "ownerId" = (SELECT "id" FROM "User" WHERE "email" = 'demo@logiciel.fr')
WHERE "ownerId" IS NULL;
