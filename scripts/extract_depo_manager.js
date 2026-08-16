const xlsx = require('xlsx');
const fs = require('fs');

const path = 'D:/Office/DB/BOQ 2026-27/Depo Manager Quarters/Bardoli/Bardoli DM Quarter Final BOQ - Copy.xlsx';
const wb = xlsx.readFile(path, { cellFormulas: true });

function parseSheet(sheetName) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:Z200');
  const rows = [];
  for (let R = range.s.r; R <= range.e.r; R++) {
    const row = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellRef = xlsx.utils.encode_cell({ r: R, c: C });
      const cell = sheet[cellRef];
      if (cell) {
        row.push({
          ref: cellRef,
          v: cell.v !== undefined ? cell.v : '',
          f: cell.f ? '=' + cell.f : null,
          w: cell.w || ''
        });
      } else {
        row.push(null);
      }
    }
    rows.push(row);
  }
  return rows;
}

const mainSheet = parseSheet('Main Sheet');
const dmMs = parseSheet('Dm Ms');

fs.writeFileSync('d:/My Own Software/BOQ Engine Pro/main_sheet_rows.json', JSON.stringify(mainSheet, null, 2), 'utf8');
fs.writeFileSync('d:/My Own Software/BOQ Engine Pro/dm_ms_rows.json', JSON.stringify(dmMs, null, 2), 'utf8');

console.log('Main Sheet rows:', mainSheet.length);
console.log('Dm Ms rows:', dmMs.length);
