import { exec } from "child_process";
import { runDataMigration } from "../migrate_users_startup";
import { initializeAllSessions } from "../modules/whatsapp/baileys.manager";
import prisma from "./database";

export async function initializeDatabase() {
  console.log("[Startup] Running database migrations...");
  
  try {
    // Run prisma migrate deploy programmatically
    await new Promise<void>((resolve, reject) => {
      exec("npx prisma migrate deploy", (error, stdout, stderr) => {
        if (error) {
          console.error("[Migration] Prisma migration failed:", error);
          return reject(error);
        }
        console.log("[Migration] Prisma migration stdout:", stdout);
        if (stderr) {
          console.warn("[Migration] Prisma migration stderr:", stderr);
        }
        resolve();
      });
    });

    console.log("[Startup] Prisma migrations applied. Starting data migration...");
    
    // Run the user data recovery
    await runDataMigration();

    console.log("[Startup] Data migration finished. Restoring active Baileys sessions...");
    
    // Restore Baileys sessions
    await initializeAllSessions();
    
    // Startup Diagnostics
    console.log("[Startup Diagnostics] Starting diagnostics...");
    
    // 1. Verify schema columns
    const columns: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'WhatsappPoll';
    `);
    const colNames = columns.map(c => c.column_name);
    const requiredCols = ["id", "messageId", "orderId", "userId", "optionsJson", "messageSecret", "remoteJid", "provider", "phoneNumber", "createdAt"];
    const allRequiredExist = requiredCols.every(rc => colNames.includes(rc));
    if (allRequiredExist) {
      console.log("WhatsappPoll table schema verified");
    } else {
      console.error("[Startup Diagnostics] WhatsappPoll table schema verification FAILED. Missing columns. Found columns:", colNames);
    }

    // 2. Migration version
    const latestMigration: any[] = await prisma.$queryRawUnsafe(`
      SELECT migration_name FROM "_prisma_migrations" 
      WHERE finished_at IS NOT NULL 
      ORDER BY finished_at DESC LIMIT 1;
    `);
    const migrationVersion = latestMigration[0]?.migration_name || "Unknown";
    console.log(`Migration version: ${migrationVersion}`);

    // 3. Poll lookup successful
    try {
      await prisma.whatsappPoll.findFirst();
      console.log("Poll lookup successful");
    } catch (lookupErr: any) {
      console.error("[Startup Diagnostics] Poll lookup FAILED:", lookupErr.message || lookupErr);
    }

    console.log("[Startup] Database initialization completed successfully!");
  } catch (error) {
    console.error("[Startup] Database initialization encountered an error:", error);
  }
}
