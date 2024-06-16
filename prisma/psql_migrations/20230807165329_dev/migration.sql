/*
  Warnings:

  - You are about to drop the column `paid` on the `Estimate` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[jobID]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdByID` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobID` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_jobTypeID_fkey";

-- AlterTable
ALTER TABLE "Estimate" DROP COLUMN "paid",
ALTER COLUMN "vat" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "createdByID" INTEGER NOT NULL,
ADD COLUMN     "jobID" INTEGER NOT NULL,
ADD COLUMN     "updatedByID" INTEGER,
ALTER COLUMN "jobTypeID" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" ALTER COLUMN "modelNo" DROP NOT NULL;

-- CreateTable
CREATE TABLE "InvoiceDraft" (
    "id" SERIAL NOT NULL,
    "description" TEXT,
    "customerID" INTEGER,
    "jobTypeID" INTEGER,
    "vehicleID" INTEGER,
    "jobID" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceCharge" DECIMAL(65,30) DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "discountType" "DiscountType",
    "vat" DECIMAL(6,1) DEFAULT 7.5,
    "discount" DECIMAL(6,2) DEFAULT 0,

    CONSTRAINT "InvoiceDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceDraftJobMaterial" (
    "id" SERIAL NOT NULL,
    "draftID" INTEGER NOT NULL,
    "jobMaterialID" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceDraftJobMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceDraft_jobID_key" ON "InvoiceDraft"("jobID");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_jobID_key" ON "Invoice"("jobID");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobTypeID_fkey" FOREIGN KEY ("jobTypeID") REFERENCES "JobType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobID_fkey" FOREIGN KEY ("jobID") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdByID_fkey" FOREIGN KEY ("createdByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDraft" ADD CONSTRAINT "InvoiceDraft_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDraft" ADD CONSTRAINT "InvoiceDraft_jobTypeID_fkey" FOREIGN KEY ("jobTypeID") REFERENCES "JobType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDraft" ADD CONSTRAINT "InvoiceDraft_vehicleID_fkey" FOREIGN KEY ("vehicleID") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDraft" ADD CONSTRAINT "InvoiceDraft_jobID_fkey" FOREIGN KEY ("jobID") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDraftJobMaterial" ADD CONSTRAINT "InvoiceDraftJobMaterial_draftID_fkey" FOREIGN KEY ("draftID") REFERENCES "InvoiceDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDraftJobMaterial" ADD CONSTRAINT "InvoiceDraftJobMaterial_jobMaterialID_fkey" FOREIGN KEY ("jobMaterialID") REFERENCES "JobMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
