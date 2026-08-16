import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();

// Simple Jaccard similarity for string matching
function getSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/));
  const set2 = new Set(str2.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

async function main() {
  const filePath = "C:/Users/PERFECT/Downloads/Rate_Analysis_1785258376235.xlsx";
  
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }

  console.log("Reading file:", filePath);
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  
  // Read as JSON, assuming first row is header
  const rows: any[] = xlsx.utils.sheet_to_json(ws);
  
  const oldItems: { itemNo: string, description: string }[] = [];
  
  for (const row of rows) {
    const itemNo = row["Item No."] || row["Item No"];
    const description = row["Description"];
    
    if (itemNo && description) {
      oldItems.push({
        itemNo: String(itemNo).trim(),
        description: String(description).trim()
      });
    }
  }
  
  console.log(`Found ${oldItems.length} main items in the old rate analysis sheet.`);
  
  // Fetch our RJ items from the DB
  const rjItems = await prisma.sORItem.findMany({
    where: {
      itemCode: {
        startsWith: "RJ"
      }
    },
    select: {
      id: true,
      itemCode: true,
      description: true
    }
  });
  
  console.log(`Found ${rjItems.length} RJ items in the database.`);
  console.log("--- Matching Results ---");
  
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
    
    results.push({
      oldItemNo: oldItem.itemNo,
      oldDescription: oldItem.description.substring(0, 50) + "...",
      bestMatchCode: bestMatch ? bestMatch.itemCode : "None",
      bestMatchDesc: bestMatch ? bestMatch.description.substring(0, 50) + "..." : "None",
      score: (highestScore * 100).toFixed(2) + "%"
    });
  }
  
  console.table(results);
}

main().catch(console.error).finally(() => prisma.$disconnect());
