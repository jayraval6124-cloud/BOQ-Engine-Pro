import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Define realistic standard templates based on Civil Engineering norms
const TEMPLATES: Record<string, { type: string, desc: string, weight: number }[]> = {
  RCC: [
    { type: "MATERIAL", desc: "Cement, Sand & Aggregate", weight: 0.65 },
    { type: "LABOUR", desc: "Mason & Beldar", weight: 0.20 },
    { type: "MACHINERY", desc: "Mixer & Vibrator", weight: 0.10 },
    { type: "OTHER", desc: "Water & Sundries", weight: 0.05 },
  ],
  MASONRY: [
    { type: "MATERIAL", desc: "Bricks/Stone, Cement & Sand", weight: 0.70 },
    { type: "LABOUR", desc: "Mason & Coolie", weight: 0.25 },
    { type: "OTHER", desc: "Scaffolding & Water", weight: 0.05 },
  ],
  WOODWORK: [
    { type: "MATERIAL", desc: "Plywood, Laminate & Hardware", weight: 0.75 },
    { type: "LABOUR", desc: "Carpenter & Helper", weight: 0.20 },
    { type: "OTHER", desc: "Tools & Consumables", weight: 0.05 },
  ],
  PLUMBING: [
    { type: "MATERIAL", desc: "Pipes, Fittings & Solvents", weight: 0.70 },
    { type: "LABOUR", desc: "Plumber & Fitter", weight: 0.25 },
    { type: "OTHER", desc: "Tools & Testing", weight: 0.05 },
  ],
  ELECTRICAL: [
    { type: "MATERIAL", desc: "Wires, Cables & Fixtures", weight: 0.80 },
    { type: "LABOUR", desc: "Electrician & Helper", weight: 0.15 },
    { type: "OTHER", desc: "Tools & Sundries", weight: 0.05 },
  ],
  FINISHING: [
    { type: "MATERIAL", desc: "Paint, Putty, Primer & Adhesives", weight: 0.55 },
    { type: "LABOUR", desc: "Painter / Skilled Labour", weight: 0.35 },
    { type: "OTHER", desc: "Scaffolding & Brushes", weight: 0.10 },
  ],
  MACHINERY_HIRE: [
    { type: "MACHINERY", desc: "Equipment/Machine Hire", weight: 0.85 },
    { type: "LABOUR", desc: "Driver & Helper", weight: 0.15 },
  ],
  HORTICULTURE: [
    { type: "MATERIAL", desc: "Soil, Grass & Fertilizer", weight: 0.40 },
    { type: "LABOUR", desc: "Mali (Gardener) & Beldar", weight: 0.50 },
    { type: "OTHER", desc: "Water & Tools", weight: 0.10 },
  ],
  EQUIPMENT: [
    { type: "MATERIAL", desc: "Supplied Equipment", weight: 0.95 },
    { type: "LABOUR", desc: "Installation Labour", weight: 0.05 },
  ],
  GENERAL: [
    { type: "MATERIAL", desc: "Primary Material", weight: 0.60 },
    { type: "LABOUR", desc: "Skilled & Unskilled Labour", weight: 0.30 },
    { type: "MACHINERY", desc: "Tools, Plants & Sundries", weight: 0.10 },
  ]
};

function determineTemplate(desc: string) {
  const d = desc.toLowerCase();
  
  if (d.includes('hire charges') || d.includes('tractor') || d.includes('jcb') || d.includes('machine')) return 'MACHINERY_HIRE';
  if (d.includes('wood') || d.includes('plywood') || d.includes('door') || d.includes('board') || d.includes('storage') || d.includes('drawer')) return 'WOODWORK';
  if (d.includes('pipe') || d.includes('valve') || d.includes('plumb') || d.includes('water spout') || d.includes('septic')) return 'PLUMBING';
  if (d.includes('wire') || d.includes('cable') || d.includes('switch') || d.includes('ahuja') || d.includes('bell')) return 'ELECTRICAL';
  if (d.includes('concrete') || d.includes('r.c.c') || d.includes('frc')) return 'RCC';
  if (d.includes('brick') || d.includes('masonry') || d.includes('rubble')) return 'MASONRY';
  if (d.includes('plaster') || d.includes('paint') || d.includes('putty') || d.includes('primer') || d.includes('tile') || d.includes('granite') || d.includes('jali')) return 'FINISHING';
  if (d.includes('lawn') || d.includes('garden') || d.includes('tree') || d.includes('fertilizer') || d.includes('kamp')) return 'HORTICULTURE';
  if (d.includes('wheel chair') || d.includes('signage') || d.includes('grab bar') || d.includes('plate')) return 'EQUIPMENT';
  
  return 'GENERAL';
}

async function run() {
  console.log("Applying specialized AI templates to heuristic items...");
  
  // Find all heuristic items
  const heuristicRAs = await prisma.rateAnalysis.findMany({
    where: { templateName: 'HEURISTIC_AUTO' },
    include: { sorItem: true }
  });
  
  console.log(`Found ${heuristicRAs.length} rate analyses to upgrade.`);
  
  let upgraded = 0;
  
  for (const ra of heuristicRAs) {
    const targetRate = Number(ra.sorItem.rate);
    const tplKey = determineTemplate(ra.sorItem.description);
    const template = TEMPLATES[tplKey];
    
    // Delete old generic components
    await prisma.rateAnalysisComponent.deleteMany({
      where: { rateAnalysisId: ra.id }
    });
    
    // Create new specialized components
    let components = template.map((c, i) => {
      let amount = Number((targetRate * c.weight).toFixed(2));
      return {
        rateAnalysisId: ra.id,
        type: c.type,
        description: c.desc,
        unit: 'L.S.',
        quantity: 1,
        rate: amount,
        amount: amount,
        sortOrder: i
      };
    });
    
    // Penny balancing on the LARGEST component
    let sum = components.reduce((acc, c) => acc + c.amount, 0);
    const diff = Number((targetRate - sum).toFixed(2));
    if (Math.abs(diff) > 0.01 && components.length > 0) {
      let largestComp = components[0];
      for (const c of components) {
        if (c.amount > largestComp.amount) {
          largestComp = c;
        }
      }
      largestComp.amount += diff;
      largestComp.amount = Number(largestComp.amount.toFixed(2));
      largestComp.rate = largestComp.amount; // since qty is 1
    }
    
    await prisma.rateAnalysisComponent.createMany({
      data: components
    });
    
    // Update template name to indicate specialized AI generation
    await prisma.rateAnalysis.update({
      where: { id: ra.id },
      data: { templateName: `AI_${tplKey}` }
    });
    
    upgraded++;
    if (upgraded % 100 === 0) console.log(`Upgraded ${upgraded}...`);
  }
  
  console.log(`Successfully upgraded ${upgraded} heuristic rate analyses using specialized AI templates!`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
