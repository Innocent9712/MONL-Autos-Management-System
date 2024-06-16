-- DropForeignKey
ALTER TABLE `OwnershipHistory` DROP FOREIGN KEY `OwnershipHistory_vehicleID_fkey`;

-- AddForeignKey
ALTER TABLE `OwnershipHistory` ADD CONSTRAINT `OwnershipHistory_vehicleID_fkey` FOREIGN KEY (`vehicleID`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
