import { db } from "../../src/utils/prismaClient";
import { Request, Response } from "express";
import { isValidDate } from "../utils/general";
import { compareArrays, convertStringToObjectArray, isValidDiscountType, isValidString } from "./InvoiceController";
import { EstimateJobMaterial, Prisma } from "@prisma/client";

class EstimateController {
    private static estimateNumberCount: number | null = null;

    constructor() {
        // Initialize the estimateNumberCount when the class is first constructed
        this.initializeEstimateNumberCount();
    }

    private async initializeEstimateNumberCount() {
        if (EstimateController.estimateNumberCount === null) {
        const lastEstimate = await db.estimate.findFirst({
            orderBy: { estimateNo: 'desc' }, // Find the estimate with the highest estimateNo
        });

        EstimateController.estimateNumberCount = lastEstimate ? lastEstimate.estimateNo : 100000; // Default value if no invoices have been created yet
        }
    }

    async createEstimate (req: Request, res: Response) {
        const {
            job_type_id,
            description,
            job_id,
            due_date,
            customer_id,
            vehicle_id,
            materials,
            service_charge,
            discount,
            discount_type,
            vat,
        } = req.body

        if (
            !job_type_id ||
            !vehicle_id ||
            !customer_id
        ) {
            return res.status(400).json({ error_code: 400, msg: 'Missing information.' });
        }

        if (due_date && !isValidDate(due_date)) return res.status(400).json({ error_code: 400, msg: 'Incorrect Date format for due_date. Please use the date format YYYY-MM-DD.' });

        try {
            const customer = await db.customer.findUnique({where: {id: parseInt(customer_id, 10)}})
            if (!customer) return res.status(404).json({ error_code: 404, msg: 'Customer not found.' });
            const vehicle = await db.vehicle.findFirst({where: {ownerID: customer.id, id: parseInt(vehicle_id, 10)}})
            if (!vehicle) return res.status(404).json({ error_code: 404, msg: "Vehicle not found or vehichle doesn't belong to customer."})
            if ((discount_type && !discount) || (discount && !discount_type)) return res.status(400).json({ error_code: 400, msg: 'Please provide both discount and discount_type.' });
            if (discount_type && !isValidDiscountType(discount_type)) return res.status(400).json({ error_code: 400, msg: 'Invalid discount_type.' });
            if (discount_type == "PERCENTAGE" && (parseFloat(discount) < 0 || parseFloat(discount) > 100)) return res.status(400).json({ error_code: 400, msg: 'Invalid discount value. Discount value must be between 0 and 100.' });

            EstimateController.estimateNumberCount! += 1;
        
            const data: Prisma.EstimateUncheckedCreateInput = {
                customerID: parseInt(customer_id, 10),
                jobTypeID: parseInt(job_type_id, 10),
                vehicleID: parseInt(vehicle_id, 10),
                estimateNo: EstimateController.estimateNumberCount!,
                description,
                dueDate: due_date ? (new Date(due_date)).toISOString() : null
            }
            let total = 0;

            if (service_charge) {
                let svc = parseFloat(service_charge);
                total += svc;
                data["serviceCharge"] = svc.toFixed(2)
                console.log("svc", "curr", total, "svc_charge", svc)
            }
            if (total < 0) return res.status(400).json({ error_code: 400, msg: 'Service Charge cannot be a negative value' });

            if (vat) {
                const vatFloat = parseFloat(vat);
                const vatAmount = total * (vatFloat / 100);
                total += vatAmount;
                data["vat"] = vatFloat;
                console.log("vat", "curr", total, "vat", vatFloat, "val", vatAmount)
            }

            let materialIDs, jobMaterials = [];
            if (materials) {
                if (!isValidString(materials)) return res.status(400).json({ error_code: 400, msg: 'Incorrect format for materials. Please use the format id:qty,id:qty.' });
                materialIDs = convertStringToObjectArray(materials)

                let subTotal = 0
                for (const item of materialIDs) {
                    const { id, qty } = item
                    const jobMaterial = await db.jobMaterial.findUnique({where: {id}})
                    if (!jobMaterial) return res.status(404).json({ error_code: 404, msg: 'Material not found.' });
                    jobMaterials.push(jobMaterial)
                    const productCostNumber = parseFloat(jobMaterial.productCost.toString());
                    const itemTotal = productCostNumber * qty;
                    subTotal += itemTotal;
                    console.log("adding", "curr", subTotal, jobMaterial.productName, "price", productCostNumber, "qty", qty, "itemTotal", itemTotal )
                }

                if (discount) {
                    if (discount_type == "AMOUNT") {
                        subTotal -= parseFloat(discount);
                        if (subTotal < 0) return res.status(400).json({ error_code: 400, msg: 'Discount amount is greater than service charge.' });
                        console.log("discount", "curr", subTotal, "disc", discount)
                    }
                    if (discount_type == "PERCENTAGE") {
                        if (subTotal == 0) return res.status(400).json({ error_code: 400, msg: 'Cannot apply a percentage discount when no service charge is applied.' });
                        const discountFloat = parseFloat(discount);
                        subTotal -= subTotal * (discountFloat / 100);
                        console.log("discount", "curr", subTotal, "disc", discount, "val", discountFloat)
                    }

                    data["discount"] = parseFloat(discount)
                    data["discountType"] = discount_type
                }
                
                total += subTotal
                console.log("curr", total )
            }


            data["amount"] = total.toFixed(2)


            const estimate = await db.estimate.create({
                data
            })

            if (estimate && jobMaterials) {
                for (const mat of jobMaterials) {
                    await db.estimateJobMaterial.create({
                        data: {
                            estimateID: estimate.id,
                            jobMaterialID: mat.id,
                            quantity: materialIDs?.find((item: any) => item.id == mat.id)?.qty,
                            price: mat.productCost
                        }
                    })
                }
            }

            res.status(201).json({data: estimate, msg: "Estimate created successfully."});
        } catch (error) {
            console.error(error)
            res.status(400).json({ error_code: 400, msg: 'Could not create estimate.' });
        }
    }


