import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function initPrisma(): Promise<void> {
  try {
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log("Connected to PostgreSQL via Prisma");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to connect to PostgreSQL", error);
    process.exit(1);
  }
}

