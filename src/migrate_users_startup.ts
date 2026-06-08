import prisma from "./config/database";

const DEFAULT_USER_ID = "97e2acb1-0bee-4b31-be9e-3e31f8b4a916";
const DEFAULT_EMAIL = "abulekhp@gmail.com";

export async function runDataMigration() {
  console.log("[Data Migration] Starting data verification & recovery...");

  try {
    // 1. Verify default user exists or find the owner account
    let defaultUser = await prisma.user.findUnique({
      where: { id: DEFAULT_USER_ID }
    });

    if (!defaultUser) {
      console.log(`[Data Migration] User with ID ${DEFAULT_USER_ID} not found. Searching by email ${DEFAULT_EMAIL}...`);
      defaultUser = await prisma.user.findFirst({
        where: { email: DEFAULT_EMAIL }
      });
      
      if (!defaultUser) {
        console.log(`[Data Migration] User with email ${DEFAULT_EMAIL} not found. Fetching first user in DB...`);
        defaultUser = await prisma.user.findFirst();
      }
    }

    if (!defaultUser) {
      console.warn("[Data Migration] Warning: No user found in the database. Data migration skipped.");
      return;
    }

    const userId = defaultUser.id;
    console.log(`[Data Migration] Selected default owner account: ${defaultUser.name} (${defaultUser.email}) with ID: ${userId}`);

    // Verification counts before migration
    const totalOrders = await prisma.order.count();
    const unassignedOrders = await prisma.order.count({ where: { userId: null } });
    const assignedOrders = await prisma.order.count({ where: { userId } });

    const totalTemplates = await prisma.template.count();
    const unassignedTemplates = await prisma.template.count({ where: { userId: null } });

    const totalAutomations = await prisma.automation.count();
    const unassignedAutomations = await prisma.automation.count({ where: { userId: null } });

    console.log(`[Data Migration] [PRE-MIGRATION STATS]
    - Total Orders: ${totalOrders} (Unassigned: ${unassignedOrders}, Assigned to owner: ${assignedOrders})
    - Total Templates: ${totalTemplates} (Unassigned: ${unassignedTemplates})
    - Total Automations: ${totalAutomations} (Unassigned: ${unassignedAutomations})`);

    // Migrate Orders
    const ordersResult = await prisma.order.updateMany({
      where: { userId: null },
      data: { userId }
    });
    console.log(`[Data Migration] Migrated orders: ${ordersResult.count}`);

    // Migrate Templates
    const templatesResult = await prisma.template.updateMany({
      where: { userId: null },
      data: { userId }
    });
    console.log(`[Data Migration] Migrated templates: ${templatesResult.count}`);

    // Migrate Automations
    const automationsResult = await prisma.automation.updateMany({
      where: { userId: null },
      data: { userId }
    });
    console.log(`[Data Migration] Migrated automations: ${automationsResult.count}`);

    // Initialize Settings for all users
    const users = await prisma.user.findMany();
    console.log(`[Data Migration] Initializing settings for ${users.length} users...`);

    for (const user of users) {
      const settings = await prisma.settings.findUnique({
        where: { userId: user.id }
      });

      if (!settings) {
        await prisma.settings.create({
          data: {
            userId: user.id,
            enabledProviders: "BOTH",
            defaultProvider: "ASK",
            metaConnected: false,
            confirmationMethod: "BUTTONS",
            pollConfirmLabel: "✅ Yes Confirmed",
            pollCancelLabel: "❌ No Cancelled",
            metaPhoneNumberId: user.id === userId ? process.env.WHATSAPP_PHONE_NUMBER_ID : null,
            metaAccessToken: user.id === userId ? process.env.WHATSAPP_TOKEN : null,
            metaVerifyToken: user.id === userId ? "byteforge_verify" : null,
          }
        });
        console.log(`[Data Migration] Created default settings for user: ${user.name} (${user.email})`);
      } else {
        console.log(`[Data Migration] Settings already exist for user: ${user.name} (${user.email})`);
      }
    }

    // Verification counts after migration
    const postUnassignedOrders = await prisma.order.count({ where: { userId: null } });
    const postAssignedOrders = await prisma.order.count({ where: { userId } });
    console.log(`[Data Migration] [POST-MIGRATION STATS]
    - Total Orders: ${totalOrders} (Unassigned: ${postUnassignedOrders}, Assigned to owner: ${postAssignedOrders})`);

    console.log("[Data Migration] Data migration completed successfully.");
  } catch (error) {
    console.error("[Data Migration] Failed to run data migration:", error);
  }
}
