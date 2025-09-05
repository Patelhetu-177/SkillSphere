const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function main() {
  try {
  console.log("worked perfectly")
  } catch (error) {
    console.error("Error seeding default categories", error);
  } finally {
    await db.$disconnect();
  }
}

main();
