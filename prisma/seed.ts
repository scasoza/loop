import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const projectCount = await prisma.project.count();

  if (projectCount === 0) {
    await prisma.project.create({
      data: {
        name: "Loop starter",
        description: "Seeded project to mirror production schema locally."
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
