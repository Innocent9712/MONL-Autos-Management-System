import { Prisma } from "@prisma/client";
import { db } from "../../src/utils/prismaClient";
import { Request, Response } from "express";
import { isValidDate } from "../utils/general";

class Vehicle {
    async createVehicle (req: Request, res: Response) {
        const {
            owner_id,
            model_no,
            model_name,
            engine_no,
            chassis_no,
            license_plate,
            vehicle_type_id,
            mileage
        } = req.body

        if (
            !owner_id || !model_name || !chassis_no || !license_plate || !vehicle_type_id || !mileage
        ) {
            return res.status(400).json({ error_code: 400, msg: 'Missing information.' });
        }

        if (chassis_no.length !== 17) return res.status(400).json({ error_code: 400, msg: 'Chassis/VIN number must be 17 characters.' });

        try {
            const owner = await db.customer.findUnique({where: {id: parseInt(owner_id, 10)}})
            const vehicleType = await db.vehicleType.findUnique({where: {id: parseInt(vehicle_type_id, 10)}})
            const vehicleInDB = await db.vehicle.findUnique({where: {licensePlate: license_plate}})

            if (!owner) return res.status(400).json({ error_code: 400, msg: 'Owner does not exist.' });
            if (!vehicleType) return res.status(400).json({ error_code: 400, msg: 'Vehicle type does not exist.' });
            if (vehicleInDB) return res.status(400).json({ error_code: 400, msg: 'Vehicle already exists.' });

            const vehicle = await db.vehicle.create({
                data: {
                    modelNo: model_no,
                    modelName: model_name,
                    engineNo: engine_no,
                    chasisNo: chassis_no,
                    licensePlate: license_plate,
                    ownerID: parseInt(owner_id, 10),
                    vehicleTypeID: parseInt(vehicle_type_id, 10),
                    mileage: parseInt(mileage, 10)
                }
            })

            if (vehicle) {
                res.status(201).json({data: vehicle, msg: "Vehicle Created Sucessfully."});
            }
            
        } catch (error) {
            console.log(error)
            res.status(500).json({error_code: 500, msg: "Internal server error."})
        }
        
    }

