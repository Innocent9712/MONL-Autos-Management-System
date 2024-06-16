// import { PrismaClient } from "@prisma/client";
import { db } from "../../src/utils/prismaClient";
import { readExcelAndSeedDatabase } from "../../src/utils/seedJobMaterial";
import { user, roles, customerTypes, vehicleTypes, jobTypes } from "./data";


async function seed() {
    for (const role of roles) {
        await db.role.create({
            data: role
        });
    }

    for (const type of customerTypes) {
        await db.customerType.create({
            data: type
        });
    }

    for (const type of vehicleTypes) {
        await db.vehicleType.create({
            data: type
        });
    }

    for (const type of jobTypes) {
        await db.jobType.create({
            data: type
        })
    }

    await db.user.create({
        data: user
    });

    // Set the starting value of the auto-incremented InvoiceNo and EstimateNo to 100000
    // // postgres
    // await db.$queryRaw`ALTER SEQUENCE "Invoice_invoiceNo_seq" RESTART WITH 100000`;
    // await db.$queryRaw`ALTER SEQUENCE "Estimate_estimateNo_seq" RESTART WITH 100000`;
    
    // // mysql
    // await db.$executeRaw`ALTER TABLE Invoice MODIFY COLUMN invoiceNo INT AUTO_INCREMENT`;
    // await db.$queryRaw`ALTER TABLE Invoice MODIFY COLUMN Invoice_No INT AUTO_INCREMENT = 100000;`;
    // await db.$executeRaw`ALTER TABLE Estimate MODIFY COLUMN estimateNo INT AUTO_INCREMENT`;
    // await db.$queryRaw`ALTER TABLE Estimate MODIFY COLUMN Estimate_No INT AUTO_INCREMENT = 100000;`;
    
    // // seed the database with the job materials
    // await readExcelAndSeedDatabase();
}

seed()
  .catch((e) => console.error(e))
  .finally(async () => {
    await db.$disconnect();
});