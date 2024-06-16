/*
  Warnings:

  - A unique constraint covering the columns `[engineNo]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[chasisNo]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[licensePlate]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_engineNo_key" ON "Vehicle"("engineNo");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_chasisNo_key" ON "Vehicle"("chasisNo");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_licensePlate_key" ON "Vehicle"("licensePlate");