    async getVehicles (req: Request, res: Response) {
        const license = req.query?.name?.toString() ?? ""
        const startDatetime = req.body?.start;
        const endDatetime = req.body?.end;


        if ((startDatetime && !endDatetime) || (!startDatetime && endDatetime)) {
            return res.status(400).json({ error_code: 400, msg: 'start and end datetime must be provided' });
        }


        if ((startDatetime && !isValidDate(startDatetime)) || (endDatetime && !isValidDate(endDatetime))) {
            return res.status(400).json({ error_code: 400, msg: 'Invalid start or end datetime format.' });
        }

        try {
            let queryOptions: {[key: string]: any} = {}
            if (startDatetime && endDatetime) {
                queryOptions = {
                  createdAt: {
                    gte: new Date(startDatetime),
                    lte: new Date(endDatetime),
                  },
                };
              }
            const vehicles = await db.vehicle.findMany({
                where: {
                    licensePlate: {
                        contains: license,
                        mode: "insensitive"
                    },
                    ...queryOptions
                },
                select: {
                    id: true,
                    modelNo: true,
                    modelName: true,
                    engineNo: true,
                    chasisNo: true,
                    mileage: true,
                    licensePlate: true,
                    createdAt: true,
                    updatedAt: true,
                    ownerID: true,
                    vehicleTypeID: true,
                    owner: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true
                        }
                    },
                    vehicleType: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    id: 'asc'
                }
            })
            res.status(200).json({data: vehicles});
        } catch (error) {
            res.status(500).json({error_code: 500, msg: "Internal server error."})
        }
    }

    async getCustomerVehicles (req: Request, res: Response) {
        const {customerID} = req.params
        try {
            const vehicles = await db.vehicle.findMany({
                where: {
                    ownerID: parseInt(customerID, 10)
                },
                select: {
                    id: true,
                    modelNo: true,
                    modelName: true,
                    engineNo: true,
                    chasisNo: true,
                    licensePlate: true,
                    mileage: true,
                    ownerID: true,
                    vehicleTypeID: true,
                    owner: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true
                        }
                    },
                    vehicleType: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    id: 'asc'
                }
            })
            res.status(200).json({data: vehicles});
        } catch (error) {
            res.status(500).json({error_code: 500, msg: "Internal server error."})
        }
    }

    async getVehicle (req: Request, res: Response) {
        const {id} = req.params
        try {
            const vehicle = await db.vehicle.findUnique({
                where: {
                    id: parseInt(id, 10)
                },
                select: {
                    id: true,
                    modelNo: true,
                    modelName: true,
                    engineNo: true,
                    chasisNo: true,
                    licensePlate: true,
                    ownerID: true,
                    vehicleTypeID: true,
                    owner: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true
                        }
                    },
                    vehicleType: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            })
            res.status(200).json({data: vehicle});
        } catch (error) {
            res.status(500).json({error_code: 500, msg: "Internal server error."})
        }
    }

    async getCustomerVehicle (req: Request, res: Response) {
        const {vehicleID, customerID} = req.params
        try {
            const vehicle = await db.vehicle.findFirst({
                where: {
                    AND: {
                        id: parseInt(vehicleID, 10),
                        ownerID: parseInt(customerID, 10)
                    }
                },
                select: {
                    id: true,
                    modelNo: true,
                    modelName: true,
                    engineNo: true,
                    chasisNo: true,
                    licensePlate: true,
                    ownerID: true,
                    vehicleTypeID: true,
                    mileage: true,
                    vehicleType: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            })
            res.status(200).json({data: vehicle});
        } catch (error) {
            res.status(500).json({error_code: 500, msg: "Internal server error."})
        }
    }

    async updateCustomerVehicle (req: Request, res: Response) {
        const {
            model_no,
            model_name,
            engine_no,
            chassis_no,
            license_plate,
            vehicle_type_id,
            mileage
        } = req.body
        const {vehicleID, customerID} = req.params

        const vehicle = await db.vehicle.findFirst({
            where: {
                AND: {
                    id: parseInt(vehicleID, 10),
                    ownerID: parseInt(customerID, 10)
                }
            }
        })

        if (!vehicle) return res.status(400).json({ error_code: 400, msg: 'Vehicle does not exist.' });

        const data: {[key: string]: number | string} = {}

        if (model_no) data.modelNo = model_no
        if (model_name) data.modelName = model_name
        if (mileage) data.mileage = parseInt(mileage, 10)
        if (engine_no) {
            const vehicleWithEngineNo = await db.vehicle.findFirst({
                where: {
                    engineNo: engine_no,
                    NOT: {
                        ownerID: parseInt(customerID, 10)
                    }
                }
            })

            if (vehicleWithEngineNo) return res.status(400).json({ error_code: 400, msg: 'Engine number already in use by another Vehicle.' });
            data.engineNo = engine_no
        }
        if (chassis_no) {
            if (chassis_no.length !== 17) return res.status(400).json({ error_code: 400, msg: 'Chassis/VIN number must be 17 characters.' });
            const vehicleWithChassisNo = await db.vehicle.findFirst({
                where: {
                    chasisNo: chassis_no,
                    NOT: {
                        ownerID: parseInt(customerID, 10)
                    }
                }
            })
            if (vehicleWithChassisNo) return res.status(400).json({ error_code: 400, msg: 'Chassis/VIN number already in use by another Vehicle.' });
            data.chasisNo = chassis_no
        }
        if (license_plate) {
            const vehicleWithLicensePlate = await db.vehicle.findFirst({
                where: {
                    licensePlate: license_plate,
                    NOT: {
                        ownerID: parseInt(customerID, 10)
                    }
                }
            })
            if (vehicleWithLicensePlate) return res.status(400).json({ error_code: 400, msg: 'License plate already in use by another Vehicle.' });
            data.licensePlate = license_plate
        }

        if (vehicle_type_id) {
            const vehicleType = await db.vehicleType.findUnique({where: {id: parseInt(vehicle_type_id, 10)}})
            if (!vehicleType) return res.status(400).json({ error_code: 400, msg: 'Vehicle type does not exist.' });
            data.vehicleTypeID = vehicle_type_id
        }


        try {
            const vehicle = await db.vehicle.update({
                where: {
                    id: parseInt(vehicleID, 10)
                },
                data
            })

            if (vehicle) {
                res.status(200).json({data: vehicle, msg: "Vehicle Updated Sucessfully."});
            }
            
        } catch (error) {
            res.status(500).json({error_code: 500, msg: "Internal server error."})
        }
        
    }

    async transferVehicleOwnership (req: Request, res: Response) {
        const {id, customerID} = req.params
        const data: Prisma.VehicleUncheckedUpdateInput = {
            ownerID: parseInt(customerID, 10)
        }

        try {
            const vehicle = await db.vehicle.update({
                where: {
                    id: parseInt(id, 10)
                },
                data
            })

            if (vehicle) {
                res.status(200).json({data: vehicle, msg: "Vehicle Updated Sucessfully."});
            }
            
        } catch (error) {
            res.status(500).json({error_code: 500, msg: "Internal server error."})
        }
    }

    async deleteCustomerVehicle (req: Request, res: Response) {
        const {vehicleID, customerID} = req.params
        try {
            let vehicle = await db.vehicle.findFirst({
                where: {
                    AND: {
                        id: parseInt(vehicleID, 10),
                        ownerID: parseInt(customerID, 10)
                    }
                }
            })

            if (!vehicle) return res.status(400).json({ error_code: 400, msg: 'Vehicle does not exist.' });

            vehicle = await db.vehicle.delete({
                where: {
                    id: parseInt(vehicleID, 10)
                }
            })

            res.status(200).json({data: vehicle, msg: "Vehicle deleted successfully."});
        } catch (error) {
            res.status(500).json({error_code: 500, msg: "Internal server error."})
        }
    }

    async getVehicleTypes (req: Request, res: Response) {
        try {
            const vehicleTypes = await db.vehicleType.findMany({
                orderBy: {
                    id: 'asc'
                }
            });
            res.status(200).json({data: vehicleTypes});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not get vehicle types.' });
        }
    }

}