    async getEstimates (req: Request, res: Response) {
        const filterValue = req.query?.filter as string || null;
        const page = Number(req.query.page) || undefined;
        const limit = Number(req.query.limit) || undefined;
        const whereFilter: Prisma.EstimateWhereInput = {};

        if (filterValue) {
            const customerIDs = await db.customer.findMany({
                where: {
                    OR: [
                        { companyName: { contains: filterValue } },
                        { firstName: { contains: filterValue } },
                    ]
                },
                select: {
                    id: true
                }
            });

            const customerIDArray = customerIDs.map((customer) => customer.id);

            whereFilter.customerID = { in: customerIDArray };
        }


        try {
            if (page !== undefined && limit !== undefined) {
                let totalCount = await db.estimate.count({where: whereFilter});

                const estimates = await db.estimate.findMany({ 
                    where: whereFilter,
                    select: {
                        id: true,
                        estimateNo: true,
                        description: true,
                        createdAt: true,
                        serviceCharge: true,
                        dueDate: true,
                        materials: true,
                        vat: true,
                        discount: true,
                        amount: true,
                        discountType: true,
                        customerID: true,
                        customer: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone:true,
                                companyName: true,
                                companyContact: true,
                            }
                        },
                        vehicleID: true,
                        vehicle: {
                            select: {
                                modelNo: true,
                                modelName: true,
                            }
                        },
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    skip: (page -1) * limit,
                    take: limit,
                });
                const isLastPage = estimates.length < limit;

                res.status(200).json({data: estimates, totalCount, isLastPage, msg: "Estimates retrieved successfully."});
            } else {
                const estimates = await db.estimate.findMany({ 
                    where: whereFilter,
                    select: {
                        id: true,
                        estimateNo: true,
                        description: true,
                        createdAt: true,
                        serviceCharge: true,
                        dueDate: true,
                        materials: true,
                        vat: true,
                        discount: true,
                        amount: true,
                        discountType: true,
                        customerID: true,
                        customer: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone:true,
                                companyName: true,
                                companyContact: true,
                            }
                        },
                        vehicleID: true,
                        vehicle: {
                            select: {
                                modelNo: true,
                                modelName: true,
                            }
                        },
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });
                res.status(200).json({data: estimates, msg: "Estimates retrieved successfully."});
            }

        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not retrieve estimates.' });
        }
    }

    async getEstimate (req: Request, res: Response) {
        const { id } = req.params;
        try {
            const estimate = await db.estimate.findUnique({ 
                where: { id: parseInt(id, 10) },
                select: {
                    id: true,
                    estimateNo: true,
                    description: true,
                    createdAt: true,
                    dueDate: true,
                    serviceCharge: true,
                    vat: true,
                    discount: true,
                    amount: true,
                    discountType: true,
                    customer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            billingAddress: true,
                            companyContact: true,
                            companyName: true,
                            customerType: true
                        }
                    },
                    vehicle: {
                        select: {
                            modelNo: true,
                            modelName: true,
                            licensePlate: true,
                            chasisNo: true,
                            mileage: true
                        }
                    },
                    jobType: {
                        select: {
                            name: true
                        }
                    },
                    materials: {
                        select: {
                            id: true,
                            price: true,
                            quantity: true,
                            jobMaterial: {
                                select: {
                                    id: true,
                                    productName: true
                                }
                            }
                        }
                    }            
                }
             });
            if (!estimate) {
                return res.status(404).json({ error_code: 404, msg: 'Estimate not found.' });
            }
            res.status(200).json({data: estimate, msg: "Estimate retrieved successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not retrieve estimate.' });
        }
    }

    async updateEstimate (req: Request, res: Response) {
        const { id } = req.params;
        const {
            description,
            due_date,
            job_type_id,
            service_charge,
            discount,
            discount_type,
            materials,
            vat,
        } = req.body
        
        try {
            const estimate = await db.estimate.findUnique({where: {id: parseInt(id, 10)}})

            if (!estimate) return res.status(404).json({ error_code: 404, msg: 'Invoice not found.' });

            const data: Prisma.EstimateUncheckedCreateInput = {} as Prisma.EstimateUncheckedCreateInput
    
            if (due_date && !isValidDate(due_date)) return res.status(400).json({ error_code: 400, msg: 'Incorrect Date format for due_date. Please use the date format YYYY-MM-DD.' });
            if (due_date) data['dueDate'] = (new Date(due_date)).toISOString()
            if (description) data['description'] = description
            if (job_type_id) {
                const jobType = await db.jobType.findUnique({where: {id: parseInt(job_type_id, 10)}})
                if (!jobType) return res.status(404).json({ error_code: 404, msg: 'Job type not found.' });
                data['jobTypeID'] = parseInt(job_type_id, 10)
            }

            let total = 0;
    
            if (service_charge) {
                let svc = parseFloat(service_charge);
                total += svc;
                data["serviceCharge"] = svc.toFixed(2)
                console.log("svc", "curr", total, "svc_charge", svc)
            } else if(estimate.serviceCharge) {
                total += parseFloat(estimate.serviceCharge.toString())
                console.log("svc", "curr", total, "svc_charge", estimate.serviceCharge)
            }
            if (total < 0) return res.status(400).json({ error_code: 400, msg: 'Service Charge cannot be a negative value' });

            if ((discount_type && !discount) || (discount && !discount_type)) return res.status(400).json({ error_code: 400, msg: 'Please provide both discount and discount_type.' });
            if (discount_type && !isValidDiscountType(discount_type)) return res.status(400).json({ error_code: 400, msg: 'Invalid discount_type.' });
            if (discount_type == "PERCENTAGE" && (parseFloat(discount) < 0 || parseFloat(discount) > 100)) return res.status(400).json({ error_code: 400, msg: 'Invalid discount value. Discount value must be between 0 and 100.' });

            if (vat && total > 0) {
                const vatFloat = parseFloat(vat);
                const vatAmount = total * (vatFloat / 100);
                total += vatAmount;
                data["vat"] = vatFloat;
                console.log("vat", "curr", total, "vat", vatFloat, "val", vatAmount)
            } else if (estimate.vat && total > 0) {
                const vatFloat = parseFloat(estimate.vat.toString());
                const vatAmount = total * (vatFloat / 100);
                total += vatAmount;
                console.log("vat", "curr", total, "vat", vatFloat, "val", vatAmount)
            }

            if (!isValidString(materials)) return res.status(400).json({ error_code: 400, msg: 'Incorrect format for materials. Please use the format id:qty,id:qty.' });

            const updateJobMaterials = convertStringToObjectArray(materials);
            
            const jobMaterialFindAll = await db.jobMaterial.findMany({
                where: {id: {in: updateJobMaterials.map(material => material.id)}}
            })
            if (jobMaterialFindAll.length != updateJobMaterials.length) return res.status(404).json({ error_code: 404, msg: 'Material not found.' });

            let subTotal = 0
            for (const jobMaterial of updateJobMaterials) {
                const jobMaterialFind = jobMaterialFindAll.find((material) => material.id === jobMaterial.id);
                if (!jobMaterialFind) {
                    return res.status(404).json({ error_code: 404, msg: 'Material not found.' });
                }

                const jobMaterialEstimate = await db.estimateJobMaterial.findFirst({
                    where: { AND: { jobMaterialID: jobMaterial.id, estimateID: parseInt(id, 10) } },
                });
                let price = jobMaterialFind.productCost;
                if (jobMaterialEstimate) {
                    await db.estimateJobMaterial.update({
                        where: { id: jobMaterialEstimate.id },
                        data: { quantity: jobMaterial.qty, price },
                    });
                } else {
                    await db.estimateJobMaterial.create({
                        data: {
                            estimateID: parseInt(id, 10),
                            jobMaterialID: jobMaterial.id,
                            quantity: jobMaterial.qty,
                            price,
                        },
                    });
                }
                const productCostNumber = parseFloat(jobMaterialFind.productCost.toString());
                subTotal += productCostNumber * jobMaterial.qty;
                console.log("adding", "curr", subTotal, jobMaterialFind.productName, "price", productCostNumber, "qty", jobMaterial.qty, "itemTotal",  productCostNumber * jobMaterial.qty )
            }

            await db.estimateJobMaterial.deleteMany({where: {estimateID: parseInt(id, 10), NOT: {jobMaterialID: {in: updateJobMaterials.map(material => material.id)}}}})
            
            if (discount) {
                if (discount_type == "AMOUNT") {
                    subTotal -= parseFloat(discount)
                    if (subTotal < 0) return res.status(400).json({ error_code: 400, msg: 'Discount amount is greater than service charge.' });
                }
                if (discount_type == "PERCENTAGE") {
                    if (subTotal == 0) return res.status(400).json({ error_code: 400, msg: 'Cannot apply a percentage discount when no service charge is applied.' });
                    subTotal -= subTotal * (parseFloat(discount)/100)
                }
                console.log("discount", "curr", subTotal, "disc", discount)
                data["discount"] = parseFloat(discount)
                data["discountType"] = discount_type
                total += subTotal
            } else if (estimate.discount) {
                if (estimate.discountType == "AMOUNT") {
                    subTotal -= parseFloat(estimate.discount.toString())
                    if (subTotal < 0) return res.status(400).json({ error_code: 400, msg: 'Discount amount is greater than service charge.' });
                }
                if (estimate.discountType == "PERCENTAGE") {
                    if (subTotal == 0) return res.status(400).json({ error_code: 400, msg: 'Cannot apply a percentage discount when no service charge is applied.' });
                    subTotal -= subTotal * (parseFloat(estimate.discount.toString())/100)
                }
                console.log("discount", "curr", subTotal, "disc", estimate.discount)
            }

            total += subTotal

            data["amount"] = total

            const updatedEstimate = await db.estimate.update({
                where: {id: parseInt(id, 10)},
                data
            })
            res.status(200).json({data: updatedEstimate, msg: "Estimate updated successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not update estimate.' });
        }
    }



    async deleteEstimate (req: Request, res: Response) {
        const { id } = req.params;
        const idArray = id.split(";").map(id => parseInt(id, 10));
        try {
            if (idArray.length > 1) {
                const estimates = await db.estimate.findMany({where: {id: {in: idArray}}})

                if (estimates.length !== idArray.length) return res.status(404).json({ error_code: 404, msg: 'Some estimates not found.' });
                await db.estimate.deleteMany({where: {id: {in: idArray}}})
                res.status(200).json({msg: "Estimates deleted successfully."});
            } else {
                const estimate = await db.estimate.findUnique({where: {id: idArray[0]}})

                if (!estimate) return res.status(404).json({ error_code: 404, msg: 'Estimate not found.' });
                await db.estimate.delete({where: {id: idArray[0]}})
                res.status(200).json({msg: "Estimate deleted successfully."});
            }
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not delete estimate(s).' });
        }
    } 
}

const estimateController = new EstimateController();
export default estimateController;
