/*
  Warnings:

  - You are about to drop the column `type` on the `CustomerType` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleType` on the `Vehicle` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `CustomerType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `CustomerType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleTypeID` to the `Vehicle` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CustomerType_type_key";

-- AlterTable
ALTER TABLE "CustomerType" DROP COLUMN "type",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "vehicleType",
ADD COLUMN     "vehicleTypeID" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "VehicleType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleType_name_key" ON "VehicleType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerType_name_key" ON "CustomerType"("name");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vehicleTypeID_fkey" FOREIGN KEY ("vehicleTypeID") REFERENCES "VehicleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
