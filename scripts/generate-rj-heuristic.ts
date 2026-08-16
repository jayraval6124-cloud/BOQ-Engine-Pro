import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const MIX_RATIOS: Record<string, { cementKg: number, sandCmt: number, aggregateCmt: number }> = {
  "1:4:8": { cementKg: 170, sandCmt: 0.47, aggregateCmt: 0.94 }, // M7.5
  "1:3:6": { cementKg: 220, sandCmt: 0.46, aggregateCmt: 0.92 }, // M10
  "1:2:4": { cementKg: 320, sandCmt: 0.44, aggregateCmt: 0.88 }, // M15
  "1:1.5:3": { cementKg: 400, sandCmt: 0.42, aggregateCmt: 0.84 }, // M20 nominal
  "m-150": { cementKg: 320, sandCmt: 0.44, aggregateCmt: 0.88 },
  "m-200": { cementKg: 350, sandCmt: 0.43, aggregateCmt: 0.86 },
  "m-250": { cementKg: 380, sandCmt: 0.43, aggregateCmt: 0.86 },
  "m-300": { cementKg: 410, sandCmt: 0.43, aggregateCmt: 0.86 },
  "m-350": { cementKg: 430, sandCmt: 0.43, aggregateCmt: 0.86 },
};

function determineComponents(desc: string, unit: string, targetRate: number) {
  const d = desc.toLowerCase();
  const components: any[] = [];
  
  if (d.includes("concrete") || d.includes("r.c.c") || d.includes("p.c.c")) {
    let mix = "1:2:4";
    for (const key of Object.keys(MIX_RATIOS)) {
      if (d.includes(key.toLowerCase())) mix = key;
    }
    const r = MIX_RATIOS[mix];
    
    components.push({ type: "MATERIAL", description: "Portland Cement", quantity: r.cementKg, unit: "Kg", rate: 7 });
    components.push({ type: "MATERIAL", description: "River Sand (Fine Aggregate)", quantity: r.sandCmt, unit: "Cum", rate: 800 });
    components.push({ type: "MATERIAL", description: "Stone Aggregate (20mm nominal)", quantity: r.aggregateCmt, unit: "Cum", rate: 900 });
    
    if (d.includes("formwork") || d.includes("centering")) {
      components.push({ type: "OTHER", description: "Centering & Shuttering", quantity: 1, unit: "Sqm", rate: 250 });
    }
    
    // Granular CPWD Labour for Concrete
    components.push({ type: "LABOUR", description: "Mason (Skilled)", quantity: 0.1, unit: "Day", rate: 700 });
    components.push({ type: "LABOUR", description: "Beldar (Unskilled)", quantity: 1.5, unit: "Day", rate: 450 });
    components.push({ type: "LABOUR", description: "Bhisti (Waterman)", quantity: 0.5, unit: "Day", rate: 450 });
    components.push({ type: "LABOUR", description: "Mate (Supervisor)", quantity: 0.1, unit: "Day", rate: 500 });
    
    // Machinery
    components.push({ type: "MACHINERY", description: "Concrete Mixer 0.4/0.28 cum", quantity: 0.05, unit: "Day", rate: 1200 });
    components.push({ type: "MACHINERY", description: "Needle Vibrator", quantity: 0.05, unit: "Day", rate: 800 });

  } else if (d.includes("excavation") || d.includes("clearing")) {
    components.push({ type: "LABOUR", description: "Beldar (Earthwork)", quantity: 0.5, unit: "Day", rate: 450 });
    components.push({ type: "LABOUR", description: "Mate (Supervisor)", quantity: 0.05, unit: "Day", rate: 500 });
    if (d.includes("jcb") || d.includes("machine")) {
      components.push({ type: "MACHINERY", description: "Excavator / JCB", quantity: 0.02, unit: "Hour", rate: 1200 });
    }
  } else if (d.includes("demolition") || d.includes("dismantling") || d.includes("removing")) {
    components.push({ type: "LABOUR", description: "Beldar (Dismantling)", quantity: 0.4, unit: "Day", rate: 450 });
    components.push({ type: "LABOUR", description: "Mate (Supervisor)", quantity: 0.04, unit: "Day", rate: 500 });
    components.push({ type: "MACHINERY", description: "Tools & Plants (T&P)", quantity: 1, unit: "LS", rate: 50 });
  } else if (d.includes("steel") || d.includes("reinforcement")) {
    components.push({ type: "MATERIAL", description: "TMT Steel Bars (Fe500D)", quantity: 1000, unit: "Kg", rate: 65 });
    components.push({ type: "MATERIAL", description: "Binding Wire", quantity: 10, unit: "Kg", rate: 70 });
    components.push({ type: "LABOUR", description: "Blacksmith / Bar Bender", quantity: 10, unit: "Day", rate: 700 });
    components.push({ type: "LABOUR", description: "Beldar", quantity: 10, unit: "Day", rate: 450 });
    components.push({ type: "LABOUR", description: "Mate (Supervisor)", quantity: 1, unit: "Day", rate: 500 });
  } else if (d.includes("brick") || d.includes("masonry")) {
    components.push({ type: "MATERIAL", description: "First Class Bricks", quantity: 500, unit: "Nos", rate: 8 });
    components.push({ type: "MATERIAL", description: "Portland Cement", quantity: 45, unit: "Kg", rate: 7 });
    components.push({ type: "MATERIAL", description: "River Sand", quantity: 0.12, unit: "Cum", rate: 800 });
    components.push({ type: "LABOUR", description: "Mason (Skilled)", quantity: 0.5, unit: "Day", rate: 700 });
    components.push({ type: "LABOUR", description: "Beldar", quantity: 1, unit: "Day", rate: 450 });
    components.push({ type: "LABOUR", description: "Bhisti (Waterman)", quantity: 0.2, unit: "Day", rate: 450 });
    components.push({ type: "LABOUR", description: "Mate", quantity: 0.1, unit: "Day", rate: 500 });
  } else if (d.includes("plaster") || d.includes("pointing")) {
    components.push({ type: "MATERIAL", description: "Portland Cement", quantity: 15, unit: "Kg", rate: 7 });
    components.push({ type: "MATERIAL", description: "Fine Sand", quantity: 0.05, unit: "Cum", rate: 800 });
    components.push({ type: "LABOUR", description: "Mason (Skilled)", quantity: 0.15, unit: "Day", rate: 700 });
    components.push({ type: "LABOUR", description: "Beldar (Unskilled)", quantity: 0.15, unit: "Day", rate: 450 });
    components.push({ type: "LABOUR", description: "Bhisti (Waterman)", quantity: 0.1, unit: "Day", rate: 450 });
    components.push({ type: "LABOUR", description: "Mate (Supervisor)", quantity: 0.05, unit: "Day", rate: 500 });
    components.push({ type: "OTHER", description: "Scaffolding / Jhoola", quantity: 1, unit: "Sqm", rate: 15 });
  } else if (d.includes("floor") || d.includes("tile") || d.includes("marble") || d.includes("granite")) {
    components.push({ type: "MATERIAL", description: "Ceramic/Vitrified/Stone Tiles", quantity: 1.05, unit: "Sqm", rate: 450 });
    components.push({ type: "MATERIAL", description: "Portland Cement", quantity: 10, unit: "Kg", rate: 7 });
    components.push({ type: "MATERIAL", description: "White Cement / Grout", quantity: 0.5, unit: "Kg", rate: 25 });
    components.push({ type: "LABOUR", description: "Mason (Tiler)", quantity: 0.2, unit: "Day", rate: 750 });
    components.push({ type: "LABOUR", description: "Beldar", quantity: 0.2, unit: "Day", rate: 450 });
    components.push({ type: "LABOUR", description: "Mate (Supervisor)", quantity: 0.05, unit: "Day", rate: 500 });
    if (d.includes("marble") || d.includes("granite")) {
      components.push({ type: "MACHINERY", description: "Cutting/Polishing Machine", quantity: 0.1, unit: "Day", rate: 500 });
    }
  } else if (d.includes("paint") || d.includes("distemper") || d.includes("primer") || d.includes("putty")) {
    components.push({ type: "MATERIAL", description: "Paint / Emulsion / Primer", quantity: 0.15, unit: "Ltr", rate: 250 });
    components.push({ type: "MATERIAL", description: "Wall Putty", quantity: 0.5, unit: "Kg", rate: 40 });
    components.push({ type: "LABOUR", description: "Painter (Skilled)", quantity: 0.1, unit: "Day", rate: 700 });
    components.push({ type: "LABOUR", description: "Beldar", quantity: 0.05, unit: "Day", rate: 450 });
    components.push({ type: "OTHER", description: "Brushes, T&P, Scaffolding", quantity: 1, unit: "LS", rate: 10 });
  } else if (d.includes("wood") || d.includes("door") || d.includes("window") || d.includes("flush")) {
    components.push({ type: "MATERIAL", description: "Timber / Wood / Flush Door", quantity: 1, unit: "Sqm", rate: 1500 });
    components.push({ type: "MATERIAL", description: "Screws, Nails & Fittings", quantity: 1, unit: "LS", rate: 100 });
    components.push({ type: "LABOUR", description: "Carpenter (Skilled)", quantity: 0.3, unit: "Day", rate: 750 });
    components.push({ type: "LABOUR", description: "Beldar", quantity: 0.1, unit: "Day", rate: 450 });
  } else if (d.includes("roof") || d.includes("sheet")) {
    components.push({ type: "MATERIAL", description: "Roofing Sheet (GI/AC)", quantity: 1.1, unit: "Sqm", rate: 400 });
    components.push({ type: "MATERIAL", description: "J-Hooks & Washers", quantity: 1, unit: "LS", rate: 30 });
    components.push({ type: "LABOUR", description: "Fitter (Skilled)", quantity: 0.15, unit: "Day", rate: 700 });
    components.push({ type: "LABOUR", description: "Beldar", quantity: 0.15, unit: "Day", rate: 450 });
  } else if (d.includes("road") || d.includes("bitumen") || d.includes("macadam") || d.includes("wbm")) {
    components.push({ type: "MATERIAL", description: "Bitumen / Emulsion (VG-30)", quantity: 5, unit: "Kg", rate: 50 });
    components.push({ type: "MATERIAL", description: "Stone Aggregate", quantity: 0.1, unit: "Cum", rate: 900 });
    components.push({ type: "LABOUR", description: "Mazdoor (Roadwork)", quantity: 0.2, unit: "Day", rate: 450 });
    components.push({ type: "LABOUR", description: "Mate (Supervisor)", quantity: 0.05, unit: "Day", rate: 500 });
    components.push({ type: "MACHINERY", description: "Road Roller (8-10 Ton)", quantity: 0.02, unit: "Hour", rate: 800 });
  } else if (d.includes("pipe") || d.includes("plumb") || d.includes("sanitary") || d.includes("valve") || d.includes("pvc")) {
    components.push({ type: "MATERIAL", description: "Pipes (GI/PVC/CI) & Fittings", quantity: 1, unit: "Mtr", rate: 300 });
    components.push({ type: "MATERIAL", description: "Solvent Cement / Teflon", quantity: 1, unit: "LS", rate: 20 });
    components.push({ type: "LABOUR", description: "Plumber (Skilled)", quantity: 0.1, unit: "Day", rate: 750 });
    components.push({ type: "LABOUR", description: "Beldar", quantity: 0.1, unit: "Day", rate: 450 });
  } else {
    // Dynamic material parsing based on item specification
    let cleanDesc = desc
      .replace(/supplying and fixing|providing and laying|providing and fixing|supplying|providing|laying|fixing|making|construction of/gi, '')
      .replace(/in all respects|as per direction of engineer|of approved quality/gi, '')
      .replace(/[^a-zA-Z0-9\s.,-]/g, '')
      .trim();
    
    // Take the first 50 characters as the core material name
    let materialName = cleanDesc.split(',')[0].substring(0, 50).trim();
    if (!materialName) materialName = "Primary Material";
    
    components.push({ type: "MATERIAL", description: materialName, quantity: 1, unit: "LS", rate: targetRate * 0.6 });
    components.push({ type: "MATERIAL", description: "Consumables & Sundries", quantity: 1, unit: "LS", rate: targetRate * 0.05 });
    components.push({ type: "LABOUR", description: "Skilled Technician / Fitter", quantity: 1, unit: "LS", rate: targetRate * 0.15 });
    components.push({ type: "LABOUR", description: "Beldar (Unskilled)", quantity: 1, unit: "LS", rate: targetRate * 0.1 });
    components.push({ type: "MACHINERY", description: "Tools & Plants (T&P)", quantity: 1, unit: "LS", rate: targetRate * 0.1 });
  }

  // MATHEMATICAL NORMALIZATION: Guarantee sum == targetRate
  let rawSum = components.reduce((acc, c) => acc + (c.quantity * c.rate), 0);
  if (rawSum > 0 && Math.abs(rawSum - targetRate) > 1) {
    const scale = targetRate / rawSum;
    components.forEach(c => {
      c.rate = Number((c.rate * scale).toFixed(2));
      c.amount = Number((c.quantity * c.rate).toFixed(2));
    });
  } else {
    components.forEach(c => c.amount = Number((c.quantity * c.rate).toFixed(2)));
  }

  // Final penny-balancing
  let finalSum = components.reduce((acc, c) => acc + c.amount, 0);
  const diff = Number((targetRate - finalSum).toFixed(2));
  if (Math.abs(diff) > 0.01 && components.length > 0) {
    components[components.length - 1].amount += diff;
    components[components.length - 1].amount = Number(components[components.length - 1].amount.toFixed(2));
  }

  return components;
}

