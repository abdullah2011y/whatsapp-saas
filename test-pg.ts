import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();
const dbUrl = process.env.DATABASE_URL;
console.log("Loaded DATABASE_URL:", dbUrl);

async function test() {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl }
    }
  });
  try {
    const res = await prisma.$queryRaw`SELECT NOW()`;
    console.log("SUCCESS: Connected via PrismaClient!", res);
  } catch (err: any) {
    console.error("FAILED to connect via PrismaClient:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
