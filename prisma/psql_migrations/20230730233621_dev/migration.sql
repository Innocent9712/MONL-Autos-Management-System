-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'AMOUNT');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "discount" DECIMAL(6,2) DEFAULT 0,
ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "vat" DECIMAL(6,1) DEFAULT 7.5;

-- CreateTable
CREATE TABLE "InvoiceJobMaterial" (
    "id" SERIAL NOT NULL,
    "invoiceID" INTEGER NOT NULL,
    "jobMaterialID" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceJobMaterial_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InvoiceJobMaterial" ADD CONSTRAINT "InvoiceJobMaterial_invoiceID_fkey" FOREIGN KEY ("invoiceID") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceJobMaterial" ADD CONSTRAINT "InvoiceJobMaterial_jobMaterialID_fkey" FOREIGN KEY ("jobMaterialID") REFERENCES "JobMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
