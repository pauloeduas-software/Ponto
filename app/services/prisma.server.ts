import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const postgresUrl = process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@localhost:5432/ponto_db";

const pool = new pg.Pool({
  connectionString: postgresUrl,
  max: 20, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);

declare global {
  var __prisma: PrismaClient | undefined;
}

export let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({ adapter });
  }
  prisma = global.__prisma;
}
