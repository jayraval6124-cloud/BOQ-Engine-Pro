const xlsx = require('xlsx');
const fs = require('fs');

const path = 'D:/Office/DB/BOQ 2026-27/Depo Manager Quarters/Bardoli/Bardoli DM Quarter Final BOQ - Copy.xlsx';
const wb = xlsx.readFile(path, { cellFormulas: true });

const sheet = wb.Sheets['Dm Ms'];
const range = xlsx.utils.decode_range(sheet['!ref']);

let output = '=== DEPO MANAGER MEASUREMENT SHEET (Dm Ms) FULL DETAILS ===\n\n';

for (let r = range.s.r; r <= range.e.r; r++) {
  const rowCells = [];
  let hasContent = false;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellRef = xlsx.utils.encode_cell({ r, c });
    const cell = sheet[cellRef];
    if (cell) {
      hasContent = true;
      const formula = cell.f ? `[F: =${cell.f}]` : '';
      const val = cell.v !== undefined ? cell.v : '';
      rowCells.push(`${cellRef}: ${val} ${formula}`);
    } else {
      rowCells.push('');
    }
  }
  if (hasContent) {
    output += `Row ${r + 1}: ${rowCells.filter(Boolean).join(' | ')}\n`;
  }
}

fs.writeFileSync('d:/My Own Software/BOQ Engine Pro/dm_ms_full_inspect.txt', output, 'utf8');
console.log('Saved full Dm Ms inspection. Total lines:', output.split('\n').length);
