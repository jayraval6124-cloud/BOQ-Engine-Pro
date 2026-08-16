import { PrismaClient, RateComponentType } from "@prisma/client";

const prisma = new PrismaClient();

// Heuristic engine for CPWD/IS Norms based on description
function generateStandardComponents(description: string, targetRate: number) {
  const desc = description.toLowerCase();
  
  // We define standard components. Then we will scale their amounts so the total sum exactly matches targetRate.
  const components: { type: RateComponentType; desc: string; unit: string; qty: number; baseRate: number }[] = [];

  if (desc.includes("excavation") || desc.includes("earth work")) {
    components.push({ type: "LABOUR", desc: "Beldar", unit: "day", qty: 0.8, baseRate: 400 });
    components.push({ type: "LABOUR", desc: "Coolie", unit: "day", qty: 1.2, baseRate: 350 });
    components.push({ type: "MACHINERY", desc: "Excavator", unit: "hour", qty: 0.1, baseRate: 1500 });
  } else if (desc.includes("p.c.c") || desc.includes("pcc") || desc.includes("plain cement concrete")) {
    components.push({ type: "MATERIAL", desc: "Cement", unit: "kg", qty: 220, baseRate: 6 });
    components.push({ type: "MATERIAL", desc: "Coarse Sand", unit: "cum", qty: 0.45, baseRate: 1200 });
    components.push({ type: "MATERIAL", desc: "Aggregate 20mm", unit: "cum", qty: 0.9, baseRate: 1400 });
    components.push({ type: "LABOUR", desc: "Mason", unit: "day", qty: 0.2, baseRate: 600 });
    components.push({ type: "LABOUR", desc: "Beldar", unit: "day", qty: 1.5, baseRate: 400 });
    components.push({ type: "MACHINERY", desc: "Concrete Mixer", unit: "hour", qty: 0.2, baseRate: 800 });
  } else if ((desc.includes("r.c.c") || desc.includes("rcc") || desc.includes("reinforced cement concrete") || desc.includes("concrete")) && (desc.includes("m25") || desc.includes("m 25") || desc.includes("m-25") || desc.includes("m250") || desc.includes("m 250"))) {
    components.push({ type: "MATERIAL", desc: "Cement", unit: "kg", qty: 360, baseRate: 6 });
    components.push({ type: "MATERIAL", desc: "Coarse Sand", unit: "cum", qty: 0.42, baseRate: 1200 });
    components.push({ type: "MATERIAL", desc: "Aggregate 20mm", unit: "cum", qty: 0.84, baseRate: 1400 });
    components.push({ type: "LABOUR", desc: "Mason", unit: "day", qty: 0.3, baseRate: 600 });
    components.push({ type: "LABOUR", desc: "Beldar", unit: "day", qty: 2.0, baseRate: 400 });
    components.push({ type: "MACHINERY", desc: "Concrete Mixer", unit: "hour", qty: 0.3, baseRate: 800 });
    components.push({ type: "MACHINERY", desc: "Vibrator", unit: "hour", qty: 0.3, baseRate: 200 });
  } else if (desc.includes("r.c.c") || desc.includes("rcc") || desc.includes("reinforced cement concrete")) {
    components.push({ type: "MATERIAL", desc: "Cement", unit: "kg", qty: 320, baseRate: 6 });
    components.push({ type: "MATERIAL", desc: "Coarse Sand", unit: "cum", qty: 0.42, baseRate: 1200 });
    components.push({ type: "MATERIAL", desc: "Aggregate 20mm", unit: "cum", qty: 0.84, baseRate: 1400 });
    components.push({ type: "LABOUR", desc: "Mason", unit: "day", qty: 0.3, baseRate: 600 });
    components.push({ type: "LABOUR", desc: "Beldar", unit: "day", qty: 2.0, baseRate: 400 });
    components.push({ type: "MACHINERY", desc: "Concrete Mixer", unit: "hour", qty: 0.3, baseRate: 800 });
    components.push({ type: "MACHINERY", desc: "Vibrator", unit: "hour", qty: 0.3, baseRate: 200 });
  } else if (desc.includes("brick") || desc.includes("brickwork")) {
    components.push({ type: "MATERIAL", desc: "Bricks", unit: "nos", qty: 500, baseRate: 6 });
    components.push({ type: "MATERIAL", desc: "Cement", unit: "kg", qty: 50, baseRate: 6 });
    components.push({ type: "MATERIAL", desc: "Sand", unit: "cum", qty: 0.25, baseRate: 1000 });
    components.push({ type: "LABOUR", desc: "Mason (Bricklayer)", unit: "day", qty: 0.7, baseRate: 600 });
    components.push({ type: "LABOUR", desc: "Beldar", unit: "day", qty: 1.4, baseRate: 400 });
  } else if (desc.includes("plaster")) {
    components.push({ type: "MATERIAL", desc: "Cement", unit: "kg", qty: 6, baseRate: 6 });
    components.push({ type: "MATERIAL", desc: "Fine Sand", unit: "cum", qty: 0.02, baseRate: 1000 });
    components.push({ type: "LABOUR", desc: "Mason", unit: "day", qty: 0.1, baseRate: 600 });
    components.push({ type: "LABOUR", desc: "Beldar", unit: "day", qty: 0.15, baseRate: 400 });
  } else if (desc.includes("steel") || desc.includes("reinforcement") || desc.includes("tmt")) {
    components.push({ type: "MATERIAL", desc: "Steel Rebar", unit: "kg", qty: 1, baseRate: 60 });
    components.push({ type: "MATERIAL", desc: "Binding Wire", unit: "kg", qty: 0.01, baseRate: 80 });
    components.push({ type: "LABOUR", desc: "Fitter", unit: "day", qty: 0.01, baseRate: 600 });
    components.push({ type: "LABOUR", desc: "Beldar", unit: "day", qty: 0.01, baseRate: 400 });
  } else if (desc.includes("paint") || desc.includes("distemper") || desc.includes("enamel")) {
    components.push({ type: "MATERIAL", desc: "Paint", unit: "ltr", qty: 0.1, baseRate: 200 });
    components.push({ type: "MATERIAL", desc: "Primer", unit: "ltr", qty: 0.05, baseRate: 150 });
    components.push({ type: "LABOUR", desc: "Painter", unit: "day", qty: 0.05, baseRate: 500 });
  } else if (desc.includes("wood") || desc.includes("door") || desc.includes("window") || desc.includes("flush")) {
    components.push({ type: "MATERIAL", desc: "Wood / Panel", unit: "sqm", qty: 1, baseRate: 1500 });
    components.push({ type: "MATERIAL", desc: "Fittings (Screws, Hinges)", unit: "LS", qty: 1, baseRate: 100 });
    components.push({ type: "LABOUR", desc: "Carpenter", unit: "day", qty: 0.5, baseRate: 650 });
  } else {
    // Generic heuristic
    components.push({ type: "MATERIAL", desc: "Assorted Materials", unit: "LS", qty: 1, baseRate: 650 });
    components.push({ type: "LABOUR", desc: "Assorted Labour", unit: "LS", qty: 1, baseRate: 250 });
    components.push({ type: "MACHINERY", desc: "Tools & Plants", unit: "LS", qty: 1, baseRate: 50 });
    components.push({ type: "OTHER", desc: "Overheads", unit: "LS", qty: 1, baseRate: 50 });
  }

  // Calculate raw sum
  let rawSum = 0;
  for (const c of components) {
    rawSum += c.qty * c.baseRate;
  }

  const finalComponents: any[] = [];

  if (targetRate >= rawSum) {
    // Keep standard rates and quantities as is, add the difference as "Assorted Materials & Execution"
    components.forEach((c, index) => {
      finalComponents.push({
        type: c.type,
        description: c.desc,
        unit: c.unit,
        quantity: c.qty,
        rate: c.baseRate,
        amount: Number((c.qty * c.baseRate).toFixed(2)),
        sortOrder: index
      });
    });

    const diff = Number((targetRate - rawSum).toFixed(2));
    if (diff > 0) {
      finalComponents.push({
        type: "MATERIAL",
        description: "Assorted Materials & Execution",
        unit: "LS",
        quantity: 1,
        rate: diff,
        amount: diff,
        sortOrder: components.length
      });
    }
  } else {
    // targetRate < rawSum. We must scale down the quantities to match targetRate. Rates stay standard.
    const scale = targetRate / (rawSum || 1);
    components.forEach((c, index) => {
      const scaledQty = Number((c.qty * scale).toFixed(4));
      const amount = Number((scaledQty * c.baseRate).toFixed(2));
      finalComponents.push({
        type: c.type,
        description: c.desc,
        unit: c.unit,
        quantity: scaledQty,
        rate: c.baseRate,
        amount: amount,
        sortOrder: index
      });
    });

    // Handle rounding difference on the largest component to ensure EXACT match
    const currentTotal = finalComponents.reduce((sum, c) => sum + c.amount, 0);
    const diff = Number((targetRate - currentTotal).toFixed(2));
    
    if (diff !== 0 && finalComponents.length > 0) {
      let maxIdx = 0;
      for (let i = 1; i < finalComponents.length; i++) {
        if (finalComponents[i].amount > finalComponents[maxIdx].amount) {
          maxIdx = i;
        }
      }
      finalComponents[maxIdx].amount = Number((finalComponents[maxIdx].amount + diff).toFixed(2));
      finalComponents[maxIdx].quantity = Number((finalComponents[maxIdx].amount / finalComponents[maxIdx].rate).toFixed(4));
    }
  }

  return finalComponents;
}

