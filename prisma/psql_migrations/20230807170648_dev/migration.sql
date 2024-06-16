-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_jobID_fkey";

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "jobID" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobID_fkey" FOREIGN KEY ("jobID") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
