const xlsx = require('xlsx');
const fs = require('fs');

const path = 'D:/Office/DB/BOQ 2026-27/Depo Manager Quarters/Bardoli/Bardoli DM Quarter Final BOQ - Copy.xlsx';
const wb = xlsx.readFile(path, { cellFormulas: true });

function analyzeSheet(sheetName) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  console.log(`\n--- Analyzing ${sheetName} (Rows: ${rows.length}) ---`);
  return rows;
}

const dmMsRows = analyzeSheet('Dm Ms');
const mainSheetRows = analyzeSheet('Main Sheet');

// Let's print non-empty rows of Main Sheet to see item descriptions & GSRTC codes
console.log('\n=== MAIN SHEET ITEMS ===');
mainSheetRows.forEach((r, idx) => {
  const line = r.filter(Boolean).slice(0, 7).join(' || ');
  if (line.length > 5) {
    console.log(`L${idx + 1}: ${line}`);
  }
});
