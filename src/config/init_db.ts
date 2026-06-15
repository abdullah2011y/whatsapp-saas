import { exec } from "child_process";
import { runDataMigration } from "../migrate_users_startup";
import { initializeAllSessions } from "../modules/whatsapp/baileys.manager";
import prisma from "./database";
import bcrypt from "bcryptjs";
import { logAction } from "../shared/services/audit.service";
import { runSubscriptionMonitorCheck } from "../modules/admin/subscription-monitor.service";

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || "abdullahglid@gmail.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "abdullah@2011y";
  console.log(`[Startup] Seeding Super Admin check for: ${email}`);

  try {
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    console.log(`[Startup] Whether the Super Admin record already existed before seeding: ${!!existing}`);

    const hashedPassword = await bcrypt.hash(password, 10);

    if (!existing) {
      const superAdmin = await prisma.user.create({
        data: {
          name: "Super Admin",
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          role: "SUPERADMIN",
          status: "ACTIVE",
          plan: "Lifetime"
        }
      });
      console.log(`[Startup] Super Admin account created successfully with ID: ${superAdmin.id}`);
      await logAction(superAdmin.id, "SEED_SUPER_ADMIN", superAdmin.id, `Super Admin account initialized with email: ${email}`);
    } else {
      // If the Super Admin already exists, update its password hash to match: Password: abdullah@2011y
      await prisma.user.update({
        where: { id: existing.id },
        data: { 
          password: hashedPassword,
          role: "SUPERADMIN", 
          plan: "Lifetime" 
        }
      });
      console.log(`[Startup] Existing user role and password hash updated to SUPERADMIN for ${email}`);
      await logAction(existing.id, "UPDATE_TO_SUPER_ADMIN", existing.id, `Existing user role and password updated for ${email}`);
    }
  } catch (error) {
    console.error("[Startup] Error seeding Super Admin:", error);
  }
}

async function seedPlans() {
  console.log("[Startup] Seeding SaaS plans...");
  const plans = [
    {
      name: "Free",
      priceMonthly: 0,
      priceYearly: 0,
      durationDays: 30,
      maxOrders: 100,
      maxMessages: 100,
      maxTemplates: 10,
      maxAutomations: 5,
      maxSessions: 1,
      features: JSON.stringify(["BASIC_ANALYTICS"])
    },
    {
      name: "Starter",
      priceMonthly: 19,
      priceYearly: 190,
      durationDays: 30,
      maxOrders: 500,
      maxMessages: 500,
      maxTemplates: 20,
      maxAutomations: 10,
      maxSessions: 2,
      features: JSON.stringify(["BASIC_ANALYTICS", "SUPPORT"])
    },
    {
      name: "Growth",
      priceMonthly: 49,
      priceYearly: 490,
      durationDays: 30,
      maxOrders: 2000,
      maxMessages: 5000,
      maxTemplates: 50,
      maxAutomations: 20,
      maxSessions: 3,
      features: JSON.stringify(["ADVANCED_ANALYTICS", "SUPPORT", "SHOPIFY_SYNC"])
    },
    {
      name: "Business",
      priceMonthly: 99,
      priceYearly: 990,
      durationDays: 30,
      maxOrders: 10000,
      maxMessages: 20000,
      maxTemplates: 100,
      maxAutomations: 50,
      maxSessions: 5,
      features: JSON.stringify(["ADVANCED_ANALYTICS", "PRIORITY_SUPPORT", "SHOPIFY_SYNC", "API_ACCESS"])
    },
    {
      name: "Enterprise",
      priceMonthly: 299,
      priceYearly: 2990,
      durationDays: 30,
      maxOrders: 999999,
      maxMessages: 999999,
      maxTemplates: 999,
      maxAutomations: 999,
      maxSessions: 999,
      features: JSON.stringify(["ADVANCED_ANALYTICS", "DEDICATED_SUPPORT", "SHOPIFY_SYNC", "API_ACCESS", "WHITELABEL"])
    },
    {
      name: "Lifetime",
      priceMonthly: 999,
      priceYearly: 9999,
      durationDays: 99999,
      maxOrders: 999999,
      maxMessages: 999999,
      maxTemplates: 999,
      maxAutomations: 999,
      maxSessions: 999,
      features: JSON.stringify(["ADVANCED_ANALYTICS", "DEDICATED_SUPPORT", "SHOPIFY_SYNC", "API_ACCESS", "WHITELABEL", "LIFETIME"])
    }
  ];

  try {
    for (const plan of plans) {
      await prisma.saaSPlan.upsert({
        where: { name: plan.name },
        update: {
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          durationDays: plan.durationDays,
          maxOrders: plan.maxOrders,
          maxMessages: plan.maxMessages,
          maxTemplates: plan.maxTemplates,
          maxAutomations: plan.maxAutomations,
          maxSessions: plan.maxSessions,
          features: plan.features
        },
        create: plan
      });
    }
    console.log("[Startup] SaaS plans seeded successfully.");
  } catch (err) {
    console.error("[Startup] Failed to seed SaaS plans:", err);
  }
}

async function runAutoArchivingCheck() {
  console.log("[Startup] Triggering subscription monitor check...");
  try {
    await runSubscriptionMonitorCheck();
  } catch (error) {
    console.error("[Startup] Error running subscription monitor check:", error);
  }
}

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

    // Run the super admin seed
    await seedSuperAdmin();

    // Seed SaaS plans
    await seedPlans();

    // Run the auto-archiving check
    await runAutoArchivingCheck();

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
