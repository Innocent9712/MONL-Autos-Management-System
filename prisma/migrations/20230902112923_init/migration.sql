-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `roleID` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `subscriberID` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_subscriberID_key`(`subscriberID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `otherName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `billingAddress` VARCHAR(191) NOT NULL,
    `companyContact` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NULL,
    `lga` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `customerTypeID` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CustomerType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ownerID` INTEGER NOT NULL,
    `modelNo` VARCHAR(191) NULL,
    `modelName` VARCHAR(191) NOT NULL,
    `engineNo` VARCHAR(191) NULL,
    `chasisNo` VARCHAR(191) NOT NULL,
    `licensePlate` VARCHAR(191) NOT NULL,
    `mileage` INTEGER NOT NULL,
    `vehicleTypeID` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Vehicle_engineNo_key`(`engineNo`),
    UNIQUE INDEX `Vehicle_chasisNo_key`(`chasisNo`),
    UNIQUE INDEX `Vehicle_licensePlate_key`(`licensePlate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VehicleType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobMaterial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productName` VARCHAR(191) NOT NULL,
    `productCost` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Job` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerID` INTEGER NOT NULL,
    `vehicleID` INTEGER NOT NULL,
    `jobTypeID` INTEGER NOT NULL,
    `deliveryDate` DATETIME(3) NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'NOT_STARTED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dueDate` DATETIME(3) NULL,
    `description` VARCHAR(191) NULL,
    `invoiceNo` INTEGER NOT NULL,
    `customerID` INTEGER NOT NULL,
    `jobTypeID` INTEGER NULL,
    `vehicleID` INTEGER NOT NULL,
    `jobID` INTEGER NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `paid` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `serviceCharge` DECIMAL(65, 30) NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,
    `discountType` ENUM('PERCENTAGE', 'AMOUNT') NULL,
    `vat` DECIMAL(6, 1) NULL DEFAULT 7.5,
    `discount` DOUBLE NULL DEFAULT 0,
    `createdByID` INTEGER NULL,
    `updatedByID` INTEGER NULL,

    UNIQUE INDEX `Invoice_jobID_key`(`jobID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceDraft` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NULL,
    `customerID` INTEGER NULL,
    `jobTypeID` INTEGER NULL,
    `vehicleID` INTEGER NULL,
    `jobID` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `serviceCharge` DECIMAL(65, 30) NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,
    `discountType` ENUM('PERCENTAGE', 'AMOUNT') NULL,
    `vat` DECIMAL(6, 1) NULL DEFAULT 7.5,
    `discount` DOUBLE NULL DEFAULT 0,

    UNIQUE INDEX `InvoiceDraft_jobID_key`(`jobID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceJobMaterial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceID` INTEGER NOT NULL,
    `jobMaterialID` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceDraftJobMaterial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draftID` INTEGER NOT NULL,
    `jobMaterialID` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EstimateJobMaterial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estimateID` INTEGER NOT NULL,
    `jobMaterialID` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Estimate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dueDate` DATETIME(3) NULL,
    `description` VARCHAR(191) NULL,
    `estimateNo` INTEGER NOT NULL,
    `customerID` INTEGER NOT NULL,
    `jobTypeID` INTEGER NOT NULL,
    `vehicleID` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `serviceCharge` DECIMAL(65, 30) NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,
    `discountType` ENUM('PERCENTAGE', 'AMOUNT') NULL,
    `vat` DECIMAL(6, 1) NULL DEFAULT 0,
    `discount` DOUBLE NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleID_fkey` FOREIGN KEY (`roleID`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_customerTypeID_fkey` FOREIGN KEY (`customerTypeID`) REFERENCES `CustomerType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_ownerID_fkey` FOREIGN KEY (`ownerID`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_vehicleTypeID_fkey` FOREIGN KEY (`vehicleTypeID`) REFERENCES `VehicleType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_customerID_fkey` FOREIGN KEY (`customerID`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_vehicleID_fkey` FOREIGN KEY (`vehicleID`) REFERENCES `Vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_jobTypeID_fkey` FOREIGN KEY (`jobTypeID`) REFERENCES `JobType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_customerID_fkey` FOREIGN KEY (`customerID`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_jobTypeID_fkey` FOREIGN KEY (`jobTypeID`) REFERENCES `JobType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_vehicleID_fkey` FOREIGN KEY (`vehicleID`) REFERENCES `Vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_jobID_fkey` FOREIGN KEY (`jobID`) REFERENCES `Job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_createdByID_fkey` FOREIGN KEY (`createdByID`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_updatedByID_fkey` FOREIGN KEY (`updatedByID`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceDraft` ADD CONSTRAINT `InvoiceDraft_customerID_fkey` FOREIGN KEY (`customerID`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceDraft` ADD CONSTRAINT `InvoiceDraft_jobTypeID_fkey` FOREIGN KEY (`jobTypeID`) REFERENCES `JobType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceDraft` ADD CONSTRAINT `InvoiceDraft_vehicleID_fkey` FOREIGN KEY (`vehicleID`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceDraft` ADD CONSTRAINT `InvoiceDraft_jobID_fkey` FOREIGN KEY (`jobID`) REFERENCES `Job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceJobMaterial` ADD CONSTRAINT `InvoiceJobMaterial_invoiceID_fkey` FOREIGN KEY (`invoiceID`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceJobMaterial` ADD CONSTRAINT `InvoiceJobMaterial_jobMaterialID_fkey` FOREIGN KEY (`jobMaterialID`) REFERENCES `JobMaterial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceDraftJobMaterial` ADD CONSTRAINT `InvoiceDraftJobMaterial_draftID_fkey` FOREIGN KEY (`draftID`) REFERENCES `InvoiceDraft`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceDraftJobMaterial` ADD CONSTRAINT `InvoiceDraftJobMaterial_jobMaterialID_fkey` FOREIGN KEY (`jobMaterialID`) REFERENCES `JobMaterial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstimateJobMaterial` ADD CONSTRAINT `EstimateJobMaterial_estimateID_fkey` FOREIGN KEY (`estimateID`) REFERENCES `Estimate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstimateJobMaterial` ADD CONSTRAINT `EstimateJobMaterial_jobMaterialID_fkey` FOREIGN KEY (`jobMaterialID`) REFERENCES `JobMaterial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Estimate` ADD CONSTRAINT `Estimate_customerID_fkey` FOREIGN KEY (`customerID`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Estimate` ADD CONSTRAINT `Estimate_jobTypeID_fkey` FOREIGN KEY (`jobTypeID`) REFERENCES `JobType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Estimate` ADD CONSTRAINT `Estimate_vehicleID_fkey` FOREIGN KEY (`vehicleID`) REFERENCES `Vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
