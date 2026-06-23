import "./load-env";
import { createPrismaClient } from "./create-prisma-client";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
export { prisma as db };
export { createPrismaClient } from "./create-prisma-client";
export { parseMysqlUrl, resolveDatabaseProvider } from "./database-url";
export type { DatabaseProvider } from "./database-url";
