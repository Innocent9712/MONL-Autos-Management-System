/*
  Warnings:

  - A unique constraint covering the columns `[subscriberID]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subscriberID" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_subscriberID_key" ON "User"("subscriberID");
