/*
  Warnings:

  - Added the required column `vehicleID` to the `Estimate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleID` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "vehicleID" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "vehicleID" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vehicleID_fkey" FOREIGN KEY ("vehicleID") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_vehicleID_fkey" FOREIGN KEY ("vehicleID") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
