import pkg from "xlsx";
const { readFile, utils } = pkg;

const wb = readFile("C:/Users/PERFECT/Downloads/PRJ-BOQ-R01.xlsx");
console.log("=== SHEETS:", wb.SheetNames, "\n");

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = utils.sheet_to_json(ws, { header: 1, defval: "" });
  console.log(`\n${"=".repeat(60)}`);
  console.log(`SHEET: "${sheetName}" — ${rows.length} rows`);
  console.log("=".repeat(60));

  // Print every non-empty row with index
  rows.forEach((r, i) => {
    const line = JSON.stringify(r);
    if (line !== '["","","","","","","","","","",""]' && line !== '[]' && line.replace(/","/g,"").replace(/["\[\]]/g,"").trim()) {
      console.log(`Row ${String(i).padStart(3)}: ${line}`);
    }
  });

  // Also show merges
  if (ws["!merges"] && ws["!merges"].length > 0) {
    console.log("\nMerged cells:", ws["!merges"].map(m => `${utils.encode_range(m)}`).join(", "));
  }

  // Column widths
  if (ws["!cols"]) {
    console.log("Col widths:", ws["!cols"].map((c,i) => c ? `${String.fromCharCode(65+i)}:${c.wch||c.wpx||"?"}` : null).filter(Boolean).join(", "));
  }
}
