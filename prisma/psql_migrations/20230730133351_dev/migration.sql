/*
  Warnings:

  - The `productCost` column on the `JobMaterial` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "JobMaterial" DROP COLUMN "productCost",
ADD COLUMN     "productCost" DECIMAL(10,2) NOT NULL DEFAULT 0;
