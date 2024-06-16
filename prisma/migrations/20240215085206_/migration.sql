/*
  Warnings:

  - You are about to drop the column `mileage` on the `Vehicle` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[estimateNo]` on the table `Estimate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceNo]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Vehicle` DROP COLUMN `mileage`;

-- CreateTable
CREATE TABLE `Mileage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicleID` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Estimate_estimateNo_key` ON `Estimate`(`estimateNo`);

-- CreateIndex
CREATE UNIQUE INDEX `Invoice_invoiceNo_key` ON `Invoice`(`invoiceNo`);

-- AddForeignKey
ALTER TABLE `Mileage` ADD CONSTRAINT `Mileage_vehicleID_fkey` FOREIGN KEY (`vehicleID`) REFERENCES `Vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
