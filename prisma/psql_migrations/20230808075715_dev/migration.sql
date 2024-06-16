/*
  Warnings:

  - You are about to alter the column `discount` on the `Estimate` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.
  - You are about to alter the column `discount` on the `Invoice` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.
  - You are about to alter the column `discount` on the `InvoiceDraft` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "Estimate" ALTER COLUMN "discount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "discount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "InvoiceDraft" ALTER COLUMN "discount" SET DATA TYPE DOUBLE PRECISION;
