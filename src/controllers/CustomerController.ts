import { Prisma } from "@prisma/client";
import { db } from "../utils/prismaClient";
import { Request, Response } from "express";
import { isValidDate } from "../utils/general";

class CustomerController {
    async createCustomer(req: Request, res: Response) {
        const {
            first_name,
            last_name,
            other_name,
            email,
            billing_address,
            company_contact,
            company_name,
            phone,
            lga,
            city,
            customer_type_id,
            model_no,
            model_name,
            engine_no,
            chassis_no,
            license_plate,
            vehicle_type_id,
            mileage
        } = req.body;

        if (
            !customer_type_id || !first_name || !last_name || !email || !billing_address || !phone
            ) {
                if (!first_name) {
                    return res.status(400).json({ error_code: 400, msg: `Missing information: first_name` });
                }
                if (!customer_type_id) {
                    return res.status(400).json({ error_code: 400, msg: `Missing information: customer_type_id` });
                }
                if (!last_name) {
                    return res.status(400).json({ error_code: 400, msg: `Missing information: last_name` });
                }
                if (!email) {
                    return res.status(400).json({ error_code: 400, msg: `Missing information: email` });
                }
                if (!phone) {
                    return res.status(400).json({ error_code: 400, msg: `Missing information: phone` });
                }
                if (!billing_address) {
                    return res.status(400).json({ error_code: 400, msg: `Missing information: billing_address` });
                }
                return res.status(400).json({ error_code: 400, msg: 'Missing information.' });
            } else if ((company_name  && !company_contact) || (!company_name && company_contact)) {
                return res.status(400).json({ error_code: 400, msg: 'Company information is incomplete.' });
            } else {

                if (
                    (model_no || model_name || chassis_no || license_plate || vehicle_type_id || mileage) &&
                    (!(model_no && model_name && chassis_no && license_plate && vehicle_type_id && mileage))
                ) {
                    // At least one property is present, and at least one of the rest is not present
                    return res.status(400).json({ error_code: 400, msg: 'Vehicle information is incomplete.' });
                }

                try {
                    let customer = await db.customer.findUnique({where: {email}})
                    let customerType = await db.customerType.findUnique({where: {id: customer_type_id}})
        
                    if (customer) {
                        return res.status(400).json({ error_code: 400, msg: 'Customer already exists.' });
                    }

                    if (!customerType) {
                        return res.status(400).json({ error_code: 400, msg: 'Customer type does not exist.' });
                    }

                    if (license_plate) {
                        const vehicleInDB = await db.vehicle.findUnique({where: {licensePlate: license_plate}})
                        if (vehicleInDB) {
                            return res.status(400).json({ error_code: 400, msg: 'Vehicle already exists.' });
                        }
                    }

                    if (engine_no) {
                        const vehicleInDB = await db.vehicle.findUnique({where: {engineNo: engine_no}})
                        if (vehicleInDB) {
                            return res.status(400).json({ error_code: 400, msg: 'Vehicle already exists.' });
                        }
                    }

                    if (chassis_no) {
                        const vehicleInDB = await db.vehicle.findUnique({where: {chasisNo: chassis_no}})
                        if (vehicleInDB) {
                            return res.status(400).json({ error_code: 400, msg: 'Vehicle already exists.' });
                        }
                    }

                    customer = await db.customer.create({
                        data: {
                            firstName: first_name,
                            lastName: last_name,
                            otherName: other_name,
                            email,
                            billingAddress: billing_address,
                            companyContact: company_contact,
                            companyName: company_name,
                            phone,
                            lga,
                            city,
                            customerTypeID: parseInt(customer_type_id, 10)
                        }
                    })
        
                    if (customer) {
                        let data: {[key: string]: string | number | null | Date} = {}
                        data = {...customer}
                        if (model_no) {
                            const vehicle: {[key: string]: number | string | Date | null | any} = await db.vehicle.create({
                                data: {
                                    modelNo: model_no,
                                    modelName: model_name,
                                    engineNo: engine_no ?? null,
                                    chasisNo: chassis_no,
                                    licensePlate: license_plate,
                                    ownerID: customer.id,
                                    vehicleTypeID: parseInt(vehicle_type_id, 10),
                                    // mileage: parseInt(mileage, 10)
                                }
                            })

                            const mil = await db.mileage.create({
                                data: {
                                    mileage: parseInt(mileage, 10),
                                    vehicleID: vehicle.id
                                }
                            })

                            await db.ownershipHistory.create({
                                data: {
                                    currentOwnerID:  customer.id,
                                    vehicleID: vehicle.id
                                }
                            })

                            vehicle["vehichleID"] = vehicle.id
                            vehicle["mileage"] = [mil]
                            data = {...vehicle, ...data}
                        }
                        res.status(201).json({data, msg: "Customer Created Sucessfully."});
                    }
                    
                } catch (error) {
                    console.log(error)
                    res.status(400).json({ error_code: 400, msg: 'Could not create customer' });
                }
            }

    }
    async getCustomers(req: Request, res: Response) {
        const page = req.query?.page ? parseInt(req.query.page.toString()) : undefined;
        const limit = req.query?.limit ? parseInt(req.query.limit.toString()) : undefined;
        const startDatetime = req.body?.start;
        const endDatetime = req.body?.end;
        const filterValue = req.query?.filter as string || null;

        if ((startDatetime && !endDatetime) || (!startDatetime && endDatetime)) {
            return res.status(400).json({ error_code: 400, msg: 'start and end datetime must be provided' });
        }

        if ((startDatetime && !isValidDate(startDatetime)) || (endDatetime && !isValidDate(endDatetime))) {
            return res.status(400).json({ error_code: 400, msg: 'Invalid start or end datetime format.' });
        }

        try {
            let customers;
            let totalCount;

            const whereFilter: Prisma.CustomerWhereInput = {};
            if (filterValue) {
                const parsedFilterValue = parseInt(filterValue);
                if (!isNaN(parsedFilterValue)) {
                    whereFilter.OR = [
                        { customerTypeID: { equals: parsedFilterValue } }, // or { in: [parseInt(filterValue), ...] } if you need multiple types
                        { companyName: { contains: filterValue } },
                        { firstName: { contains: filterValue } },
                    ];
                } else {
                    whereFilter.OR = [
                        { companyName: { contains: filterValue } },
                        { firstName: { contains: filterValue } },
                    ];
                }
            }

            if (page !== undefined && limit !== undefined) {
                // Pagination is requested
                totalCount = await db.customer.count({
                    where: whereFilter,
                });

                // Retrieve customers with pagination
                customers = await db.customer.findMany({
                    where: whereFilter,
                    orderBy: {
                        createdAt: 'desc',
                    },
                    skip: (page - 1) * limit, // Calculate the offset
                    take: limit, // Limit the number of items per page
                });

                // Check if the number of items returned is less than the specified limit
                const isLastPage = customers.length < limit;

                res.status(200).json({ data: customers, totalCount, isLastPage });
            } else {
                // No pagination
                const queryOptions: Prisma.CustomerFindManyArgs = {
                    where: {
                        ...whereFilter,
                        ...(startDatetime && endDatetime && {
                            createdAt: {
                                gte: new Date(startDatetime),
                                lte: new Date(endDatetime),
                            },
                        }),
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                };
                customers = await db.customer.findMany(queryOptions);
                res.status(200).json({ data: customers });
            }
        } catch (error) {
            console.log(error)
            res.status(400).json({ error_code: 400, msg: 'Could not get customers.' });
        }
    }


    async getCustomer(req: Request, res: Response) {
        const { id } = req.params;
        try {
            const customer = await db.customer.findUnique({ where: { id: parseInt(id, 10) } });
            if (!customer) {
                return res.status(404).json({ error_code: 404, msg: 'Customer not found.' });
            }
            res.status(200).json({data: customer});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not get customer.' });
        }
    }

    async updateCustomer(req: Request, res: Response) {
        const { id } = req.params;
        const {
            first_name,
            last_name,
            other_name,
            email,
            billing_address,
            company_contact,
            company_name,
            phone,
            lga,
            city,
            customer_type_id
        } = req.body;
        
        const customer = await db.customer.findUnique({where: {id: parseInt(id, 10)}})

        if (!customer) return res.status(404).json({ error_code: 404, msg: 'Customer not found.' });
        const data: Prisma.CustomerUncheckedCreateInput = {} as Prisma.CustomerUncheckedCreateInput
        if (first_name) {
            data.firstName = first_name;
        }
        if (last_name) {
            data.lastName = last_name;
        }
        if (other_name) {
            data.otherName = other_name;
        }
        if (email) {
            const customer = await db.customer.findUnique({where: {email}})
            if(customer && customer.id !== parseInt(id, 10)) 
                return res.status(400).json({ error_code: 400, msg: 'Email already in use by a different Customer.' });
            data.email = email;
        }
        if (billing_address) {
            data.billingAddress = billing_address;
        }
        if (company_contact) {
            data.companyContact = company_contact;
        }
        if (company_name) {
            data.companyName = company_name;
        }
        if (phone) {
            data.phone = phone;
        }
        if (lga) {
            data.lga = lga;
        }
        if (city) {
            data.city = city;
        }
        if (customer_type_id) {
            const customerType = await db.customerType.findUnique({where: {id: customer_type_id}})
            if (!customerType) return res.status(400).json({ error_code: 400, msg: 'Customer type does not exist.' });
            data.customerTypeID = parseInt(customer_type_id, 10);
        }

        try {
            const updatedCustomer = await db.customer.update({
                where: { id: parseInt(id, 10) },
                data
            });
            res.status(200).json({data: updatedCustomer, msg: "Customer Updated Sucessfully."});
        } catch (error) {
            console.error(error)
            res.status(400).json({ error_code: 400, msg: 'Could not update customer.' });
        }
    }

    async deleteCustomer(req: Request, res: Response) {
        const { id } = req.params;
        const customer = await db.customer.findUnique({where: {id: parseInt(id, 10)}})
        if (!customer) return res.status(404).json({ error_code: 404, msg: 'Customer not found.' });
        try {
            await db.estimate.deleteMany({where: {customerID: customer.id}})
            await db.invoice.deleteMany({where: {customerID: customer.id}})
            await db.job.deleteMany({where: {customerID: customer.id}})
            await db.vehicle.deleteMany({where: {ownerID: customer.id}})
            const deletedCustomer = await db.customer.delete({ where: { id: parseInt(id, 10) } });
            res.status(200).json({data: deletedCustomer, msg:"Customer Deleted Sucessfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not delete customer.' });
        }
    }

    async getCustomerTypes (req: Request, res: Response) {
        try {
            const customerTypes = await db.customerType.findMany({
                orderBy: {
                    id: 'asc'
                }
            });
            res.status(200).json({data: customerTypes});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not get customer types.' });
        }
    }

}

const customerController = new CustomerController();
export default customerController;
