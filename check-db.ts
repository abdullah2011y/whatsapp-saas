import prisma from "./src/config/database";

async function main() {
  console.log("--- Users ---");
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  });
  console.log(users);

  console.log("--- Settings ---");
  const settings = await prisma.settings.findMany({
    select: {
      id: true,
      userId: true,
      shopifyDomain: true,
      shopifyWebhookStatus: true,
      shopifyConnectionHealth: true,
    }
  });
  console.log(settings);

  console.log("--- Details for shop: jhztdj-gi.myshopify.com ---");
  const matchedSettings = await prisma.settings.findFirst({
    where: {
      shopifyDomain: {
        contains: "jhztdj-gi.myshopify.com",
        mode: "insensitive"
      }
    },
    include: {
      user: true
    }
  });
  console.log("Matched Settings:", JSON.stringify(matchedSettings, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
