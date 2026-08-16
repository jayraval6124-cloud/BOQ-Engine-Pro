import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixNegativeAmounts() {
  console.log("Fixing negative amounts...");
  
  const badAmts = await prisma.rateAnalysisComponent.findMany({
    where: { amount: { lt: 0 } }
  });
  
  if (badAmts.length === 0) {
    console.log("No negative amounts found.");
    return;
  }
  
  console.log(`Found ${badAmts.length} components with negative amounts. Fixing...`);
  
  const affectedRaIds = [...new Set(badAmts.map(c => c.rateAnalysisId))];
  
  for (const raId of affectedRaIds) {
    // Get all components for this rate analysis
    const components = await prisma.rateAnalysisComponent.findMany({
      where: { rateAnalysisId: raId }
    });
    
    // Find the one that went negative
    const negComp = components.find(c => Number(c.amount) < 0);
    if (!negComp) continue;
    
    // Find the one with the largest amount
    let largestComp = components[0];
    for (const c of components) {
      if (Number(c.amount) > Number(largestComp.amount)) {
        largestComp = c;
      }
    }
    
    if (negComp.id === largestComp.id) {
      console.log(`Warning: Largest component is negative for RA ${raId}`);
      continue;
    }
    
    // Calculate what the negative component's amount should have been based on qty * rate
    let correctNegAmount = Number((Number(negComp.quantity) * Number(negComp.rate)).toFixed(2));
    
    // The amount of adjustment that was made is the difference between what it is now (negative) and what it should be
    const adjustment = Number(negComp.amount) - correctNegAmount;
    
    const newLargestAmount = Number(largestComp.amount) + adjustment;
    
    // Update both
    await prisma.rateAnalysisComponent.update({
      where: { id: negComp.id },
      data: { amount: correctNegAmount }
    });
    
    await prisma.rateAnalysisComponent.update({
      where: { id: largestComp.id },
      data: { amount: newLargestAmount }
    });
  }
  
  console.log("Done fixing negative amounts.");
}

fixNegativeAmounts().catch(console.error).finally(() => prisma.$disconnect());
