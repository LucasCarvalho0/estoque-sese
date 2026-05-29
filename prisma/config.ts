import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";


export const prismaConfig = {
  adapter: new PrismaPg(process.env.DATABASE_URL!),
};

export type PrismaConfig = typeof prismaConfig;

export const prisma = new PrismaClient(prismaConfig);
