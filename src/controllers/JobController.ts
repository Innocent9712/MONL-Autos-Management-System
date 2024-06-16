import { JobStatus, Prisma } from "@prisma/client";
import { db } from "../../src/utils/prismaClient";
import { Request, Response } from "express";
import { isValidDate } from "../utils/general";


function isValidJobStatus(status: string) {
    return Object.values(JobStatus).includes(status as JobStatus);
}


class Job  {
    async getJobTypes (req: Request, res: Response) {
        try {
            const jobTypes = await db.jobType.findMany({
                orderBy: {
                    id: 'asc'
                }
            });
            res.status(200).json({data: jobTypes});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not get job types.' });
        }
    }

    async createJob (req: Request, res: Response) {
        const {
            job_type_id,
            customer_id,
            vehicle_id,
            delivery_date,
            status,
            mileage
        } = req.body

        if (
            !job_type_id || 
            !customer_id ||
            !vehicle_id
        ) {
            return res.status(400).json({ error_code: 400, msg: 'Missing information.' });
        }



        if (delivery_date && !isValidDate(delivery_date)) return res.status(400).json({ error_code: 400, msg: 'Incorrect Date format for delivery_date. Please use the date format YYYY-MM-DD.' });

        if (status && !isValidJobStatus(status)) return res.status(400).json({ error_code: 400, msg: 'Invalid job status. Accepted values are: NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED' });
        try {
            const jobType = await db.jobType.findUnique({where: {id: parseInt(job_type_id, 10)}})
            const customer = await db.customer.findUnique({where: {id: parseInt(customer_id, 10)}})
            const vehicle = await db.vehicle.findUnique({where: {id: parseInt(vehicle_id, 10)}})

            if (!jobType) return res.status(404).json({ error_code: 404, msg: 'Job type not found.' });
            if (!customer) return res.status(404).json({ error_code: 404, msg: 'Customer not found.' });
            if (!vehicle) return res.status(404).json({ error_code: 404, msg: 'Vehicle not found.' });
            if (vehicle && vehicle.ownerID != customer.id) return res.status(400).json({ error_code: 400, msg: 'Vehicle does not belong to customer.' });

            // let data: {[key: string]: number | Date | string | null } = {
            const data: Prisma.JobUncheckedCreateInput = {
                jobTypeID: parseInt(job_type_id, 10),
                customerID: parseInt(customer_id, 10),
                vehicleID: parseInt(vehicle_id, 10),
            }

            if (delivery_date) data["deliveryDate"] = (new Date(delivery_date)).toISOString()


            // let data: Prisma.JobCreateInput = {}

            if (status) data["status"] = status
            if (mileage) {
                const latestMilage = await db.mileage.findFirst({
                    where: {
                        vehicleID: parseInt(vehicle_id, 10)
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                })
        
                if (latestMilage && latestMilage.mileage > parseInt(mileage, 10)) {
                    return res.status(400).json({ error_code: 400, msg: 'Cannot decrease mileage.' });
                }

                await db.mileage.create({
                    data: {
                        mileage: parseInt(mileage, 10),
                        vehicleID: vehicle.id
                    }
                })
            }

            const job = await db.job.create({
                data
            })

            

            res.status(201).json({data: job, msg: "Job created successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not create job.' });
        }
    }

    async getJobs (req: Request, res: Response) {
        const customerID = req.query.customerID ? req.query.customerID as string : (req.params.customerID ? req.params.customerID as string : null);
        const page = Number(req.query.page) || undefined;
        const limit = Number(req.query.limit) || undefined;
        const filterValue = req.query?.filter as string || null;
        const status = req.query?.status as string || null;
        const startDatetime = req.body?.start;
        const endDatetime = req.body?.end;

        const whereFilter: Prisma.JobWhereInput = {};
    
        if (customerID && isNaN(parseInt(customerID, 10))) {
            return res.status(400).json({ error_code: 400, msg: 'Invalid customer ID.' });
        }

        if ((startDatetime && !endDatetime) || (!startDatetime && endDatetime)) {
            return res.status(400).json({ error_code: 400, msg: 'start and end datetime must be provided' });
        }


        if ((startDatetime && !isValidDate(startDatetime)) || (endDatetime && !isValidDate(endDatetime))) {
            return res.status(400).json({ error_code: 400, msg: 'Invalid start or end datetime format.' });
        }

        if (filterValue) {
            const jobTypeID = await db.jobType.findFirst({
                where: {
                    name: { contains: filterValue }
                },
                select: {
                    id: true
                }
            })
            
            if (customerID) {
                whereFilter.AND = [
                    {OR: [{
                        vehicleID: {
                            in: await db.vehicle.findMany({
                                where: {
                                    licensePlate: { contains: filterValue }
                                },
                                select: {
                                    id: true
                                },
                            }).then((vehicleIds) => vehicleIds.map((vehicle) => vehicle.id)),
                        },
                    }]},
                    {customerID: {equals: parseInt(customerID, 10)}},
                ];
                if (jobTypeID && whereFilter.AND[0].OR) {
                    whereFilter.AND[0].OR.push({jobTypeID: {equals: jobTypeID.id}});
                }
            } else {
                whereFilter.OR = [{
                    vehicleID: {
                        in: await db.vehicle.findMany({
                            where: {
                                licensePlate: { contains: filterValue }
                            },
                            select: {
                                id: true
                            },
                        }).then((vehicleIds) => vehicleIds.map((vehicle) => vehicle.id)),
                    },
                }]
                if (jobTypeID) {
                    whereFilter.OR.push({jobTypeID: {equals: jobTypeID.id}})
                }
            }
        }

        const countFilter = JSON.parse(JSON.stringify(whereFilter));

        if (status && Object.values(JobStatus).some(statusE => status?.toLowerCase().includes(statusE.toLowerCase()))) {
            whereFilter.status = { in: Object.values(JobStatus).filter(statusE => status?.toLowerCase().includes(statusE.toLowerCase())).map(status => status as JobStatus) }
        }

        
        let filterOptions: Prisma.JobWhereInput = customerID ? { AND: [{ customerID: parseInt(customerID, 10) }, whereFilter] } : whereFilter;
        let countFilterOptions: Prisma.JobWhereInput = customerID ? { AND: [{ customerID: parseInt(customerID, 10) }, countFilter] } : countFilter;

        try {
            let jobs;
            let counts = {};
        
            if (page !== undefined && limit !== undefined) {
            // Pagination is requested

            if (
                true
                // !filterOptions.OR?.some(option => 'status' in option) ||
                // (Array.isArray(filterOptions.AND) && filterOptions.AND.length > 0 && !filterOptions.AND[0].OR?.some(option => 'status' in option))
            ) {
                const statusCounts = await db.job.groupBy({
                    by: ['status'],
                    where: countFilterOptions,
                    _count: true,
                });

                const statusCountsMap = Object.values(JobStatus).reduce((acc, status) => {
                    acc[status] = statusCounts.find(statusCount => statusCount.status === status)?._count ?? 0;
                    return acc;
                }, {} as { [status in JobStatus]: number });

                const totalStatusCounts = Object.values(JobStatus).reduce((acc, status) => acc + (statusCountsMap[status] ?? 0), 0);
                counts = {...statusCountsMap, TOTAL: totalStatusCounts}
            }
        
            // Retrieve jobs with pagination
            jobs = await db.job.findMany({
                where: whereFilter,
                select: {
                id: true,
                jobTypeID: true,
                status: true,
                jobType: {
                    select: {
                    name: true,
                    },
                },
                customerID: true,
                customer: {
                    select: {
                    firstName: true,
                    lastName: true,
                    },
                },
                vehicleID: true,
                vehicle: {
                    select: {
                    modelNo: true,
                    modelName: true,
                    licensePlate: true,
                    chasisNo: true,
                    },
                },
                deliveryDate: true,
                createdAt: true,
                updatedAt: true,
                },
                orderBy: {
                id: 'asc',
                },
                skip: (page - 1) * limit, // Calculate the offset
                take: limit, // Limit the number of items per page
            });
        
            // Check if the number of items returned is less than the specified limit
            const isLastPage = jobs.length < limit;
        
            res.status(200).json({ data: jobs, counts, isLastPage });
            } else {
            // No pagination
            let counts = {};
            if (startDatetime && endDatetime) {
                filterOptions = {
                    ...filterOptions,
                  createdAt: {
                    gte: new Date(startDatetime),
                    lte: new Date(endDatetime),
                  },
                };
            }

            if (
                true
                // !filterOptions.OR?.some(option => 'status' in option) ||
                // (Array.isArray(filterOptions.AND) && filterOptions.AND.length > 0 && !filterOptions.AND[0].OR?.some(option => 'status' in option))
            ) {
                const statusCounts = await db.job.groupBy({
                    by: ['status'],
                    where: countFilterOptions,
                    _count: true,
                });

                const statusCountsMap = Object.values(JobStatus).reduce((acc, status) => {
                    acc[status] = statusCounts.find(statusCount => statusCount.status === status)?._count ?? 0;
                    return acc;
                }, {} as { [status in JobStatus]: number });

                const totalStatusCounts = Object.values(JobStatus).reduce((acc, status) => acc + (statusCountsMap[status] ?? 0), 0);

                counts = {...statusCountsMap, TOTAL: totalStatusCounts}
            }

            jobs = await db.job.findMany({
                where: filterOptions,
                select: {
                id: true,
                jobTypeID: true,
                status: true,
                jobType: {
                    select: {
                    name: true,
                    },
                },
                customerID: true,
                customer: {
                    select: {
                    firstName: true,
                    lastName: true,
                    },
                },
                vehicleID: true,
                vehicle: {
                    select: {
                    modelNo: true,
                    modelName: true,
                    licensePlate: true,
                    chasisNo: true,
                    },
                },
                deliveryDate: true,
                createdAt: true,
                updatedAt: true,
                },
                orderBy: {
                id: 'asc',
                },
            });
            res.status(200).json({ data: jobs, counts, msg: "Jobs Fetched Successfully!" });
            }
        } catch (error) {
            console.log(error)
            res.status(400).json({ error_code: 400, msg: 'Could not get jobs.' });
        }
    }
          

    async getJob (req: Request, res: Response) {
        const { id } = req.params;
        try {
            const job = await db.job.findUnique({
                where: { id: parseInt(id, 10) },
                select: {
                    id: true,
                    jobTypeID: true,
                    status: true,
                    jobType: {
                        select: {
                            name: true
                        }
                    },
                    customerID: true,
                    customer: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    },
                    vehicleID: true,
                    vehicle: {
                        select: {
                            modelNo: true,
                            modelName: true,
                            licensePlate: true,
                            chasisNo: true,
                        }
                    },
                    deliveryDate: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            if (!job) {
                return res.status(404).json({ error_code: 404, msg: 'Job not found.' });
            }
            res.status(200).json({data: job});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not get job.' });
        }
    }

    async updateJob (req: Request, res: Response) {
        // async updateJob (req: Request, res: Response) {
        const { id } = req.params;
        const {delivery_date, status, mileage} = req.body;

        const job = await db.job.findUnique({where: {id: parseInt(id, 10)}})
        if (!job) {
            return res.status(404).json({ error_code: 404, msg: 'Job not found.' });
        }


        if (!isValidDate(delivery_date)) return res.status(400).json({ error_code: 400, msg: 'Invalid date. Please set date in the format YYYY-MM-DD' });
        if (status && !isValidJobStatus(status)) return res.status(400).json({ error_code: 400, msg: 'Invalid job status. Accepted values are: NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED' });

        try {
            const data: Prisma.JobUpdateInput = {} as Prisma.JobUpdateInput

            if (delivery_date) data["deliveryDate"] = (new Date(delivery_date)).toISOString()
            if (status) data["status"] = status
            const job = await db.job.update({
                where: {
                    id: parseInt(id, 10)
                },
                data
            })

            if (mileage) {
                await db.mileage.create({
                    data: {
                        mileage: parseInt(mileage, 10),
                        vehicleID: job.vehicleID
                    }
                })
            }

            res.status(200).json({data: job, msg: "Job updated successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not update job.' });
        }
    }


    async deleteJob (req: Request, res: Response) {
        const {id} = req.params

        try {
            let job = await db.job.findUnique({
                where: {id: parseInt(id, 10)},
            })

            if (!job) return res.status(400).json({ error_code: 400, msg: "Job not found."})

            const deletedJob = await db.job.delete({ where : {id: parseInt(id, 10)}})
            
            res.status(200).json({data: deletedJob, msg: "Job deleted successfully."});

        } catch (error) {
            res.status(500).json({error_code: 500, msg: "Internal server error."})
        }
    }

}


class JobMaterial {
    async createMaterial (req: Request, res: Response) {
        const {name, cost} = req.body;
    
        if (!name || !cost) return res.status(400).json({ error_code: 400, msg: 'Missing information.' });
    
        try {
            const jobMaterial = await db.jobMaterial.create({
                data: {
                    productName: name,
                    productCost: parseFloat(cost)
                }
            })
            res.status(201).json({data: jobMaterial, msg: "Job material created successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not create job material.' });
        }
    }

    async getMaterials(req: Request, res: Response) {
        const name = req.query?.name?.toString() ?? "";
        const page = parseInt(req.query?.page?.toString() ?? "1");
        const limit = parseInt(req.query?.limit?.toString() ?? "100");
    
        try {
            let materials;
            let totalCount = 0;
    
            if (!req.query.page && !req.query.limit) {
                // Fetch all materials without pagination
                materials = await db.jobMaterial.findMany({
                    where: {
                        productName: {
                            contains: name,
                            // mode: "insensitive", // only use in psql
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                });
    
                totalCount = materials.length;
            } else {
                // Retrieve materials matching the query with pagination
                materials = await db.jobMaterial.findMany({
                    where: {
                        productName: {
                            contains: name,
                            // mode: "insensitive",
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    skip: (page - 1) * limit, // Calculate the offset
                    take: limit, // Limit the number of items per page
                });
    
                totalCount = await db.jobMaterial.count({
                    where: {
                        productName: {
                            contains: name,
                            // mode: "insensitive",
                        },
                    },
                });
            }
    
            const isLastPage = materials.length < limit;
    
            res.status(200).json({ data: materials, totalCount, isLastPage });
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not get job materials.' });
        }
    }
    
          
      

    async getMaterial (req: Request, res: Response) {
        const { id } = req.params;
        try {
            const jobMaterial = await db.jobMaterial.findUnique({ where: { id: parseInt(id, 10) } });
            if (!jobMaterial) {
                return res.status(404).json({ error_code: 404, msg: 'Job material not found.' });
            }
            res.status(200).json({data: jobMaterial});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not get job material.' });
        }
    }

    async updateMaterial (req: Request, res: Response) {
        const { id } = req.params;
        const {name, cost} = req.body;

        const jobMaterial = await db.jobMaterial.findUnique({where: {id: parseInt(id, 10)}})
        if (!jobMaterial) return res.status(404).json({ error_code: 404, msg: 'Job material not found.' });

        const data: Prisma.JobMaterialUncheckedUpdateInput = {} as Prisma.JobMaterialUncheckedUpdateInput;
        if (name) data.productName = name;
        if (cost) data.productCost = parseFloat(cost);
        
        try {
            const jobMaterial = await db.jobMaterial.update({
                where: {
                    id: parseInt(id, 10)
                },
                data
            })

            res.status(200).json({data: jobMaterial, msg: "Job material updated successfully."});
        } catch (error) {
            res.status(400).json({ error_code: 400, msg: 'Could not update job material.' });
        }
    }

    async deleteMaterial (req: Request, res: Response) {
        const {id} = req.params

        const jobMaterial = await db.jobMaterial.findUnique({where: {id: parseInt(id, 10)}})
        if (!jobMaterial) return res.status(404).json({ error_code: 404, msg: 'Job material not found.' });

        try {
            const deletedJobMaterial = await db.jobMaterial.delete({ where : {id: parseInt(id, 10)}})
            
            res.status(200).json({data: deletedJobMaterial, msg: "Job material deleted successfully."});

        } catch (error) {
            res.status(500).json({error_code: 500, msg: "Internal server error."})
        }
    }

}

class JobController {
    job: Job
    jobMaterial: JobMaterial
    constructor() {
        this.job = new Job()
        this.jobMaterial = new JobMaterial()
    }
}


const jobController = new JobController();
export default jobController;
