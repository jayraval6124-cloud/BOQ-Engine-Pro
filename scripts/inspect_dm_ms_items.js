const fs = require('fs');
const items = JSON.parse(fs.readFileSync('d:/My Own Software/BOQ Engine Pro/dm_ms_items_structured.json', 'utf8'));

console.log(`=== DISPLAYING ALL ${items.length} ITEMS & SUB-ROWS FROM Dm Ms ===\n`);

items.forEach((item, idx) => {
  console.log(`Item #${idx + 1} [Row ${item.row}]: Code: ${item.code} | Unit: ${item.unit}`);
  console.log(`Desc: ${String(item.desc).slice(0, 100)}`);
  
  const validRows = item.rows.filter(r => r.desc || r.nos || r.L || r.B || r.H || r.qty);
  if (validRows.length > 0) {
    validRows.forEach(r => {
      console.log(`   └─ R${r.row}: "${r.desc}" | Nos: ${r.nos} | L: ${r.L} | B: ${r.B} | H: ${r.H} | Qty: ${r.qty}`);
    });
  } else {
    console.log(`   └─ (No sub-rows)`);
  }
  console.log('');
});
