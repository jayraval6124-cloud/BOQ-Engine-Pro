const xlsx = require('xlsx');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const path = 'D:/Office/DB/BOQ 2026-27/Depo Manager Quarters/Bardoli/Bardoli DM Quarter Final BOQ - Copy.xlsx';
const wb = xlsx.readFile(path, { cellFormulas: true });

const mainSheet = wb.Sheets['Main Sheet'];
const dmMsSheet = wb.Sheets['Dm Ms'];

// 1. Extract exact BOQ Items & Quantities from Main Sheet
const mainRange = xlsx.utils.decode_range(mainSheet['!ref']);
const boqItemsList = [];
const sorQtyMap = {};

for (let r = mainRange.s.r; r <= mainRange.e.r; r++) {
  const getV = (col) => {
    const cell = mainSheet[col + (r + 1)];
    return cell ? String(cell.v !== undefined ? cell.v : cell.w).trim() : '';
  };

  const sorCode = getV('B');
  const desc = getV('C');
  const qtyVal = parseFloat(getV('D')) || parseFloat(getV('E')) || 0;
  const unit = getV('F') || getV('E') || 'CMT';

  if (sorCode && sorCode.startsWith('RJ') && desc) {
    sorQtyMap[sorCode] = qtyVal;
    boqItemsList.push({
      sorCode,
      description: desc,
      unit,
      qty: qtyVal,
      sortOrder: boqItemsList.length
    });
  }
}

console.log(`Extracted ${boqItemsList.length} items from Main Sheet.`);

// 2. Extract Measurement Presets with cell.v evaluated values from Dm Ms Sheet
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

  let sorCode = [bVal, cVal, dVal].find(v => v && v.startsWith('RJ'));
  if (sorCode) {
    const mainInfo = boqItemsList.find(b => b.sorCode === sorCode) || {};
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

  if (currentItem) {
    const subDesc = cVal || dVal;
    
    // Evaluate exact numbers from cell.v
    const parseNum = (cell, fallback) => {
      if (!cell) return fallback;
      const num = parseFloat(cell.v);
      return !isNaN(num) && num > 0 ? num : fallback;
    };

    const nosNum = parseNum(eCell, 1);
    const lNum = parseNum(fCell, 0);
    const bNum = parseNum(gCell, 0);
    const hNum = parseNum(hCell, 0);
    const qtyNum = parseNum(iCell, 0);

    // Skip total/say rows
    if (subDesc && (subDesc.toLowerCase().includes('total') || subDesc.toLowerCase().includes('say'))) continue;

    if (subDesc || lNum > 0 || qtyNum > 0) {
      // Build dynamic formula expression scaling with plinth_area (base 110 Sqm)
      const scaleExpr = "(plinth_area_l > 0 ? plinth_area_l / 110 : 1)";
      
      let nosFormula = String(nosNum);
      let lengthFormula = lNum > 0 ? `(${lNum} * ${scaleExpr})` : (qtyNum > 0 ? `(${qtyNum} * ${scaleExpr})` : "1");
      let breadthFormula = bNum > 0 ? String(bNum) : "0";
      let heightFormula = hNum > 0 ? String(hNum) : "0";

      // If unit is Kg (steel mode), steel weight formula
      if (currentItem.steelMode) {
        lengthFormula = `(${qtyNum || 1} * ${scaleExpr})`;
        breadthFormula = "1";
        heightFormula = "0";
      }

      currentItem.rows.push({
        subDesc: subDesc || "Building Component",
        nosFormula,
        lengthFormula,
        breadthFormula,
        heightFormula
      });
    }
  }
}

// Fallback: for any item in boqItemsList that didn't get sub-rows, add a clean default row using Excel quantity
boqItemsList.forEach((bItem) => {
  let preset = measurementPresets.find(m => m.gsrtcCode === bItem.sorCode);
  if (!preset) {
    preset = {
      gsrtcCode: bItem.sorCode,
      description: bItem.description,
      unit: bItem.unit,
      sortOrder: measurementPresets.length,
      steelMode: (bItem.unit || '').toLowerCase().includes('kg'),
      rows: []
    };
    measurementPresets.push(preset);
  }
  if (preset.rows.length === 0) {
    const baseQty = bItem.qty > 0 ? bItem.qty : 1;
    const scaleExpr = "(plinth_area_l > 0 ? plinth_area_l / 110 : 1)";
    preset.rows.push({
      subDesc: "Main Work",
      nosFormula: "1",
      lengthFormula: `(${baseQty} * ${scaleExpr})`,
      breadthFormula: "0",
      heightFormula: "0"
    });
  }
});

console.log(`Final Measurement Presets count: ${measurementPresets.length}`);

// Parameters
const parameters = [
  { name: "plinth_area", label: "Plinth Area (Ground Floor)", unit: "Sqm", dims: "lxb" },
  { name: "floors", label: "No. of Floors", unit: "Nos", dims: "n" },
  { name: "floor_height", label: "Floor Height", unit: "m", dims: "h" },
  { name: "plinth_height", label: "Plinth Height", unit: "m", dims: "h" }
];

// BOQ item formulas (fallback to sorQtyMap scaling with plinth_area if meas sheet not set)
const boqItemFormulas = boqItemsList.map((item) => {
  const baseQty = item.qty > 0 ? item.qty : 1;
  return {
    sorCode: item.sorCode,
    description: item.description,
    unit: item.unit,
    formula: `(${baseQty} * (plinth_area_l > 0 ? plinth_area_l / 110 : 1))`,
    sortOrder: item.sortOrder
  };
});

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
    console.log(`✓ Updated WizardTemplate: Depo Manager Quarters (${existing.id})`);
  } else {
    const created = await prisma.wizardTemplate.create({ data: templateData });
    console.log(`✓ Created WizardTemplate: Depo Manager Quarters (${created.id})`);
  }
}

seed()
  .catch(e => { console.error("Seed error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
