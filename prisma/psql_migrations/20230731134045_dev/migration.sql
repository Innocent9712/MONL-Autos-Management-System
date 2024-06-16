/*
  Warnings:

  - You are about to drop the column `jobID` on the `Estimate` table. All the data in the column will be lost.
  - You are about to drop the column `jobID` on the `Invoice` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Estimate" DROP CONSTRAINT "Estimate_jobID_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_jobID_fkey";

-- DropIndex
DROP INDEX "Estimate_jobID_key";

-- DropIndex
DROP INDEX "Invoice_jobID_key";

-- AlterTable
ALTER TABLE "Estimate" DROP COLUMN "jobID";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "jobID";
