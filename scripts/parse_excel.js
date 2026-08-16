const xlsx = require('xlsx');
const fs = require('fs');

const path = 'D:/Office/DB/BOQ 2026-27/Depo Manager Quarters/Bardoli/Bardoli DM Quarter Final BOQ - Copy.xlsx';
const wb = xlsx.readFile(path, { cellFormulas: true });

let log = '';

wb.SheetNames.forEach(sheetName => {
  log += `\n=========================================\nSHEET: ${sheetName}\n=========================================\n`;
  const sheet = wb.Sheets[sheetName];
  const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:Z100');
  
  for (let R = range.s.r; R <= range.e.r; R++) {
    const rowStr = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellRef = xlsx.utils.encode_cell({ r: R, c: C });
      const cell = sheet[cellRef];
      if (cell) {
        const val = cell.f ? `=${cell.f}` : String(cell.v);
        rowStr.push(`[${cellRef}] ${val}`);
      }
    }
    if (rowStr.length > 0) {
      log += `Row ${R + 1}: ` + rowStr.join(' | ') + '\n';
    }
  }
});

fs.writeFileSync('d:/My Own Software/BOQ Engine Pro/excel_parsed.txt', log);
console.log('Saved parsed excel to d:/My Own Software/BOQ Engine Pro/excel_parsed.txt. Total length:', log.length);
