import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sorCount = await prisma.sORItem.count();
  const specCount = await prisma.itemSpecification.count();
  const sampleSor = await prisma.sORItem.findFirst({
    select: { itemCode: true, description: true, rate: true, division: true }
  });
  
  console.log("SOR Items:", sorCount);
  console.log("Item Specifications:", specCount);
  console.log("Sample SOR:", sampleSor);
}

main().catch(console.error).finally(() => prisma.$disconnect());
