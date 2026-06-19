import { PrismaClient } from "@prisma/client";

const urls = [
  "postgresql://postgres@localhost:5432/whatsapp_saas?schema=public",
  "postgresql://abule@localhost:5432/whatsapp_saas?schema=public",
];

async function testUrl(url: string) {
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });
  try {
    // Attempt a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log(`SUCCESS: Connected with url: ${url}`);
    return true;
  } catch (err: any) {
    console.log(`FAILED: ${url}`);
    console.log(`Error message: ${err.message.split("\n")[0] || err.message}`);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  for (const url of urls) {
    const success = await testUrl(url);
    if (success) {
      console.log(`\nFound working connection string: ${url}`);
      break;
    }
  }
}

main().catch(console.error);
