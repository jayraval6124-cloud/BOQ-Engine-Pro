import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";
import * as fs from "fs";

const prisma = new PrismaClient();

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

async function main() {
  const filePath = "D:/Office/Jay/Civil/SoR/Revised up to Dt 21-03-16-SOR-15-16-DRAFT-JKP-DABHI (2) (1).xls";
  
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }

  console.log("Reading file:", filePath);
  const wb = xlsx.readFile(filePath);
  
  // Pick the AH-GND sheet
  const sheetName = "AH-GND";
  const ws = wb.Sheets[sheetName];
  
  const rows: any[] = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  const oldItems: { id: string, sorCode: string, description: string, rate: number }[] = [];
  
  let currentItem: any = null;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Check if it's a main item row: [ID, SOR Code, Description, Unit]
    if (row.length >= 3 && typeof row[0] === "number" && typeof row[2] === "string" && row[2].length > 5 && !row[2].startsWith("DETAIL")) {
      // Find the final rate for this item by scanning ahead
      let rate = 0;
      for (let j = i + 1; j < Math.min(i + 50, rows.length); j++) {
        const lookahead = rows[j];
        if (lookahead.length > 0 && typeof lookahead[0] === "number") break; // Next item
        
        if (lookahead.length >= 4 && typeof lookahead[1] === "string" && lookahead[1].includes("COST OF 1.0000")) {
           rate = lookahead[4] || 0;
           break;
        }
      }
      
      oldItems.push({
        id: String(row[0]),
        sorCode: String(row[1] || ""),
        description: row[2].trim(),
        rate: rate
      });
    }
  }
  
  console.log(`Found ${oldItems.length} main items in the old rate analysis sheet.`);
  
  const rjItems = await prisma.sORItem.findMany({
    where: {
      itemCode: {
        startsWith: "RJ"
      }
    },
    select: {
      id: true,
      itemCode: true,
      description: true,
      rate: true
    }
  });
  
  console.log(`Found ${rjItems.length} RJ items in the database.`);
  console.log("--- Matching Results (Top 20) ---");
  
  const results = [];
  
  for (const oldItem of oldItems) {
    let bestMatch = null;
    let highestScore = 0;
    
    for (const rjItem of rjItems) {
      const score = getSimilarity(oldItem.description, rjItem.description);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = rjItem;
      }
    }
    
    // Only keep decent matches to reduce noise
    if (highestScore > 0.3) {
      results.push({
        oldSorCode: oldItem.sorCode,
        oldDesc: oldItem.description.substring(0, 40),
        oldRate: oldItem.rate,
        rjCode: bestMatch ? bestMatch.itemCode : "None",
        rjRate: bestMatch ? bestMatch.rate : 0,
        score: (highestScore * 100).toFixed(2) + "%"
      });
    }
  }
  
  // Sort by highest score
  results.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  
  console.table(results.slice(0, 20));
}

main().catch(console.error).finally(() => prisma.$disconnect());
