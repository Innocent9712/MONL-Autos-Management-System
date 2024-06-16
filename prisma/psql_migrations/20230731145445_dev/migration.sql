/*
  Warnings:

  - Added the required column `jobTypeID` to the `Estimate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobTypeID` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "jobTypeID" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "jobTypeID" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobTypeID_fkey" FOREIGN KEY ("jobTypeID") REFERENCES "JobType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_jobTypeID_fkey" FOREIGN KEY ("jobTypeID") REFERENCES "JobType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
