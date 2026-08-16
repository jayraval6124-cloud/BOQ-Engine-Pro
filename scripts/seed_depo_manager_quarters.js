const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

const mainRows = JSON.parse(fs.readFileSync('d:/My Own Software/BOQ Engine Pro/main_sheet_rows.json', 'utf8'));
const parsedItems = JSON.parse(fs.readFileSync('d:/My Own Software/BOQ Engine Pro/parsed_dm_items.json', 'utf8'));

async function main() {
  console.log('--- Seeding Depo Manager Quarters Wizard Template ---');

  // Define minimal parameters
  const parameters = [
    { name: "plinth_area", label: "Plinth Area", unit: "Sqm", dims: "lxb" },
    { name: "floors", label: "No. of Floors", unit: "Nos", dims: "n" },
    { name: "floor_height", label: "Floor Height", unit: "m", dims: "h" },
    { name: "plinth_height", label: "Plinth Height", unit: "m", dims: "h" }
  ];

  // Extract all 66 BOQ items from Main Sheet
  const boqItemFormulas = [];
  mainRows.forEach((r, idx) => {
    if (!r) return;
    const vals = r.map(c => c ? String(c.v !== undefined ? c.v : c.w).trim() : '');
    const sorCode = vals[1];
    const desc = vals[2];
    const qtyVal = parseFloat(vals[3]) || parseFloat(vals[4]) || 0;
    const unit = vals[5] || vals[4] || 'CMT';

    if (sorCode && sorCode.startsWith('RJ') && desc) {
      boqItemFormulas.push({
        sorCode,
        description: desc,
        unit,
        formula: sorCode.toLowerCase() + '_qty',
        sortOrder: boqItemFormulas.length
      });
    }
  });

  // Extract measurement presets
  const measurementPresets = parsedItems.map((item, idx) => {
    const validSubRows = item.subRows && item.subRows.length > 0 ? item.subRows.map(sr => ({
      subDesc: sr.subDesc || 'Building Structure',
      nosFormula: sr.nosFormula && !isNaN(sr.nosFormula) ? sr.nosFormula : '1',
      lengthFormula: sr.lengthFormula && !isNaN(sr.lengthFormula) ? sr.lengthFormula : 'plinth_area_l',
      breadthFormula: sr.breadthFormula && !isNaN(sr.breadthFormula) ? sr.breadthFormula : '1',
      heightFormula: sr.heightFormula && !isNaN(sr.heightFormula) ? sr.heightFormula : '1'
    })) : [{
      subDesc: 'Main Section',
      nosFormula: '1',
      lengthFormula: 'plinth_area_l',
      breadthFormula: '1',
      heightFormula: '1'
    }];

    return {
      gsrtcCode: item.sorCode,
      description: item.description,
      unit: item.unit || 'CMT',
      sortOrder: idx,
      steelMode: item.unit === 'Kg.',
      rows: validSubRows
    };
  });

  const templateData = {
    name: "Depo Manager Quarters",
    buildingType: "RESIDENTIAL",
    workType: "NEW_CONSTRUCTION",
    description: "Standard Depo Manager Quarters (G+1 residential quarters) with complete civil, finishing, plumbing, drainage, termite treatment & site development.",
    icon: "🏠",
    parameters,
    boqItemFormulas,
    measurementPresets,
    elementConfig: [
      { elementName: "Footing", elementType: "SUBSTRUCTURE", isRequired: true, sortOrder: 1 },
      { elementName: "Plinth Beam", elementType: "SUBSTRUCTURE", isRequired: true, sortOrder: 2 },
      { elementName: "Column", elementType: "SUPERSTRUCTURE", isRequired: true, sortOrder: 3 },
      { elementName: "Beam", elementType: "SUPERSTRUCTURE", isRequired: true, sortOrder: 4 },
      { elementName: "Slab", elementType: "SUPERSTRUCTURE", isRequired: true, sortOrder: 5 },
      { elementName: "Brickwork", elementType: "SUPERSTRUCTURE", isRequired: true, sortOrder: 6 },
      { elementName: "Plaster", elementType: "FINISHING", isRequired: true, sortOrder: 7 },
      { elementName: "Flooring", elementType: "FINISHING", isRequired: true, sortOrder: 8 },
      { elementName: "Door", elementType: "FINISHING", isRequired: true, sortOrder: 9 },
      { elementName: "Window", elementType: "FINISHING", isRequired: true, sortOrder: 10 },
      { elementName: "Compound Wall", elementType: "EXTERNAL_WORKS", isRequired: false, sortOrder: 11 }
    ],
    assumptions: { note: "Gujarat GSRTC / PWD Standard Specifications for Depo Manager Quarters" },
    isUserCreated: true,
    isActive: true
  };

  const existing = await prisma.wizardTemplate.findFirst({ where: { name: "Depo Manager Quarters" } });
  if (existing) {
    await prisma.wizardTemplate.update({
      where: { id: existing.id },
      data: templateData
    });
    console.log(`✓ Updated existing template: Depo Manager Quarters (ID: ${existing.id})`);
  } else {
    const created = await prisma.wizardTemplate.create({ data: templateData });
    console.log(`✓ Created new template: Depo Manager Quarters (ID: ${created.id})`);
  }
}

main()
  .catch(e => { console.error('Error seeding Depo Manager Quarters template:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
