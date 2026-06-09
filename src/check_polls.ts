import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Listing WhatsappPoll records:");
  const polls = await prisma.whatsappPoll.findMany();
  console.log(JSON.stringify(polls, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
