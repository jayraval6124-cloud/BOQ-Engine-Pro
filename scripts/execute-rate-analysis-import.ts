import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";
import * as fs from "fs";

const prisma = new PrismaClient();

// String similarity function
function getSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(x => x);
  const s2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(x => x);
  if (s1.length === 0 || s2.length === 0) return 0;
  const set1 = new Set(s1);
  const set2 = new Set(s2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

function determineType(desc: string): "LABOUR" | "MATERIAL" | "MACHINERY" | "OTHER" {
  const d = desc.toLowerCase();
  if (d.includes("bhisti") || d.includes("mazdoor") || d.includes("coolie") || d.includes("mason") || d.includes("beldar") || d.includes("carpenter") || d.includes("fitter") || d.includes("painter") || d.includes("mate") || d.includes("driver")) {
    return "LABOUR";
  }
  if (d.includes("hire") || d.includes("mixer") || d.includes("vibrator") || d.includes("roller") || d.includes("machinery") || d.includes("pump") || d.includes("jcb") || d.includes("tractor")) {
    return "MACHINERY";
  }
  if (d.includes("sundries") || d.includes("water") || d.includes("t & p") || d.includes("scaffolding")) {
    return "OTHER";
  }
  return "MATERIAL";
}

async function main() {
  console.log("Starting Bulk Rate Analysis Engine...");
  
  // 1. Read Excel file
  const filePath = "D:/Office/Jay/Civil/SoR/Revised up to Dt 21-03-16-SOR-15-16-DRAFT-JKP-DABHI (2) (1).xls";
  console.log("Parsing old CPWD Master Sheet...");
  const wb = xlsx.readFile(filePath);
  const sheetName = "AH-GND";
  const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
  
  // 2. Extract CPWD rate analyses
  const cpwdAnalyses: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.length >= 3 && typeof row[0] === "number" && typeof row[2] === "string" && row[2].length > 5 && !row[2].startsWith("DETAIL")) {
      const components = [];
      let totalRate = 0;
      
      // Lookahead for components
      for (let j = i + 1; j < Math.min(i + 50, rows.length); j++) {
        const lookahead = rows[j];
        if (lookahead.length > 0 && typeof lookahead[0] === "number" && typeof lookahead[1] === "string" && !lookahead[2]) break; // Next main item roughly
        
        // Check for sum line
        const strVal = lookahead.find(x => typeof x === "string" && x.includes("COST OF 1.0000"));
        if (strVal) {
           const numVal = lookahead.find(x => typeof x === "number" && x > 0);
           totalRate = numVal || 0;
           break;
        }
        
        // Check for component row: [ <empty>, S.No, Desc, Unit, Qty, Rate, Amount ]
        // Usually S.No is at index 1 and desc at index 2
        if (lookahead.length >= 7 && typeof lookahead[1] === "number" && typeof lookahead[2] === "string") {
           components.push({
             type: determineType(lookahead[2]),
             description: lookahead[2].trim(),
             unit: String(lookahead[3] || "LS"),
             quantity: Number(lookahead[4]) || 1,
             rate: Number(lookahead[5]) || 0,
             amount: Number(lookahead[6]) || 0
           });
        }
      }
      
      if (components.length > 0) {
        cpwdAnalyses.push({
          id: String(row[0]),
          sorCode: String(row[1] || ""),
          description: row[2].trim(),
          components,
          totalRate
        });
      }
    }
  }
  
  console.log(`Extracted ${cpwdAnalyses.length} valid Rate Analyses from Excel.`);

  // 3. Fetch all RJ items from DB
  const rjItems = await prisma.sORItem.findMany({
    where: { itemCode: { startsWith: "RJ" } }
  });
  
  console.log(`Found ${rjItems.length} RJ items in database to process.`);
  
  const exportData: any[] = [];
  const exportWorkbook = xlsx.utils.book_new();
  
  let matchCount = 0;
  let heuristicCount = 0;
  
  // Clean DB first to avoid duplicates
  console.log("Cleaning existing Rate Analysis components for RJ items...");
  await prisma.rateAnalysisComponent.deleteMany({
    where: { rateAnalysis: { sorItem: { itemCode: { startsWith: "RJ" } } } }
  });
  await prisma.rateAnalysis.deleteMany({
    where: { sorItem: { itemCode: { startsWith: "RJ" } } }
  });
  
  const sysUser = await prisma.user.findFirst();
  const createdById = sysUser ? sysUser.id : "system";
  
  console.log("Generating mapped rate analyses...");
  
  // Batch inserts for performance
  const rateAnalysesToCreate: any[] = [];
  const rateAnalysisComponentsToCreate: any[] = [];
  
  for (let i = 0; i < rjItems.length; i++) {
    const rj = rjItems[i];
    const targetRate = Number(rj.rate);
    
    if (targetRate === 0) continue; // Skip if no rate
    
    // Find best CPWD match
    let bestMatch = null;
    let highestScore = 0;
    
    for (const cpwd of cpwdAnalyses) {
      const score = getSimilarity(rj.description, cpwd.description);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = cpwd;
      }
    }
    
    let finalComponents: any[] = [];
    let isHeuristic = false;
    let templateName = "CPWD_MATCH";
    
    if (bestMatch && highestScore >= 0.4 && bestMatch.totalRate > 0) {
      matchCount++;
      // Scale components
      const scale = targetRate / bestMatch.totalRate;
      finalComponents = bestMatch.components.map((c: any) => {
        const scaledRate = Number((c.rate * scale).toFixed(2));
        return {
          type: c.type,
          description: c.description,
          unit: c.unit,
          quantity: c.quantity,
          rate: scaledRate,
          amount: Number((c.quantity * scaledRate).toFixed(2))
        };
      });
      templateName = `CPWD-${bestMatch.sorCode}`;
    } else {
      heuristicCount++;
      isHeuristic = true;
      templateName = "HEURISTIC_AUTO";
      // Generic Heuristic Fallback
      finalComponents = [
        { type: "MATERIAL", description: "Primary Material (Auto-Estimated)", unit: "LS", quantity: 1, rate: Number((targetRate * 0.6).toFixed(2)), amount: Number((targetRate * 0.6).toFixed(2)) },
        { type: "MATERIAL", description: "Consumables & Sundries", unit: "LS", quantity: 1, rate: Number((targetRate * 0.05).toFixed(2)), amount: Number((targetRate * 0.05).toFixed(2)) },
        { type: "LABOUR", description: "Skilled Technician", unit: "LS", quantity: 1, rate: Number((targetRate * 0.15).toFixed(2)), amount: Number((targetRate * 0.15).toFixed(2)) },
        { type: "LABOUR", description: "Beldar (Unskilled)", unit: "LS", quantity: 1, rate: Number((targetRate * 0.1).toFixed(2)), amount: Number((targetRate * 0.1).toFixed(2)) },
        { type: "MACHINERY", description: "Tools & Plants (T&P)", unit: "LS", quantity: 1, rate: Number((targetRate * 0.1).toFixed(2)), amount: Number((targetRate * 0.1).toFixed(2)) }
      ];
    }
    
    // Mathematical Normalization (Penny balancing)
    let sum = finalComponents.reduce((acc, c) => acc + c.amount, 0);
    const diff = Number((targetRate - sum).toFixed(2));
    if (Math.abs(diff) > 0.01 && finalComponents.length > 0) {
      finalComponents[finalComponents.length - 1].amount += diff;
      finalComponents[finalComponents.length - 1].amount = Number(finalComponents[finalComponents.length - 1].amount.toFixed(2));
    }
    
    // DB Insert (using a predictable CUID generation or relying on Prisma)
    // To do it in batch, we will just create them sequentially but wait to insert them


    const createdRA = await prisma.rateAnalysis.create({
      data: {
        sorItemId: rj.id,
        name: `Rate Analysis for ${rj.itemCode}`,
        unit: rj.unit,
        totalRate: targetRate,
        isTemplate: false,
        templateName: templateName,
        createdById: createdById
      }
    });
    
    await prisma.rateAnalysisComponent.createMany({
      data: finalComponents.map((c, idx) => ({
        rateAnalysisId: createdRA.id,
        type: c.type,
        description: c.description,
        unit: c.unit,
        quantity: c.quantity,
        rate: c.rate,
        amount: c.amount,
        sortOrder: idx
      }))
    });
    
    // Prepare Export Data
    exportData.push({
      "Item Code": rj.itemCode,
      "Division": rj.division,
      "Description": rj.description.substring(0, 80),
      "Unit": rj.unit,
      "Target Rate": targetRate,
      "Match Type": isHeuristic ? "⚠️ HEURISTIC" : `✅ ${templateName}`,
      "Similarity Score": isHeuristic ? "N/A" : `${(highestScore * 100).toFixed(1)}%`,
      "Component": "",
      "Qty": "",
      "Comp Unit": "",
      "Comp Rate": "",
      "Amount": ""
    });
    
    for (const c of finalComponents) {
      exportData.push({
        "Item Code": "",
        "Division": "",
        "Description": "",
        "Unit": "",
        "Target Rate": "",
        "Match Type": "",
        "Similarity Score": "",
        "Component": `[${c.type}] ${c.description}`,
        "Qty": c.quantity,
        "Comp Unit": c.unit,
        "Comp Rate": c.rate,
        "Amount": c.amount
      });
    }
    
    // Add empty row separator
    exportData.push({});
    
    if (i % 500 === 0 && i > 0) console.log(`Processed ${i} / ${rjItems.length}...`);
  }
  
  console.log(`\nImport Complete!`);
  console.log(`Successfully mapped: ${matchCount}`);
  console.log(`Heuristic fallback: ${heuristicCount}`);
  
  // Write Excel
  console.log("Generating Review Excel file...");
  const exportWs = xlsx.utils.json_to_sheet(exportData);
  xlsx.utils.book_append_sheet(exportWorkbook, exportWs, "Rate Analysis");
  const exportPath = "D:/My Own Software/BOQ Engine Pro/Rate_Analysis_Review.xlsx";
  xlsx.writeFile(exportWorkbook, exportPath);
  
  console.log(`Review file saved at: ${exportPath}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
