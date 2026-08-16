const fs = require('fs');
const dmMsRows = JSON.parse(fs.readFileSync('d:/My Own Software/BOQ Engine Pro/dm_ms_rows.json', 'utf8'));

const parsedItems = [];
let currentItem = null;

for (let r = 0; r < dmMsRows.length; r++) {
  const row = dmMsRows[r];
  if (!row) continue;

  const rowVals = row.map(c => c ? String(c.v !== undefined ? c.v : '').trim() : '');
  const rowFormulas = row.map(c => c && c.f ? String(c.f) : '');

  // Look for Item No / GSRTC code
  const codeIdx = rowVals.findIndex(v => v.startsWith('RJ'));
  if (codeIdx !== -1) {
    const code = rowVals[codeIdx];
    const desc = rowVals.find((v, idx) => idx !== codeIdx && v.length > 15) || code;
    const unit = rowVals[rowVals.length - 1] || rowVals[rowVals.length - 2] || '';
    
    currentItem = {
      sorCode: code,
      description: desc,
      unit,
      subRows: []
    };
    parsedItems.push(currentItem);
    continue;
  }

  // If inside an item, check if this row has measurement numbers (nos, L, B, H, Qty)
  if (currentItem) {
    const textDesc = rowVals.find(v => v && isNaN(v) && v.length > 1 && !v.includes('Total') && !v.includes('Qty') && !v.includes('Item'));
    const numbers = rowVals.filter(v => v && !isNaN(v) && v !== '0');
    
    if (textDesc || numbers.length > 0) {
      // Extract Nos, L, B, H, Qty
      const subDesc = textDesc || '';
      const nos = rowVals[3] || rowVals[2] || '1';
      const length = rowVals[4] || rowVals[3] || '0';
      const breadth = rowVals[5] || rowVals[4] || '0';
      const height = rowVals[6] || rowVals[5] || '0';
      const qty = rowVals[7] || rowVals[6] || '0';

      if (subDesc || parseFloat(length) > 0 || parseFloat(qty) > 0) {
        currentItem.subRows.push({
          subDesc,
          nosFormula: nos,
          lengthFormula: length,
          breadthFormula: breadth,
          heightFormula: height,
          qty
        });
      }
    }
  }
}

fs.writeFileSync('d:/My Own Software/BOQ Engine Pro/parsed_dm_items.json', JSON.stringify(parsedItems, null, 2), 'utf8');
console.log('Parsed items count:', parsedItems.length);