async function main() {
  console.log("Starting Local Offline Engineering Heuristic Engine...");
  
  let items = await prisma.sORItem.findMany({
    where: { sorYear: "2024-25" },
    select: { id: true, description: true, rate: true, itemCode: true, unit: true }
  });

  items = items.filter(item => {
    if (!item.itemCode.startsWith("RJ")) return false;
    const num = parseInt(item.itemCode.replace("RJ", ""), 10);
    return !isNaN(num) && num >= 1 && num <= 303;
  });

  console.log(`Found ${items.length} items to process.`);
  let successCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const targetRate = Number(item.rate) || 0;
    if (targetRate === 0) continue;

    const components = determineComponents(item.description, item.unit, targetRate);

    await prisma.$transaction(async (tx) => {
      let existing = await tx.rateAnalysis.findFirst({ where: { boqItemId: null, sorItemId: item.id } });
      if (existing) {
        await tx.rateAnalysisComponent.deleteMany({ where: { rateAnalysisId: existing.id } });
        await tx.rateAnalysis.update({ where: { id: existing.id }, data: { totalRate: targetRate } });
      } else {
        existing = await tx.rateAnalysis.create({
          data: {
            sorItemId: item.id,
            name: `Rate Analysis for ${item.itemCode}`,
            unit: item.unit,
            totalRate: targetRate,
            createdById: "system"
          }
        });
      }

      await tx.rateAnalysisComponent.createMany({
        data: components.map((c, idx) => ({
          rateAnalysisId: existing!.id,
          type: c.type,
          description: c.description,
          unit: c.unit,
          quantity: c.quantity,
          rate: c.rate,
          amount: c.amount,
          sortOrder: idx
        }))
      });
    });

    successCount++;
    if (successCount % 100 === 0) console.log(`Processed ${successCount} items...`);
  }

  console.log(`\nDONE! Successfully built perfectly balanced Rate Analysis for ${successCount} RJ items.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
