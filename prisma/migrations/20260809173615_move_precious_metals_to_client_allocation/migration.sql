/*
  Warnings:

  - You are about to drop the column `goldAmount` on the `SavedScenario` table. All the data in the column will be lost.
  - You are about to drop the column `silverAmount` on the `SavedScenario` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "matieresPremieresGoldAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "matieresPremieresSilverAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SavedScenario" DROP COLUMN "goldAmount",
DROP COLUMN "silverAmount";
