-- CreateTable
CREATE TABLE `OwnershipHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `previousOwnerID` INTEGER NULL,
    `currentOwnerID` INTEGER NULL,
    `vehicleID` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OwnershipHistory` ADD CONSTRAINT `OwnershipHistory_previousOwnerID_fkey` FOREIGN KEY (`previousOwnerID`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OwnershipHistory` ADD CONSTRAINT `OwnershipHistory_currentOwnerID_fkey` FOREIGN KEY (`currentOwnerID`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OwnershipHistory` ADD CONSTRAINT `OwnershipHistory_vehicleID_fkey` FOREIGN KEY (`vehicleID`) REFERENCES `Vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
