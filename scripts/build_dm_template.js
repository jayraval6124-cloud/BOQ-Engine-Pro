const fs = require('fs');

const mainRows = JSON.parse(fs.readFileSync('d:/My Own Software/BOQ Engine Pro/main_sheet_rows.json', 'utf8'));
const dmMsRows = JSON.parse(fs.readFileSync('d:/My Own Software/BOQ Engine Pro/dm_ms_rows.json', 'utf8'));

// Extract items from Main Sheet
const boqItemFormulas = [];
mainRows.forEach((r, idx) => {
  if (!r) return;
  const vals = r.map(c => c ? String(c.v || c.w).trim() : '');
  const srNo = vals[0];
  const sorCode = vals[1];
  const desc = vals[2];
  const unit = vals[5] || vals[4] || '';
  
  if (sorCode && sorCode.startsWith('RJ')) {
    boqItemFormulas.push({
      sorCode,
      description: desc,
      unit,
      formula: `${sorCode.toLowerCase()}_qty`,
      sortOrder: boqItemFormulas.length
    });
  }
});

console.log(`Extracted ${boqItemFormulas.length} BOQ items from Main Sheet.`);

// Now analyze Dm Ms rows
let currentItem = null;
const measurementPresets = [];

dmMsRows.forEach((r, idx) => {
  if (!r) return;
  const line = r.map(c => c ? String(c.v || c.w).trim() : '');
  const txt = line.filter(Boolean).join(' ');

  // Detect item header in Dm Ms
  const codeMatch = line.find(c => c && c.startsWith('RJ'));
  if (codeMatch) {
    const itemNoStr = line[0] || '';
    const sorCode = codeMatch;
    const desc = line.find(c => c && c.length > 25 && !c.startsWith('RJ')) || '';
    const unit = line[line.length - 1] || '';
    
    currentItem = {
      gsrtcCode: sorCode,
      description: desc || sorCode,
      unit,
      rows: [],
      sortOrder: measurementPresets.length
    };
    measurementPresets.push(currentItem);
  }
});

console.log(`Extracted ${measurementPresets.length} measurement preset blocks from Dm Ms.`);
fs.writeFileSync('d:/My Own Software/BOQ Engine Pro/dm_summary.json', JSON.stringify({ boqItemFormulas, measurementPresets }, null, 2));
