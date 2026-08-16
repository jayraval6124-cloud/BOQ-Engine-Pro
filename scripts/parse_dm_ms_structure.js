const xlsx = require('xlsx');
const fs = require('fs');

const path = 'D:/Office/DB/BOQ 2026-27/Depo Manager Quarters/Bardoli/Bardoli DM Quarter Final BOQ - Copy.xlsx';
const wb = xlsx.readFile(path, { cellFormulas: true });

const sheet = wb.Sheets['Dm Ms'];
const range = xlsx.utils.decode_range(sheet['!ref']);

const items = [];
let currentItem = null;

for (let r = range.s.r; r <= range.e.r; r++) {
  const getVal = (colLetter) => {
    const cellRef = colLetter + (r + 1);
    const cell = sheet[cellRef];
    if (!cell) return null;
    return { v: cell.v, f: cell.f ? '=' + cell.f : null, ref: cellRef };
  };

  const cCol = getVal('C');
  const bCol = getVal('B');
  const dCol = getVal('D');
  const eCol = getVal('E');
  const fCol = getVal('F');
  const gCol = getVal('G');
  const hCol = getVal('H');
  const iCol = getVal('I');

  // Check for item header (e.g. Item No in B or C, RJ code in C or D)
  const allText = [bCol, cCol, dCol].filter(Boolean).map(x => String(x.v)).join(' ');
  if (allText.includes('RJ') || (bCol && !isNaN(bCol.v) && parseFloat(bCol.v) > 0 && cCol && String(cCol.v).includes('RJ'))) {
    currentItem = {
      row: r + 1,
      itemNo: bCol ? bCol.v : '',
      code: cCol ? cCol.v : '',
      desc: dCol ? dCol.v : '',
      unit: iCol ? iCol.v : (hCol ? hCol.v : ''),
      rows: []
    };
    items.push(currentItem);
    continue;
  }

  // If inside an item, capture sub-rows
  if (currentItem) {
    const subDesc = cCol ? cCol.v : (dCol ? dCol.v : null);
    if (subDesc || eCol || fCol || gCol || hCol) {
      currentItem.rows.push({
        row: r + 1,
        desc: subDesc ? String(subDesc).trim() : '',
        nos: eCol ? (eCol.f || eCol.v) : '',
        L: fCol ? (fCol.f || fCol.v) : '',
        B: gCol ? (gCol.f || gCol.v) : '',
        H: hCol ? (hCol.f || hCol.v) : '',
        qty: iCol ? (iCol.f || iCol.v) : ''
      });
    }
  }
}

console.log('Found Items count:', items.length);
fs.writeFileSync('d:/My Own Software/BOQ Engine Pro/dm_ms_items_structured.json', JSON.stringify(items, null, 2), 'utf8');
