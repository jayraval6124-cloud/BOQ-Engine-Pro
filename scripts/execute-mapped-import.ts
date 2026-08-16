import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";
import * as fs from "fs";

const prisma = new PrismaClient();

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
  console.log("Starting Exact Mapped Bulk Rate Analysis Engine...");
  
  // 1. Read CPWD Excel file
  const cpwdFilePath = "D:/Office/Jay/Civil/SoR/Revised up to Dt 21-03-16-SOR-15-16-DRAFT-JKP-DABHI (2) (1).xls";
  console.log("Parsing CPWD Master Sheet...");
  const cpwdWb = xlsx.readFile(cpwdFilePath);
  const cpwdRows: any[] = xlsx.utils.sheet_to_json(cpwdWb.Sheets["AH-GND"], { header: 1 });
  
  // Extract CPWD rate analyses indexed by sorCode
  const cpwdMap = new Map<string, any>();
  for (let i = 0; i < cpwdRows.length; i++) {
    const row = cpwdRows[i];
    if (row.length >= 3 && typeof row[0] === "number" && typeof row[2] === "string" && row[2].length > 5 && !row[2].startsWith("DETAIL")) {
      const components = [];
      let totalRate = 0;
      let totalAmountFromComponents = 0;
      
      // Lookahead for components
      for (let j = i + 1; j < Math.min(i + 50, cpwdRows.length); j++) {
        const lookahead = cpwdRows[j];
        if (lookahead.length > 0 && typeof lookahead[0] === "number" && typeof lookahead[1] === "string" && !lookahead[2]) break;
        
        const strVal = lookahead.find(x => typeof x === "string" && x.includes("COST OF 1.0000"));
        if (strVal) {
           const numVal = lookahead.find(x => typeof x === "number" && x > 0);
           totalRate = numVal || 0;
           break;
        }
        
        if (lookahead.length >= 7 && typeof lookahead[1] === "number" && typeof lookahead[2] === "string") {
           const qty = Number(lookahead[4]) || 1;
           const rate = Number(lookahead[5]) || 0;
           const amount = Number(lookahead[6]) || 0;
           components.push({
             type: determineType(lookahead[2]),
             description: lookahead[2].trim(),
             unit: String(lookahead[3] || "LS"),
             quantity: qty,
             rate: rate,
             amount: amount
           });
           totalAmountFromComponents += amount;
        }
      }
      
      const sorCodeRaw = String(row[1] || "").trim();
      const srNoStr = String(row[0] || "").trim();
      if (components.length > 0 && srNoStr) {
        cpwdMap.set(srNoStr, {
          id: srNoStr,
          sorCode: sorCodeRaw,
          description: row[2].trim(),
          components,
          totalRate,
          totalAmountFromComponents
        });
      }
    }
  }
  
  console.log(`Extracted ${cpwdMap.size} valid Rate Analyses from CPWD Excel.`);

  // 2. Read User's Mapping Excel file
  const mappingFilePath = "D:/Office/Jay/Master DTP/Rate Analysis.xls";
  console.log("Parsing User Mapping Sheet...");
  const mapWb = xlsx.readFile(mappingFilePath);
  const mapRows: any[] = xlsx.utils.sheet_to_json(mapWb.Sheets[mapWb.SheetNames[0]], { header: 1 });
  
  // RJ Code -> CPWD SR NO mapping
  const rjToCpwd = new Map<string, string>();
  for (const row of mapRows) {
    if (row.length >= 3) {
      const rjCode = String(row[1] || "").trim();
      const importSrNo = String(row[2] || "").trim();
      if (rjCode.startsWith("RJ") && importSrNo) {
        rjToCpwd.set(rjCode, importSrNo);
      }
    }
  }
  
  console.log(`Extracted ${rjToCpwd.size} RJ to CPWD mappings.`);

  // 3. Fetch all RJ items from DB
  const rjItems = await prisma.sORItem.findMany({
    where: { itemCode: { startsWith: "RJ" } }
  });
  
  console.log(`Found ${rjItems.length} RJ items in database to process.`);
  
  const exportData: any[] = [];
  const exportWorkbook = xlsx.utils.book_new();
  
  let matchCount = 0;
  let heuristicCount = 0;
  
  console.log("Cleaning existing Rate Analysis components for RJ items...");
  await prisma.rateAnalysisComponent.deleteMany({
    where: { rateAnalysis: { sorItem: { itemCode: { startsWith: "RJ" } } } }
  });
  await prisma.rateAnalysis.deleteMany({
    where: { sorItem: { itemCode: { startsWith: "RJ" } } }
  });
  
  const sysUser = await prisma.user.findFirst();
  const createdById = sysUser ? sysUser.id : "system";
  
  console.log("Generating mapped rate analyses with CORRECT math...");
  
  for (let i = 0; i < rjItems.length; i++) {
    const rj = rjItems[i];
    const targetRate = Number(rj.rate);
    if (targetRate === 0) continue;
    
    // Extract base RJ code (e.g. RJ001 from RJ001-A if they have suffixes, but usually it's exactly itemCode)
    const baseRjCode = rj.itemCode;
    const mappedSrNo = rjToCpwd.get(baseRjCode);
    const bestMatch = mappedSrNo ? cpwdMap.get(mappedSrNo) : null;
    
    let finalComponents: any[] = [];
    let isHeuristic = false;
    let templateName = "HEURISTIC_AUTO";
    
    if (bestMatch && bestMatch.totalAmountFromComponents > 0) {
      matchCount++;
      isHeuristic = false;
      templateName = `CPWD-${bestMatch.sorCode}`;
      
      const originalSum = bestMatch.totalAmountFromComponents;
      const batchSize = bestMatch.totalRate > 0 ? (originalSum / bestMatch.totalRate) : 1;
      
      // We scale the quantities to be for 1 unit (divide by batchSize)
      // And we scale the rates to reflect inflation (multiply by targetRate / bestMatch.totalRate)
      // If totalRate was not found properly, we just scale based on originalSum.
      const rateScale = targetRate / (bestMatch.totalRate > 0 ? bestMatch.totalRate : originalSum);
      
      finalComponents = bestMatch.components.map((c: any) => {
        const normalizedQty = c.quantity / batchSize;
        const inflatedRate = c.rate * rateScale;
        return {
          type: c.type,
          description: c.description,
          unit: c.unit,
          quantity: Number(normalizedQty.toFixed(6)),
          rate: Number(inflatedRate.toFixed(2)),
          amount: Number((normalizedQty * inflatedRate).toFixed(2))
        };
      });
    } else {
      heuristicCount++;
      isHeuristic = true;
      templateName = "HEURISTIC_AUTO";
      // Generic Heuristic Fallback for those not found/mapped
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
      let largestComp = finalComponents[0];
      for (const c of finalComponents) {
        if (c.amount > largestComp.amount) {
          largestComp = c;
        }
      }
      largestComp.amount += diff;
      largestComp.amount = Number(largestComp.amount.toFixed(2));
    }
    
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
    
    // Export format
    exportData.push({
      "Item Code": rj.itemCode,
      "Division": rj.division,
      "Description": rj.description.substring(0, 80),
      "Unit": rj.unit,
      "Target Rate": targetRate,
      "Match Type": isHeuristic ? "⚠️ HEURISTIC" : `✅ ${templateName}`,
      "Mapped SOR": mappedSrNo || "N/A",
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
        "Mapped SOR": "",
        "Component": `[${c.type}] ${c.description}`,
        "Qty": c.quantity,
        "Comp Unit": c.unit,
        "Comp Rate": c.rate,
        "Amount": c.amount
      });
    }
    exportData.push({});
    
    if (i % 500 === 0 && i > 0) console.log(`Processed ${i} / ${rjItems.length}...`);
  }
  
  console.log(`\nImport Complete!`);
  console.log(`Successfully mapped: ${matchCount}`);
  console.log(`Heuristic fallback: ${heuristicCount}`);
  
  console.log("Generating Review Excel file...");
  const exportWs = xlsx.utils.json_to_sheet(exportData);
  xlsx.utils.book_append_sheet(exportWorkbook, exportWs, "Rate Analysis");
  const exportPath = "D:/My Own Software/BOQ Engine Pro/Rate_Analysis_Review_V2.xlsx";
  xlsx.writeFile(exportWorkbook, exportPath);
  
  console.log(`Review file saved at: ${exportPath}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
