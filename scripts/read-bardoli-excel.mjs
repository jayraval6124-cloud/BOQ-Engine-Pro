/**
 * Read Bardoli DM Quarter Excel and dump BOQ rows
 * node scripts/read-bardoli-excel.mjs
 */
import { readFile } from "fs/promises";
import { join } from "path";

// Use xlsx (already installed as a dep of many packages, or install separately)
let XLSX;
try {
  XLSX = (await import("xlsx")).default;
} catch {
  console.error("xlsx not found. Run: npm install xlsx");
  process.exit(1);
}

const filePath = "D:\\Office\\DB\\BOQ 2026-27\\Depo Manager Quarters\\Bardoli\\Bardoli DM Quarter Final BOQ - Copy.xlsx";
const buf = await readFile(filePath);
const wb = XLSX.read(buf, { type: "buffer" });

console.log("Sheets:", wb.SheetNames);
console.log("---");

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  console.log(`\n========== SHEET: ${sheetName} (${rows.length} rows) ==========`);
  for (let i = 0; i < Math.min(rows.length, 200); i++) {
    const row = rows[i];
    if (row.every(c => c === "" || c === null || c === undefined)) continue;
    console.log(`R${i+1}: ${JSON.stringify(row)}`);
  }
}
