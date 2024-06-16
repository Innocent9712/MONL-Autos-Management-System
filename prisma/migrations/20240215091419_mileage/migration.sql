/*
  Warnings:

  - Added the required column `mileage` to the `Mileage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Mileage` ADD COLUMN `mileage` INTEGER NOT NULL;
