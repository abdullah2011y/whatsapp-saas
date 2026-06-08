import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_USER_ID = "97e2acb1-0bee-4b31-be9e-3e31f8b4a916";

async function main() {
  console.log("Starting data migration...");

  // 1. Verify default user exists
  const defaultUser = await prisma.user.findUnique({
    where: { id: DEFAULT_USER_ID }
  });

  if (!defaultUser) {
    console.error(`Error: Default user with ID ${DEFAULT_USER_ID} does not exist in the database.`);
    return;
  }
  console.log(`Found default user: ${defaultUser.name} (${defaultUser.email})`);

  // 2. Migrate Orders
  const ordersResult = await prisma.order.updateMany({
    where: { userId: null },
    data: { userId: DEFAULT_USER_ID }
  });
  console.log(`Migrated orders count: ${ordersResult.count}`);

  // 3. Migrate Templates
  const templatesResult = await prisma.template.updateMany({
    where: { userId: null },
    data: { userId: DEFAULT_USER_ID }
  });
  console.log(`Migrated templates count: ${templatesResult.count}`);

  // 4. Migrate Automations
  const automationsResult = await prisma.automation.updateMany({
    where: { userId: null },
    data: { userId: DEFAULT_USER_ID }
  });
  console.log(`Migrated automations count: ${automationsResult.count}`);

  // 5. Initialize Settings for all users
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in database.`);

  for (const user of users) {
    const settings = await prisma.settings.findUnique({
      where: { userId: user.id }
    });

    if (!settings) {
      // Create default settings for user
      await prisma.settings.create({
        data: {
          userId: user.id,
          enabledProviders: "BOTH",
          defaultProvider: "ASK",
          metaConnected: false,
          confirmationMethod: "BUTTONS",
          pollConfirmLabel: "✅ Yes Confirmed",
          pollCancelLabel: "❌ No Cancelled",
          // Seed fallback Meta credentials from env if they are the default user
          metaPhoneNumberId: user.id === DEFAULT_USER_ID ? process.env.WHATSAPP_PHONE_NUMBER_ID : null,
          metaAccessToken: user.id === DEFAULT_USER_ID ? process.env.WHATSAPP_TOKEN : null,
          metaVerifyToken: user.id === DEFAULT_USER_ID ? "byteforge_verify" : null,
        }
      });
      console.log(`Created default settings for user: ${user.name} (${user.email})`);
    } else {
      console.log(`Settings already exist for user: ${user.name} (${user.email})`);
    }
  }

  console.log("Migration completed successfully.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
