-- DropForeignKey
ALTER TABLE `Vehicle` DROP FOREIGN KEY `Vehicle_ownerID_fkey`;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_ownerID_fkey` FOREIGN KEY (`ownerID`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
