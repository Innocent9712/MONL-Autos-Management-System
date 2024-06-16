-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "discount" DECIMAL(6,2) DEFAULT 0,
ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceCharge" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "vat" DECIMAL(6,1) DEFAULT 7.5;

-- CreateTable
CREATE TABLE "EstimateJobMaterial" (
    "id" SERIAL NOT NULL,
    "estimateID" INTEGER NOT NULL,
    "jobMaterialID" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateJobMaterial_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EstimateJobMaterial" ADD CONSTRAINT "EstimateJobMaterial_estimateID_fkey" FOREIGN KEY ("estimateID") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateJobMaterial" ADD CONSTRAINT "EstimateJobMaterial_jobMaterialID_fkey" FOREIGN KEY ("jobMaterialID") REFERENCES "JobMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