async function main() {
  console.log("Starting Rate Analysis Generation for ALL items...");
  
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No user found to assign createdById");
  }

  const items = await prisma.sORItem.findMany({
    select: { id: true, description: true, rate: true, itemCode: true, unit: true }
  });

  console.log(`Found ${items.length} items to process.`);

  let successCount = 0;
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    
    await prisma.$transaction(async (tx) => {
      for (const item of batch) {
        const targetRate = Number(item.rate) || 0;
        if (targetRate === 0) continue;

        // Check if exists
        const existing = await tx.rateAnalysis.findFirst({
          where: { sorItemId: item.id }
        });

        if (existing) {
          // Delete old components
          await tx.rateAnalysisComponent.deleteMany({
            where: { rateAnalysisId: existing.id }
          });
          // Update total rate
          await tx.rateAnalysis.update({
            where: { id: existing.id },
            data: { totalRate: targetRate }
          });
        }

        const analysisId = existing ? existing.id : (await tx.rateAnalysis.create({
          data: {
            sorItemId: item.id,
            name: `${item.itemCode} Rate Analysis`,
            unit: item.unit,
            totalRate: targetRate,
            isTemplate: true,
            createdById: user.id
          }
        })).id;

        const components = generateStandardComponents(item.description, targetRate);
        
        await tx.rateAnalysisComponent.createMany({
          data: components.map(c => ({
            rateAnalysisId: analysisId,
            type: c.type,
            description: c.description,
            unit: c.unit,
            quantity: c.quantity,
            rate: c.rate,
            amount: c.amount,
            sortOrder: c.sortOrder
          }))
        });

        successCount++;
      }
    });
    
    console.log(`Processed ${Math.min(i + BATCH_SIZE, items.length)} / ${items.length}`);
  }

  console.log(`Successfully generated/updated rate analyses for ${successCount} items!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
