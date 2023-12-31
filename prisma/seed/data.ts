// import {Role, User, CustomerType} from "@prisma/client";
import { envs } from "../../src/utils/general"

const password = envs.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
const encodedpassword = Buffer.from(password as string, 'utf8').toString("base64")



export const user = {
    id: 1,
    email: 'admin@monlautos.com',
    password: encodedpassword,
    roleID: 1
}

export const roles = [
    {
        id: 1,
        name: 'admin'
    },
    {
        id: 2,
        name: "user"
    }
]

export const jobTypes = [
    {
        id: 1,
        name: "Routine Servicing"
    },
    {
        id: 2,
        name: "General Repair"
    },
    {
        id: 3,
        name: "Refurbishment"
    },
    {
        id: 4,
        name: "AC Repair"
    }
]



export const customerTypes = [
    {
        id: 1,
        name: 'Corporate'
    },
    {
        id: 2,
        name: "Individual"
    }
]

export const vehicleTypes = [
    {
        id: 1,
        name: 'Saloon Car'
    },
    {
        id: 2,
        name: "SUV"
    },
    {
        id: 3,
        name: "Truck"
    },    {
        id: 4,
        name: "Bus"
    },
]
