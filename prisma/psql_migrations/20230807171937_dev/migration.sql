-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_createdByID_fkey";

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "createdByID" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdByID_fkey" FOREIGN KEY ("createdByID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
