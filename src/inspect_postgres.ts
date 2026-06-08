import { PrismaClient } from "@prisma/client";
import "dotenv/config";

async function inspectDb(url: string, dbName: string) {
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });

  try {
    console.log(`\n========================================`);
    console.log(`Inspecting Database: ${dbName}`);
    console.log(`========================================`);

    // Get list of tables in all schemas except system schemas
    const tables: any[] = await prisma.$queryRawUnsafe(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE';
    `);

    console.log(`Found ${tables.length} tables across all schemas.`);

    for (const t of tables) {
      const tableSchema = t.table_schema;
      const tableName = t.table_name;
      try {
        const countRes: any[] = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*)::text as count FROM "${tableSchema}"."${tableName}";
        `);
        const count = countRes[0]?.count || "0";
        console.log(`  - Table "${tableSchema}"."${tableName}": ${count} rows`);

        if (tableName.toLowerCase() === "user") {
          const sample: any[] = await prisma.$queryRawUnsafe(`
            SELECT id, name, email FROM "${tableSchema}"."${tableName}" LIMIT 5;
          `);
          console.log(`    Sample Users:`, sample);
        }
      } catch (err: any) {
        console.error(`  - Table "${tableSchema}"."${tableName}": Error: ${err.message}`);
      }
    }
  } catch (error: any) {
    console.error(`Error inspecting database ${dbName}:`, error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const defaultUrl = "postgresql://postgres:Agbs1222@localhost:5432/postgres?schema=public";
  const prismaDefault = new PrismaClient({
    datasources: {
      db: { url: defaultUrl }
    }
  });

  let databases: string[] = [];
  try {
    const dbs: any[] = await prismaDefault.$queryRawUnsafe(`
      SELECT datname FROM pg_database WHERE datistemplate = false;
    `);
    databases = dbs.map(d => d.datname);
    console.log("Found PostgreSQL Databases:", databases);
  } catch (error: any) {
    console.error("Failed to fetch databases from pg_database:", error.message);
    databases = ["whatsapp_saas"];
  } finally {
    await prismaDefault.$disconnect();
  }

  for (const dbName of databases) {
    const dbUrl = `postgresql://postgres:Agbs1222@localhost:5432/${dbName}?schema=public`;
    await inspectDb(dbUrl, dbName);
  }
}

main().catch(console.error);