class VehicleType {
    async getTypes (req: Request, res: Response) {
        try {
            const vehicleTypes = await db.vehicleType.findMany({
                orderBy: {
                    id: 'asc'
                }
            })
            res.status(200).json({data: vehicleTypes});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not get vehicle types.' });
        }
    }

    async getType (req: Request, res: Response) {
        const {id} = req.params
        try {
            const vehicleType = await db.vehicleType.findUnique({
                where: {
                    id: parseInt(id, 10)
                }
            })
            res.status(200).json({data: vehicleType});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not get vehicle type.' });
        }
    }

    async createType(req: Request, res: Response) {
        const {name} = req.body

        if (!name) return res.status(400).json({ error_code: 400, msg: 'Missing information.' });
        try {
            const vehicleType = await db.vehicleType.create({
                data: {
                    name
                }
            })
            res.status(201).json({data: vehicleType, msg: "Vehicle type created successfully."});
        } catch (error) {
            console.log(error)
            res.status(400).json({ error_code: 400, msg: 'Could not create vehicle type.' });
        }
    }

    async updateType (req: Request, res: Response) {
        const {id} = req.params
        const {name} = req.body
        try {
            const vehicleType = await db.vehicleType.update({
                where: {
                    id: parseInt(id, 10)
                },
                data: {
                    name
                }
            })
            res.status(200).json({data: vehicleType, msg: "Vehicle type updated successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not update vehicle type.' });
        }
    }

    async deleteType (req: Request, res: Response) {
        const {id} = req.params
        try {
            const vehicleType = await db.vehicleType.delete({
                where: {
                    id: parseInt(id, 10)
                }
            })
            res.status(200).json({data: vehicleType, msg: "Vehicle type deleted successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not delete vehicle type.' });
        }
    }
}

class VehicleController {
    vehicle: Vehicle
    vehicleType: VehicleType
    constructor() {
        this.vehicle = new Vehicle()
        this.vehicleType = new VehicleType()
    }
}

const vehicleController = new VehicleController();
export default vehicleController;
