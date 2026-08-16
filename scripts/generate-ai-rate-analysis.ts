import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from '@google/genai';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: "AQ.Ab8RN6IrU4Z9wExEQs6QxemR_eUeW2qYR63AXgzl12u-NlsPnw" });

async function generateWithGemini(description: string, unit: string, targetRate: number) {
  const prompt = `
Provide a highly granular rate analysis as an expert CPWD estimator.
Break this down EXACTLY into ALL RAW MATERIALS, ALL LABOUR (Mason, Beldar, Bhisti, etc.), and MACHINERY (Mixer, Vibrator, T&P).
NEVER group materials together (e.g. do not say "Cement Mortar", say "Portland Cement" and "River Sand").
YOU MUST ALWAYS INCLUDE LABOUR (Skilled and Unskilled). No construction happens without labour!
Output ONLY a raw valid JSON array. DO NOT wrap it in markdown block quotes like \`\`\`json. DO NOT add any conversational text.

[
  { "type": "MATERIAL", "description": "First Class Bricks", "quantity": 500, "unit": "Nos", "rate": 6 },
  { "type": "MATERIAL", "description": "Portland Cement", "quantity": 45, "unit": "Kg", "rate": 7 },
  { "type": "MATERIAL", "description": "River Sand", "quantity": 0.12, "unit": "Cum", "rate": 800 },
  { "type": "LABOUR", "description": "Mason (Skilled)", "quantity": 0.5, "unit": "Day", "rate": 700 },
  { "type": "LABOUR", "description": "Beldar (Unskilled)", "quantity": 1, "unit": "Day", "rate": 450 },
  { "type": "MACHINERY", "description": "Tools & Plants (T&P)", "quantity": 1, "unit": "LS", "rate": 100 }
]

Item Description: ${description}
Unit: ${unit}
Target Rate: ${targetRate}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'deep-research-max-preview-04-2026',
      contents: prompt
    });

    let text = response.text?.trim() || "";
    
    if (text.startsWith("```json")) text = text.replace("```json", "");
    if (text.startsWith("```")) text = text.replace("```", "");
    if (text.endsWith("```")) text = text.replace("```", "");
    text = text.trim();

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("AI Parse Error. Raw Text was:", text);
      return null;
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

function mathNormalizer(components: any[], targetRate: number) {
  // Filter out any garbage strings returned by LLM
  components = components.filter(c => c && typeof c === 'object' && !Array.isArray(c) && c.type);
  if (components.length === 0) return [];

  // MATHEMATICAL NORMALIZATION: Guarantee sum == targetRate
  let rawSum = components.reduce((acc, c) => acc + (Number(c.quantity) * Number(c.rate) || 0), 0);
  
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
  console.log("Starting Hybrid AI + Math Normalizer Engine...");
  
  let items = await prisma.sORItem.findMany({
    where: { sorYear: "2024-25" },
    select: { id: true, description: true, rate: true, itemCode: true, unit: true }
  });

  items = items.filter(item => {
    return item.itemCode === "RJ086" || item.itemCode === "RJ163";
  });

  console.log(`Found ${items.length} items to process.`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const targetRate = Number(item.rate) || 0;
    if (targetRate === 0) continue;

    console.log(`\nProcessing [${i+1}/${items.length}] ${item.itemCode}: ${item.description.substring(0, 50)}...`);
    
    let rawComponents = await generateWithGemini(item.description, item.unit, targetRate);
    
    if (rawComponents && typeof rawComponents === 'object' && !Array.isArray(rawComponents)) {
      if (Array.isArray(rawComponents.components)) rawComponents = rawComponents.components;
      else if (Array.isArray(rawComponents.data)) rawComponents = rawComponents.data;
      else rawComponents = Object.values(rawComponents)[0];
    }
    
    if (!rawComponents || !Array.isArray(rawComponents) || rawComponents.length === 0) {
      console.log("Failed to parse AI output. Skipping. Output was:", rawComponents);
      continue;
    }

    // Apply strict mathematical normalizer
    const perfectlyBalancedComponents = mathNormalizer(rawComponents, targetRate);

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
        data: perfectlyBalancedComponents.map((c, idx) => ({
          rateAnalysisId: existing!.id,
          type: (c.type || "MATERIAL").toUpperCase(),
          description: c.description || "Unknown",
          unit: c.unit || "LS",
          quantity: c.quantity || 1,
          rate: c.rate || 0,
          amount: c.amount || 0,
          sortOrder: idx
        }))
      });
    });

    console.log(`Successfully generated and balanced ${perfectlyBalancedComponents.length} components.`);
  }

  console.log(`\nDONE!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
