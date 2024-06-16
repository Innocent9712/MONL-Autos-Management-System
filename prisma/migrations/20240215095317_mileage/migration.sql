-- DropForeignKey
ALTER TABLE `Mileage` DROP FOREIGN KEY `Mileage_vehicleID_fkey`;

-- AddForeignKey
ALTER TABLE `Mileage` ADD CONSTRAINT `Mileage_vehicleID_fkey` FOREIGN KEY (`vehicleID`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
