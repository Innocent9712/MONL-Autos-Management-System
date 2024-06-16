/*
  Warnings:

  - You are about to drop the column `password` on the `Customer` table. All the data in the column will be lost.
  - Added the required column `customerTypeID` to the `Customer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "password",
ADD COLUMN     "customerTypeID" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_customerTypeID_fkey" FOREIGN KEY ("customerTypeID") REFERENCES "CustomerType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
