import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking DB records...");
  
  const usersCount = await prisma.user.count();
  console.log("Users count:", usersCount);
  
  const users = await prisma.user.findMany();
  console.log("Users:", users.map(u => ({ id: u.id, name: u.name, email: u.email })));
  
  const ordersCount = await prisma.order.count();
  console.log("Orders count:", ordersCount);
  
  const templatesCount = await prisma.template.count();
  console.log("Templates count:", templatesCount);
  
  const automationsCount = await prisma.automation.count();
  console.log("Automations count:", automationsCount);
  
  const settingsCount = await prisma.settings.count();
  console.log("Settings count:", settingsCount);
}

main()
  .catch((e) => {
    console.error("Error checking DB:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
