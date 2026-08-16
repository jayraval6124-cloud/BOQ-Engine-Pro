const xlsx = require('xlsx');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const path = 'D:/Office/DB/BOQ 2026-27/Depo Manager Quarters/Bardoli/Bardoli DM Quarter Final BOQ - Copy.xlsx';
const wb = xlsx.readFile(path, { cellFormulas: true });

const mainSheet = wb.Sheets['Main Sheet'];
const dmMsSheet = wb.Sheets['Dm Ms'];

// 1. Parse Main Sheet to get all 66 BOQ Items with exact SOR codes, descriptions, units, and rates
const boqItemsMap = new Map();
const mainRange = xlsx.utils.decode_range(mainSheet['!ref']);

for (let r = mainRange.s.r; r <= mainRange.e.r; r++) {
  const getV = (col) => {
    const cell = mainSheet[col + (r + 1)];
    return cell ? String(cell.v !== undefined ? cell.v : cell.w).trim() : '';
  };
  const srNo = getV('A');
  const sorCode = getV('B');
  const desc = getV('C');
  const qty = parseFloat(getV('D')) || parseFloat(getV('E')) || 0;
  const unit = getV('F') || getV('E') || 'CMT';

  if (sorCode && sorCode.startsWith('RJ') && desc) {
    boqItemsMap.set(sorCode, {
      sorCode,
      description: desc,
      unit,
      qty,
      sortOrder: boqItemsMap.size
    });
  }
}

console.log(`Loaded ${boqItemsMap.size} BOQ items from Main Sheet.`);

// 2. Parse Dm Ms Sheet to extract all measurement groups and sub-rows
const msRange = xlsx.utils.decode_range(dmMsSheet['!ref']);
const measurementPresets = [];
let currentItem = null;

for (let r = msRange.s.r; r <= msRange.e.r; r++) {
  const getCell = (col) => {
    const ref = col + (r + 1);
    const cell = dmMsSheet[ref];
    if (!cell) return null;
    return {
      v: cell.v !== undefined ? cell.v : '',
      f: cell.f ? cell.f : null,
      ref
    };
  };

  const cCell = getCell('C');
  const bCell = getCell('B');
  const dCell = getCell('D');
  const eCell = getCell('E');
  const fCell = getCell('F');
  const gCell = getCell('G');
  const hCell = getCell('H');
  const iCell = getCell('I');

  const cVal = cCell ? String(cCell.v).trim() : '';
  const bVal = bCell ? String(bCell.v).trim() : '';
  const dVal = dCell ? String(dCell.v).trim() : '';

  // Check if this row is an Item Header (SOR Code starting with RJ)
  let sorCode = [bVal, cVal, dVal].find(v => v && v.startsWith('RJ'));
  if (sorCode) {
    const mainInfo = boqItemsMap.get(sorCode) || {};
    currentItem = {
      gsrtcCode: sorCode,
      description: mainInfo.description || dVal || cVal || sorCode,
      unit: mainInfo.unit || (iCell ? String(iCell.v).trim() : 'CMT'),
      sortOrder: measurementPresets.length,
      steelMode: (mainInfo.unit || '').toLowerCase().includes('kg'),
      rows: []
    };
    measurementPresets.push(currentItem);
    continue;
  }

  // If inside an item, check for sub-rows
  if (currentItem) {
    const subDesc = cVal || dVal;
    const nosVal = eCell ? (eCell.f ? `=${eCell.f}` : String(eCell.v)) : '';
    const lVal = fCell ? (fCell.f ? `=${fCell.f}` : String(fCell.v)) : '';
    const bValStr = gCell ? (gCell.f ? `=${gCell.f}` : String(gCell.v)) : '';
    const hValStr = hCell ? (hCell.f ? `=${hCell.f}` : String(hCell.v)) : '';
    const qtyValStr = iCell ? (iCell.f ? `=${iCell.f}` : String(iCell.v)) : '';

    // Ignore summary total / say rows within item presets
    if (subDesc && (subDesc.toLowerCase().includes('total') || subDesc.toLowerCase().includes('say'))) {
      continue;
    }
    if (bValStr && (bValStr.toLowerCase().includes('total') || bValStr.toLowerCase().includes('say'))) {
      continue;
    }

    if (subDesc || lVal || nosVal || qtyValStr) {
      currentItem.rows.push({
        subDesc: subDesc || 'Main Section',
        nosFormula: nosVal || '1',
        lengthFormula: lVal || '0',
        breadthFormula: bValStr || '0',
        heightFormula: hValStr || '0'
      });
    }
  }
}

console.log(`Extracted ${measurementPresets.length} measurement presets with exact sub-rows.`);

// Build parameter list for Depo Manager Quarters
const parameters = [
  { name: "plinth_area", label: "Plinth Area (Ground Floor)", unit: "Sqm", dims: "lxb" },
  { name: "first_floor_area", label: "First Floor Area", unit: "Sqm", dims: "lxb" },
  { name: "floors", label: "No. of Floors", unit: "Nos", dims: "n" },
  { name: "floor_height", label: "Floor Height", unit: "m", dims: "h" },
  { name: "plinth_height", label: "Plinth Height", unit: "m", dims: "h" },
  { name: "wall_length_gf", label: "Wall Length (Ground Floor)", unit: "m", dims: "l" },
  { name: "wall_length_ff", label: "Wall Length (First Floor)", unit: "m", dims: "l" },
  { name: "footing_nos", label: "Footing Nos", unit: "Nos", dims: "n" },
  { name: "footing_size", label: "Footing Size (LxB)", unit: "m", dims: "lxb" },
  { name: "column_size", label: "Column Size (LxB)", unit: "m", dims: "lxb" }
];

// Build BOQ item formulas matching all 66 items
const boqItemFormulas = Array.from(boqItemsMap.values()).map(item => ({
  sorCode: item.sorCode,
  description: item.description,
  unit: item.unit,
  formula: item.sorCode.toLowerCase() + '_qty',
  sortOrder: item.sortOrder
}));

async function seed() {
  const templateData = {
    name: "Depo Manager Quarters",
    buildingType: "RESIDENTIAL",
    workType: "NEW_CONSTRUCTION",
    description: "Depo Manager Quarters (G+1 Residential Quarters) — complete civil, structural, finishes, plumbing, electrical, drainage, water tank, soak pit & site development matching Bardoli BOQ.",
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
    assumptions: { source: "Bardoli DM Quarter Final BOQ - Copy.xlsx" },
    isUserCreated: true,
    isActive: true
  };

  const existing = await prisma.wizardTemplate.findFirst({ where: { name: "Depo Manager Quarters" } });
  if (existing) {
    await prisma.wizardTemplate.update({
      where: { id: existing.id },
      data: templateData
    });
    console.log(`✓ Updated existing WizardTemplate: Depo Manager Quarters (${existing.id})`);
  } else {
    const created = await prisma.wizardTemplate.create({ data: templateData });
    console.log(`✓ Created new WizardTemplate: Depo Manager Quarters (${created.id})`);
  }
}

seed()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
