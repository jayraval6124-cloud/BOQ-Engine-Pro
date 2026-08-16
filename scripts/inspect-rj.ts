import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.sORItem.findMany({
    where: {
      sorYear: "2024-25",
      itemCode: { startsWith: "RJ" },
      division: "Ahmedabad" // limit to one division so we don't get duplicates
    },
    orderBy: { itemCode: "asc" }
  });

  const rjItems = items.filter(item => {
    const num = parseInt(item.itemCode.replace("RJ", ""), 10);
    return !isNaN(num) && num >= 1 && num <= 303;
  }).slice(0, 30); // show first 30

  rjItems.forEach(i => console.log(`${i.itemCode}: ${i.description.substring(0, 150)} (Rate: ${i.rate} / ${i.unit})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
