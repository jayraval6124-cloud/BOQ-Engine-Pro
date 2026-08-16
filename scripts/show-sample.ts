import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const ra = await prisma.rateAnalysis.findFirst({
    where: { sorItem: { itemCode: "RJ086", sorYear: "2024-25" } },
    include: { sorItem: true, components: { orderBy: { sortOrder: "asc" } } },
    orderBy: { updatedAt: 'desc' }
  });

  if (ra) {
    console.log(`\n### Item: ${ra.sorItem?.itemCode}`);
    console.log(`**Description:** ${ra.sorItem?.description.substring(0, 150)}...`);
    console.log(`**Target Rate:** ${ra.totalRate} Rs / ${ra.unit}\n`);
    
    ra.components.forEach(c => {
      console.log(`- **[${c.type}]** ${c.description}: \`${c.quantity} ${c.unit}\` @ \`${c.rate} Rs\` = \`${c.amount} Rs\``);
    });
    
    const sum = ra.components.reduce((acc, c) => acc + Number(c.amount), 0);
    console.log(`\n**Total Calculated Amount:** \`${sum} Rs\`\n---`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
