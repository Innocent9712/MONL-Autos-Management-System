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
            vat,
            discount,
            discount_type,
            detokenizedEmail,
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
            const vehicle = await db.vehicle.findFirst({where: {ownerID: customer.id}})
            if (!vehicle) return res.status(404).json({ error_code: 404, msg: "Vehicle not found or vehichle doesn't belong to customer."})
            if ((discount_type && !discount) || (discount && !discount_type)) return res.status(400).json({ error_code: 400, msg: 'Please provide both discount and discount_type.' });
            if (discount_type && !isValidDiscountType(discount_type)) return res.status(400).json({ error_code: 400, msg: 'Invalid discount_type.' });
            if (discount_type == "PERCENTAGE" && (parseFloat(discount) < 0 || parseFloat(discount) > 100)) return res.status(400).json({ error_code: 400, msg: 'Invalid discount value. Discount value must be between 0 and 100.' });

            const data: Prisma.InvoiceUncheckedCreateInput = {
                customerID: parseInt(customer_id, 10),
                jobTypeID: parseInt(job_type_id, 10),
                vehicleID: parseInt(vehicle_id, 10),
                description,
                dueDate: due_date ? (new Date(due_date)).toISOString() : null
            }
            let total = 0;

            if (service_charge) {
                total += parseFloat(service_charge)
                data["serviceCharge"] = parseFloat(service_charge).toFixed(2)
            }

            let materialIDs, jobMaterials = [];
            if (materials) {
                if (!isValidString(materials)) return res.status(400).json({ error_code: 400, msg: 'Incorrect format for materials. Please use the format id:qty,id:qty.' });
                materialIDs = convertStringToObjectArray(materials)

                for (const item of materialIDs) {
                    const { id, qty } = item
                    const jobMaterial = await db.jobMaterial.findUnique({where: {id}})
                    if (!jobMaterial) return res.status(404).json({ error_code: 404, msg: 'Material not found.' });
                    jobMaterials.push(jobMaterial)
                    const productCostNumber = parseFloat(jobMaterial.productCost.toString());
                    total += productCostNumber * qty
                }
            }


            if (discount) {
                if (discount_type == "AMOUNT") total -= parseFloat(discount)
                if (discount_type == "PERCENTAGE") total -= total * (parseFloat(discount)/100)
                data["discount"] = parseFloat(discount)
                data["discountType"] = discount_type
            }

            if (vat) {
                data["vat"] = parseFloat(vat);
                total += total * (parseFloat(vat)/100)
            }

            data["amount"] = total
            // console.log(data)

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
        try {
            const invoices = await db.invoice.findMany({ select: {
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
                createdBy: true,
                updatedBy: true,
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone:true,
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
                invoiceNo: 'desc'
            }
        });
            res.status(200).json({data: invoices, msg: "Invoices retrieved successfully."});
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
                    createdBy: true,
                    updatedBy: true,
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

            if (invoice.paid == true) res.status(400).json({error_code: 400, msg: "Invoice cannot be edited"})
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
                total += parseFloat(service_charge)
                data["serviceCharge"] = parseFloat(service_charge)
                // console.log(total, `adding service charge: ${service_charge}`)
            } else if(invoice.serviceCharge) {
                // console.log(total, `adding service charge: ${invoice.serviceCharge}`)
                total += parseFloat(invoice.serviceCharge.toString())
            }

            if ((discount_type && !discount) || (discount && !discount_type)) return res.status(400).json({ error_code: 400, msg: 'Please provide both discount and discount_type.' });
            if (discount_type && !isValidDiscountType(discount_type)) return res.status(400).json({ error_code: 400, msg: 'Invalid discount_type.' });
            if (discount_type == "PERCENTAGE" && (parseFloat(discount) < 0 || parseFloat(discount) > 100)) return res.status(400).json({ error_code: 400, msg: 'Invalid discount value. Discount value must be between 0 and 100.' });

            if (paid) data['paid'] = paid
            if (!isValidString(materials)) return res.status(400).json({ error_code: 400, msg: 'Incorrect format for materials. Please use the format id:qty,id:qty.' });

            
            const jobMaterials = await db.invoiceJobMaterial.findMany({where: {invoiceID: parseInt(id, 10)}});
            const updateJobMaterials = convertStringToObjectArray(materials);
            
            const {toBeAdded, toBeModified, toBeUnchanged, toBeRemoved} = compareArrays<InvoiceJobMaterial>(updateJobMaterials, jobMaterials);

            // console.log("add", toBeAdded, "mod", toBeModified, "remove", toBeRemoved, "unchanged", toBeUnchanged)

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
                const productCostNumber = parseFloat(jobMaterialFind.productCost.toString());
                total += productCostNumber * jobMaterial.qty
                // console.log(total, `adding new material: ${jobMaterialFind.productName} ${jobMaterialFind.productCost}`)
            }

            for (const jobMaterial of toBeModified) {
                const jobMaterialGet = await db.invoiceJobMaterial.findFirst({where: {AND: {jobMaterialID: jobMaterial.id, invoiceID: parseInt(id, 10)}}})
                if (jobMaterialGet) {
                    await db.invoiceJobMaterial.update({
                        where: {id: jobMaterialGet.id},
                        data: {quantity: jobMaterial.qty}
                    })
                    total += parseFloat(jobMaterialGet.price.toString()) * jobMaterial.qty
                    // console.log(total, `modifying material: ${parseFloat(jobMaterialGet.price.toString()) * jobMaterial.qty}`)
                }
            }

            for (const jobMaterial of toBeUnchanged) {
                total += parseFloat(jobMaterial.price.toString()) * jobMaterial.quantity
                // console.log(total, `unchanged material: ${parseFloat(jobMaterial.price.toString()) * jobMaterial.quantity}`)
            }

            for (const jobMaterial of toBeRemoved) {
                await db.invoiceJobMaterial.delete({where: {id: jobMaterial.id}})
            }

            if (discount) {
                if (discount_type == "AMOUNT") total -= parseFloat(discount)
                if (discount_type == "PERCENTAGE") total -= total * (parseFloat(discount)/100)
                data["discount"] = parseFloat(discount)
                data["discountType"] = discount_type
                // console.log(total, `discount new ${discount}`)
            } else {
                if (invoice.discount) {
                    if (invoice.discountType == "AMOUNT") total -= parseFloat(invoice.discount.toString())
                    if (invoice.discountType == "PERCENTAGE") total -= total * (parseFloat(invoice.discount.toString())/100)
                // console.log(total, `discount old ${invoice.discount}`)
            }
            }

            if (vat) {
                data["vat"] = parseFloat(vat);
                // console.log(total, `vat new ${total * (parseFloat(vat)/100)}`)
                total += total * (parseFloat(vat)/100)
            } else if (invoice.vat) {
                // console.log(total, `vat old ${total * (parseFloat(invoice.vat.toString())/100)}`)
                total += total * (parseFloat(invoice.vat.toString())/100)
            }

            data["amount"] = total
            // console.log(total,"total")
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
        try {
            const invoice = await db.invoice.findUnique({where: {id: parseInt(id, 10)}})

            if (!invoice) return res.status(404).json({ error_code: 404, msg: 'Invoice not found.' });
            await db.invoice.delete({where: {id: parseInt(id, 10)}})
            res.status(200).json({msg: "Invoice deleted successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not delete invoice.' });
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

            const data: Prisma.InvoiceUncheckedCreateInput = {} as Prisma.InvoiceUncheckedCreateInput
    
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
