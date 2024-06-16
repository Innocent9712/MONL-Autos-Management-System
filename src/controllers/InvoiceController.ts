import { db } from "../../src/utils/prismaClient";
import { Request, Response } from "express";
import { isValidDate } from "../utils/general";
import { DiscountType, InvoiceJobMaterial, Prisma } from "@prisma/client";

export function isValidDiscountType(type: string) {
    return Object.values(DiscountType).includes(type as DiscountType);
}

export function isValidString(inputString: string) {
    const pattern = /^((\d+:\d+(?:,|$))+)?$/;
    return pattern.test(inputString);
}

export function compareArrays<T extends { id: number, qty?: number, jobMaterialID?: number, quantity?: number }>(
    arrayA: { id: number, qty: number }[],
    arrayB: T[]
  ) {
    // console.log("arr A", arrayA)
    // Step 1: Identify objects in Array A that are missing in Array B
    const toBeAdded = arrayA.filter((itemA) => {
      return !arrayB.some((itemB) => itemB.jobMaterialID === itemA.id);
    });
  
    // Step 2: Find objects that are common in both Array A and Array B and to be modified
    const toBeModified = arrayA.filter((itemA) => {
      return arrayB.some((itemB) =>  itemB.jobMaterialID === itemA.id && itemA.qty !== itemB.quantity);
    });

    // Step 3: Find objects that are common in both Array A and Array B and to be modified
    const toBeUnchanged = arrayB.filter((itemB) => {
        return arrayA.some((itemA) =>
            itemB.jobMaterialID === itemA.id && itemB.quantity !== undefined && itemA.qty === itemB.quantity
        );
    });
  
    // Step 4: Identify objects in Array B that are missing in Array A
    const toBeRemoved = arrayB.filter((itemB) => {
      return !arrayA.some((itemA) => itemA.id === itemB.jobMaterialID);
    });
  
    return {
      toBeAdded,
      toBeModified,
      toBeUnchanged,
      toBeRemoved,
    };
}

  
export function convertStringToObjectArray(inputString: string) {
    if (!isValidString(inputString)) {
        throw new Error('Invalid input string format');
    }

    if (inputString.length === 0) return [];
    const objArray = inputString.split(',').map((item: string) => {
        const [id, qty] = item.split(':');
        return { id: parseInt(id), qty: parseInt(qty) };
    });

    return objArray;
}

class InvoiceController {
    private static invoiceNumberCount: number | null = null;

    constructor() {
        // Initialize the invoiceNumberCount when the class is first constructed
        this.initializeInvoiceNumberCount();
    }
    

      // Initialize the invoiceNumberCount
    private async initializeInvoiceNumberCount() {
        if (InvoiceController.invoiceNumberCount === null) {
        const lastInvoice = await db.invoice.findFirst({
            orderBy: { invoiceNo: 'desc' }, // Find the invoice with the highest invoiceNo
        });

        InvoiceController.invoiceNumberCount = lastInvoice ? lastInvoice.invoiceNo : 100000; // Default value if no invoices have been created yet
        }
    }

    async createInvoice (req: Request, res: Response) {
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
            detokenizedEmail,
            paid,
            draft_id
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

            InvoiceController.invoiceNumberCount! += 1;
        
            const data: Prisma.InvoiceUncheckedCreateInput = {
                customerID: parseInt(customer_id, 10),
                jobTypeID: parseInt(job_type_id, 10),
                vehicleID: parseInt(vehicle_id, 10),
                invoiceNo: InvoiceController.invoiceNumberCount!,
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

            if (paid) data['paid'] = paid

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

            const user = await db.user.findUnique({where: {email: detokenizedEmail}})
            if (user) data["createdByID"] = user.id

            if (job_id) {
                const job = await db.job.findUnique({where: {id: job_id}})
                if (job) data["jobID"] = job.id
            }

            const invoice = await db.invoice.create({
                data
            })

            if (invoice && jobMaterials) {
                for (const mat of jobMaterials) {
                    await db.invoiceJobMaterial.create({
                        data: {
                            invoiceID: invoice.id,
                            jobMaterialID: mat.id,
                            quantity: materialIDs?.find((item) => item.id == mat.id)?.qty,
                            price: mat.productCost
                        }
                    })
                }
            }

            if (draft_id) await db.invoiceDraft.delete({where: {id: parseInt(draft_id, 10)}})

            res.status(201).json({data: invoice, msg: "Invoice created successfully."});
        } catch (error) {
            console.error(error)
            res.status(400).json({ error_code: 400, msg: 'Could not create invoice.' });
        }
    }


