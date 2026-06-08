import { exec } from "child_process";
import { runDataMigration } from "../migrate_users_startup";
import { initializeAllSessions } from "../modules/whatsapp/baileys.manager";

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
    
    console.log("[Startup] Database initialization completed successfully!");
  } catch (error) {
    console.error("[Startup] Database initialization encountered an error:", error);
  }
}
