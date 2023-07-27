/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `CustomerType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CustomerType_type_key" ON "CustomerType"("type");