    async getInvoices (req: Request, res: Response) {
        const filterValue = req.query?.filter as string || null;
        const paid = req.query?.paid as string || null;
        const page = Number(req.query.page) || undefined;
        const limit = Number(req.query.limit) || undefined;
        const whereFilter: Prisma.InvoiceWhereInput = {};

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

            // whereFilter.customerID = { in: customerIDArray };
            whereFilter.OR = [
                {customerID: {in: customerIDArray}},
                { jobTypeID: { equals: parseInt(filterValue) } },
            ]

        }

        if (paid !== null && (paid.toLowerCase() === 'true' || paid.toLowerCase() === 'false')) {
            whereFilter.paid = paid.toLowerCase()  === 'true'
        }

        try {
            if (page !== undefined && limit !== undefined) {
                let totalCount = await db.invoice.count({where: whereFilter});
                const invoices = await db.invoice.findMany({
                    where: whereFilter,
                    select: {
                        id: true,
                        invoiceNo: true,
                        paid: true,
                        description: true,
                        serviceCharge: true,
                        createdAt: true,
                        dueDate: true,
                        materials: true,
                        vat: true,
                        job: true,
                        discount: true,
                        amount: true,
                        discountType: true,
                        customerID: true,
                        createdBy: {
                        select: {
                            id: true,
                            email: true
                            }
                        },
                        updatedBy: {
                            select: {
                                id: true,
                                email: true
                                }
                        },
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

                const isLastPage = invoices.length < limit;
                res.status(200).json({data: invoices,totalCount, isLastPage,  msg: "Invoices retrieved successfully."});
            } else {
                const invoices = await db.invoice.findMany({
                    where: whereFilter,
                    select: {
                        id: true,
                        invoiceNo: true,
                        paid: true,
                        description: true,
                        createdAt: true,
                        dueDate: true,
                        materials: true,
                        vat: true,
                        job: true,
                        discount: true,
                        amount: true,
                        discountType: true,
                        customerID: true,
                        createdBy: {
                        select: {
                            id: true,
                            email: true
                            }
                        },
                        updatedBy: {
                            select: {
                                id: true,
                                email: true
                                }
                        },
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
                res.status(200).json({data: invoices, msg: "Invoices retrieved successfully."});
            }
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not retrieve invoices.' });
        }
    }

    async getInvoice (req: Request, res: Response) {
        const { id } = req.params;
        try {
            const invoice = await db.invoice.findUnique({ 
                where: { id: parseInt(id, 10) },
                select: {
                    id: true,
                    invoiceNo: true,
                    paid: true,
                    description: true,
                    createdAt: true,
                    dueDate: true,
                    serviceCharge: true,
                    vat: true,
                    discount: true,
                    job: true,
                    amount: true,
                    discountType: true,   
                    createdBy: {
                        select: {
                            id: true,
                            email: true
                        }
                    },
                    updatedBy: {
                        select: {
                            id: true,
                            email: true
                        }
                    },
                    customer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            billingAddress: true,
                            companyContact: true,
                            companyName: true,
                            customerType: {
                                select: {
                                    name: true,
                                }
                            }
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
            if (!invoice) {
                return res.status(404).json({ error_code: 404, msg: 'Invoice not found.' });
            }
            res.status(200).json({data: invoice, msg: "Invoice retrieved successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not retrieve invoice.' });
        }
    }

    async updateInvoice (req: Request, res: Response) {
        const { id } = req.params;
        const {
            description,
            due_date,
            paid,
            job_type_id,
            service_charge,
            discount,
            discount_type,
            materials,
            vat,
            job_id,
            detokenizedEmail
        } = req.body
        
        try {
            const invoice = await db.invoice.findUnique({where: {id: parseInt(id, 10)}})

            if (!invoice) return res.status(404).json({ error_code: 404, msg: 'Invoice not found.' });

            if (invoice.paid) res.status(400).json({error_code: 400, msg: "Invoice cannot be edited"})
            const data: Prisma.InvoiceUncheckedCreateInput = {} as Prisma.InvoiceUncheckedCreateInput
    
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
            } else if(invoice.serviceCharge) {
                total += parseFloat(invoice.serviceCharge.toString())
                console.log("svc", "curr", total, "svc_charge", invoice.serviceCharge)
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
            } else if (invoice.vat && total > 0) {
                const vatFloat = parseFloat(invoice.vat.toString());
                const vatAmount = total * (vatFloat / 100);
                total += vatAmount;
                console.log("vat", "curr", total, "vat", vatFloat, "val", vatAmount)
            }

            if (paid) data['paid'] = paid
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

                const jobMaterialInvoice = await db.invoiceJobMaterial.findFirst({
                    where: { AND: { jobMaterialID: jobMaterial.id, invoiceID: parseInt(id, 10) } },
                });
                let price = jobMaterialFind.productCost;
                if (jobMaterialInvoice) {
                    await db.invoiceJobMaterial.update({
                        where: { id: jobMaterialInvoice.id },
                        data: { quantity: jobMaterial.qty, price },
                    });
                } else {
                    await db.invoiceJobMaterial.create({
                        data: {
                            invoiceID: parseInt(id, 10),
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
            
            await db.invoiceJobMaterial.deleteMany({where: {invoiceID: parseInt(id, 10), NOT: {jobMaterialID: {in: updateJobMaterials.map(material => material.id)}}}})
            
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
            } else if (invoice.discount) {
                if (invoice.discountType == "AMOUNT") {
                    subTotal -= parseFloat(invoice.discount.toString())
                    if (subTotal < 0) return res.status(400).json({ error_code: 400, msg: 'Discount amount is greater than service charge.' });
                }
                if (invoice.discountType == "PERCENTAGE") {
                    if (subTotal == 0) return res.status(400).json({ error_code: 400, msg: 'Cannot apply a percentage discount when no service charge is applied.' });
                    subTotal -= subTotal * (parseFloat(invoice.discount.toString())/100)
                }
                console.log("discount", "curr", subTotal, "disc", invoice.discount)
            }

            total += subTotal

            data["amount"] = total

            const user = await db.user.findUnique({where: {email: detokenizedEmail}})
            if (user) data["updatedByID"] = user.id

            if (job_id) {
                const job = await db.job.findUnique({where: {id: job_id}})
                if (job) data["jobID"] = job.id
            }
            const updatedInvoice = await db.invoice.update({
                where: {id: parseInt(id, 10)},
                data
            })
            res.status(200).json({data: updatedInvoice, msg: "Invoice updated successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not update invoice.' });
        }
    }



    async deleteInvoice (req: Request, res: Response) {
        const { id } = req.params;
        const idArray = id.split(";").map(id => parseInt(id, 10));
        try {
            if (idArray.length > 1) {
                const invoices = await db.invoice.findMany({where: {id: {in: idArray}}})

                if (invoices.length !== idArray.length) return res.status(404).json({ error_code: 404, msg: 'Some invoices not found.' });
                await db.invoice.deleteMany({where: {id: {in: idArray}}})
                res.status(200).json({msg: "Invoices deleted successfully."});
            } else {
                const invoice = await db.invoice.findUnique({where: {id: idArray[0]}})

                if (!invoice) return res.status(404).json({ error_code: 404, msg: 'Invoice not found.' });
                await db.invoice.delete({where: {id: idArray[0]}})
                res.status(200).json({msg: "Invoice deleted successfully."});
            }
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not delete invoice(s).' });
        }
    }

}

class InvoiceDraft {
    async createDraft(req: Request, res: Response) {
        const {
            job_type_id,
            description,
            job_id,
            due_date,
            customer_id,
            vehicle_id,
            materials,
            service_charge,
            vat,
            discount,
            discount_type,
        } = req.body

        if (due_date && !isValidDate(due_date)) return res.status(400).json({ error_code: 400, msg: 'Incorrect Date format for due_date. Please use the date format YYYY-MM-DD.' });

        try {
            const data: Prisma.InvoiceDraftUncheckedCreateInput = {} as Prisma.InvoiceDraftUncheckedCreateInput
            if (job_type_id) data.jobTypeID = parseInt(job_type_id, 10)
            if (description) data.description = description
            if (job_id) data.jobID = parseInt(job_id, 10)
            if (due_date) data.dueDate = (new Date(due_date)).toISOString()
            if (customer_id) data.customerID = parseInt(customer_id, 10)
            if (vehicle_id) data.vehicleID = parseInt(vehicle_id, 10)
            if (service_charge) data.serviceCharge = parseFloat(service_charge)
            if (vat) data.vat = parseFloat(vat)
            if (discount) data.discount = parseFloat(discount)
            if (discount_type) data.discountType = discount_type

            let materialIDs, jobMaterials = [];
            if (materials) {
                if (!isValidString(materials)) return res.status(400).json({ error_code: 400, msg: 'Incorrect format for materials. Please use the format id:qty,id:qty.' });
                materialIDs = convertStringToObjectArray(materials)

                for (const item of materialIDs) {
                    const { id, qty } = item
                    const jobMaterial = await db.jobMaterial.findUnique({where: {id}})
                    if (!jobMaterial) return res.status(404).json({ error_code: 404, msg: 'Material not found.' });
                    jobMaterials.push(jobMaterial)
                }
            }

            const invoiceDraft = await db.invoiceDraft.create({
                data
            })

            if (invoiceDraft && jobMaterials) {
                for (const mat of jobMaterials) {
                    await db.invoiceDraftJobMaterial.create({
                        data: {
                            draftID: invoiceDraft.id,
                            jobMaterialID: mat.id,
                            quantity: materialIDs?.find((item) => item.id == mat.id)?.qty,
                            price: mat.productCost
                        }
                    })
                }
            }

            res.status(201).json({data: invoiceDraft, msg: "Invoice Draft created successfully."});

        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not create invoice.' });
        }
    }

    async getDrafts (req: Request, res: Response) {
        try {
            const drafts = await db.invoiceDraft.findMany()
            res.status(200).json({data: drafts, msg: "Invoic drafts retrieved successfully."});

        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not retrieve invoice drafts.' });
        }
    }

    async getDraft (req: Request, res: Response) {
        const { id } = req.params;
        try {
            const draft = await db.invoiceDraft.findUnique({ 
                where: { id: parseInt(id, 10) },
                select: {
                    id: true,
                    description: true,
                    createdAt: true,
                    dueDate: true,
                    serviceCharge: true,
                    vat: true,
                    discount: true,
                    job: true,
                    discountType: true,   
                    customer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            billingAddress: true,
                            companyContact: true,
                            companyName: true,
                            customerType: {
                                select: {
                                    name: true,
                                }
                            }
                        }
                    },
                    vehicle: {
                        select: {
                            modelNo: true,
                            modelName: true,
                            licensePlate: true,
                            chasisNo: true,
                            mileage:true
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
            if (!draft) {
                return res.status(404).json({ error_code: 404, msg: 'Draft not found.' });
            }
            res.status(200).json({data: draft, msg: "Draft retrieved successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not retrieve draft.' });
        }   
    }

    async updateInvoice (req: Request, res: Response) {
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
            job_id,
        } = req.body
        
        try {
            const draft = await db.invoiceDraft.findUnique({where: {id: parseInt(id, 10)}})

            if (!draft) return res.status(404).json({ error_code: 404, msg: 'Draft not found.' });

            // Without<Prisma.InvoiceDraftUpdateInput, Prisma.InvoiceDraftUncheckedUpdateInput> & Prisma.InvoiceDraftUncheckedUpdateInput
            const data: Prisma.InvoiceDraftUncheckedUpdateInput = {} as Prisma.InvoiceDraftUncheckedUpdateInput
    
            if (due_date && !isValidDate(due_date)) return res.status(400).json({ error_code: 400, msg: 'Incorrect Date format for due_date. Please use the date format YYYY-MM-DD.' });
            if (due_date) data['dueDate'] = (new Date(due_date)).toISOString()
            if (description) data['description'] = description
            if (job_type_id) {
                const jobType = await db.jobType.findUnique({where: {id: parseInt(job_type_id, 10)}})
                if (!jobType) return res.status(404).json({ error_code: 404, msg: 'Job type not found.' });
                data['jobTypeID'] = parseInt(job_type_id, 10)
            }
    
            if (service_charge) {
                data["serviceCharge"] = parseFloat(service_charge)
            }

            if ((discount_type && !discount) || (discount && !discount_type)) return res.status(400).json({ error_code: 400, msg: 'Please provide both discount and discount_type.' });
            if (discount_type && !isValidDiscountType(discount_type)) return res.status(400).json({ error_code: 400, msg: 'Invalid discount_type.' });
            if (discount_type == "PERCENTAGE" && (parseFloat(discount) < 0 || parseFloat(discount) > 100)) return res.status(400).json({ error_code: 400, msg: 'Invalid discount value. Discount value must be between 0 and 100.' });

            if (!isValidString(materials)) return res.status(400).json({ error_code: 400, msg: 'Incorrect format for materials. Please use the format id:qty,id:qty.' });

            const jobMaterials = await db.invoiceJobMaterial.findMany({where: {invoiceID: parseInt(id, 10)}});
            const updateJobMaterials = convertStringToObjectArray(materials);
            
            const {toBeAdded, toBeModified, toBeUnchanged, toBeRemoved} = compareArrays<InvoiceJobMaterial>(updateJobMaterials, jobMaterials);

            for (const jobMaterial of toBeAdded) {
                const jobMaterialFind = await db.jobMaterial.findUnique({where: {id: jobMaterial.id}})
                if (!jobMaterialFind) return res.status(404).json({ error_code: 404, msg: 'Material not found.' });
                await db.invoiceJobMaterial.create({
                    data: {
                        invoiceID: parseInt(id, 10),
                        jobMaterialID: jobMaterial.id,
                        quantity: jobMaterial.qty,
                        price: jobMaterialFind.productCost
                    }
                })      
            }

            for (const jobMaterial of toBeModified) {
                const jobMaterialGet = await db.invoiceJobMaterial.findFirst({where: {AND: {jobMaterialID: jobMaterial.id, invoiceID: parseInt(id, 10)}}})
                if (jobMaterialGet) {
                    await db.invoiceJobMaterial.update({
                        where: {id: jobMaterialGet.id},
                        data: {quantity: jobMaterial.qty}
                    })
                }
            }


            for (const jobMaterial of toBeRemoved) {
                await db.invoiceJobMaterial.delete({where: {id: jobMaterial.id}})
            }

            if (discount) {
                data["discount"] = parseFloat(discount)
                data["discountType"] = discount_type
            }

            if (vat) {
                data["vat"] = parseFloat(vat);
            }

            if (job_id) {
                const job = await db.job.findUnique({where: {id: job_id}})
                if (job) data["jobID"] = job.id
            }
            const updatedInvoiceDraft = await db.invoiceDraft.update({
                where: {id: parseInt(id, 10)},
                data
            })
            res.status(200).json({data: updatedInvoiceDraft, msg: "Invoice Draft updated successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not update draft.' });
        }
    }

    async deleteDraft (req: Request, res: Response) {
        try {
            const draft = await db.invoiceDraft.delete({
                where: {
                    id: parseInt(req.params.id, 10)
                }
            });
            if (!draft) {
                return res.status(404).json({ error_code: 404, msg: 'Draft not found.' });
            }
            res.status(200).json({data: draft, msg: "Draft deleted successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not delete draft.' });
        }
    }
}

const invoiceController = new InvoiceController();
export default invoiceController;
