import { PrismaClient, ElementType, FormulaType, WorkType, BuildingType, KBItemType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Default user
  const adminPassword = await bcrypt.hash("admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@boqpro.com" },
    update: {},
    create: {
      email: "admin@boqpro.com",
      name: "System Administrator",
      password: adminPassword,
    },
  });

  // Personal profile for default user
  await prisma.personalProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      firmName: "PWD Gujarat",
      engineerName: "System Administrator",
      designation: "Chief Engineer",
      address: "Block No. 14, New Sachivalaya",
      city: "Gandhinagar",
      state: "Gujarat",
      pincode: "382010",
      phone: "+91 79 2325 0000",
      email: "pwd@gujarat.gov.in",
      defaultDistrict: "Ahmedabad",
      defaultSORYear: "2024-25",
    },
  });

  console.log("  ✓ Default user created: admin@boqpro.com / admin@123");

  // SOR Items - Gujarat SOR 2024
  const sorItems = [
    // Chapter 2 - Earthwork
    { itemCode: "2.1.1", description: "Excavation in foundation trenches in all kinds of soil excluding rock", unit: "Cum", rate: 185.00, chapter: "Chapter 2 - Earthwork", subChapter: "2.1 Excavation in Foundation" },
    { itemCode: "2.1.2", description: "Excavation in foundation trenches in hard rock by blasting", unit: "Cum", rate: 620.00, chapter: "Chapter 2 - Earthwork", subChapter: "2.1 Excavation in Foundation" },
    { itemCode: "2.2.1", description: "Filling in plinth with earth from excavation", unit: "Cum", rate: 125.00, chapter: "Chapter 2 - Earthwork", subChapter: "2.2 Filling" },
    { itemCode: "2.2.2", description: "Filling with sand under floors including watering and ramming", unit: "Cum", rate: 890.00, chapter: "Chapter 2 - Earthwork", subChapter: "2.2 Filling" },
    { itemCode: "2.3.1", description: "Disposal of excavated earth within 50m lead", unit: "Cum", rate: 45.00, chapter: "Chapter 2 - Earthwork", subChapter: "2.3 Disposal" },
    // Chapter 3 - Concrete Work
    { itemCode: "3.1.1", description: "PCC M10 using stone aggregate 40mm nominal size", unit: "Cum", rate: 4850.00, chapter: "Chapter 3 - Concrete Work", subChapter: "3.1 PCC" },
    { itemCode: "3.1.2", description: "PCC M15 using stone aggregate 20mm nominal size", unit: "Cum", rate: 5420.00, chapter: "Chapter 3 - Concrete Work", subChapter: "3.1 PCC" },
    { itemCode: "3.2.1", description: "RCC M20 in foundation footings including shuttering", unit: "Cum", rate: 7850.00, chapter: "Chapter 3 - Concrete Work", subChapter: "3.2 RCC" },
    { itemCode: "3.2.2", description: "RCC M20 in columns including shuttering", unit: "Cum", rate: 8950.00, chapter: "Chapter 3 - Concrete Work", subChapter: "3.2 RCC" },
    { itemCode: "3.2.3", description: "RCC M20 in beams and lintels including shuttering", unit: "Cum", rate: 8650.00, chapter: "Chapter 3 - Concrete Work", subChapter: "3.2 RCC" },
    { itemCode: "3.2.4", description: "RCC M20 in slabs including shuttering", unit: "Cum", rate: 8250.00, chapter: "Chapter 3 - Concrete Work", subChapter: "3.2 RCC" },
    { itemCode: "3.2.5", description: "RCC M25 in columns including shuttering", unit: "Cum", rate: 9850.00, chapter: "Chapter 3 - Concrete Work", subChapter: "3.2 RCC" },
    // Chapter 4 - Reinforcement
    { itemCode: "4.1.1", description: "Reinforcement steel HYSD bars Fe415 including binding wire", unit: "MT", rate: 68500.00, chapter: "Chapter 4 - Reinforcement", subChapter: "4.1 Steel Reinforcement" },
    { itemCode: "4.1.2", description: "Reinforcement steel Fe500 TMT bars including binding wire", unit: "MT", rate: 71000.00, chapter: "Chapter 4 - Reinforcement", subChapter: "4.1 Steel Reinforcement" },
    // Chapter 5 - Brickwork
    { itemCode: "5.1.1", description: "Brick masonry in CM 1:6 in foundation and plinth", unit: "Cum", rate: 4250.00, chapter: "Chapter 5 - Masonry Work", subChapter: "5.1 Brick Masonry" },
    { itemCode: "5.1.2", description: "Brick masonry in CM 1:4 in superstructure", unit: "Cum", rate: 4650.00, chapter: "Chapter 5 - Masonry Work", subChapter: "5.1 Brick Masonry" },
    { itemCode: "5.1.3", description: "Half brick masonry in CM 1:4", unit: "Sqm", rate: 580.00, chapter: "Chapter 5 - Masonry Work", subChapter: "5.1 Brick Masonry" },
    // Chapter 6 - Plastering
    { itemCode: "6.1.1", description: "Cement plaster 12mm thick CM 1:4 on walls internal", unit: "Sqm", rate: 185.00, chapter: "Chapter 6 - Finishing", subChapter: "6.1 Plastering" },
    { itemCode: "6.1.2", description: "Cement plaster 15mm thick CM 1:4 on walls external", unit: "Sqm", rate: 220.00, chapter: "Chapter 6 - Finishing", subChapter: "6.1 Plastering" },
    { itemCode: "6.1.3", description: "Cement plaster 12mm thick CM 1:3 on ceiling", unit: "Sqm", rate: 210.00, chapter: "Chapter 6 - Finishing", subChapter: "6.1 Plastering" },
    // Chapter 7 - Flooring
    { itemCode: "7.1.1", description: "Vitrified tile flooring 600x600mm thick in CM 1:3", unit: "Sqm", rate: 850.00, chapter: "Chapter 7 - Flooring", subChapter: "7.1 Tile Flooring" },
    { itemCode: "7.1.2", description: "Ceramic tile flooring 300x300mm in CM 1:3", unit: "Sqm", rate: 620.00, chapter: "Chapter 7 - Flooring", subChapter: "7.1 Tile Flooring" },
    { itemCode: "7.2.1", description: "Marble flooring 18mm thick on CM 1:3 bed", unit: "Sqm", rate: 1850.00, chapter: "Chapter 7 - Flooring", subChapter: "7.2 Marble/Stone Flooring" },
    // Chapter 8 - Doors and Windows
    { itemCode: "8.1.1", description: "Panelled teak wood door frame 75x100mm section", unit: "Rmt", rate: 1250.00, chapter: "Chapter 8 - Doors & Windows", subChapter: "8.1 Door Frames" },
    { itemCode: "8.1.2", description: "Flush door shutter 35mm thick commercial ply", unit: "Sqm", rate: 1850.00, chapter: "Chapter 8 - Doors & Windows", subChapter: "8.1 Door Shutters" },
    { itemCode: "8.2.1", description: "Aluminium window frame anodized with glass panes", unit: "Sqm", rate: 2850.00, chapter: "Chapter 8 - Doors & Windows", subChapter: "8.2 Windows" },
    // Chapter 9 - Painting
    { itemCode: "9.1.1", description: "Exterior emulsion paint two coats on plastered surface", unit: "Sqm", rate: 85.00, chapter: "Chapter 9 - Painting", subChapter: "9.1 Emulsion Paint" },
    { itemCode: "9.1.2", description: "Interior emulsion paint two coats on plastered surface", unit: "Sqm", rate: 75.00, chapter: "Chapter 9 - Painting", subChapter: "9.1 Emulsion Paint" },
    // Chapter 10 - Roads
    { itemCode: "10.1.1", description: "Gravel / WBM road making 150mm compacted thickness", unit: "Sqm", rate: 285.00, chapter: "Chapter 10 - Roads", subChapter: "10.1 WBM" },
    { itemCode: "10.2.1", description: "Bituminous macadam 75mm compacted thickness", unit: "Sqm", rate: 685.00, chapter: "Chapter 10 - Roads", subChapter: "10.2 Bituminous" },
  ];

  for (const item of sorItems) {
    await prisma.sORItem.upsert({
      where: { itemCode_division_sorYear: { itemCode: item.itemCode, division: "Ahmedabad", sorYear: "2024-25" } },
      update: { rate: item.rate },
      create: {
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        rate: item.rate,
        division: "Ahmedabad",
        sorYear: "2024-25",
        chapter: item.chapter,
        subChapter: item.subChapter,
      },
    });
  }

  console.log(`  ✓ ${sorItems.length} SOR items`);

  // Element Templates
  const elementTemplates = [
    {
      name: "Footing",
      type: ElementType.SUBSTRUCTURE,
      description: "Foundation footing work including excavation and concrete",
      items: [
        { description: "Excavation in foundation trenches", unit: "Cum", formulaType: "VOLUME", defaultFormula: "L * B * D * Nos", sorCode: "2.1.1" },
        { description: "PCC M10 bed concrete", unit: "Cum", formulaType: "VOLUME", defaultFormula: "L * B * 0.075 * Nos", sorCode: "3.1.1" },
        { description: "RCC M20 in footings", unit: "Cum", formulaType: "VOLUME", defaultFormula: "L * B * D * Nos", sorCode: "3.2.1" },
        { description: "Steel reinforcement HYSD Fe415", unit: "MT", formulaType: "WEIGHT", defaultFormula: "qty * 0.08", sorCode: "4.1.1" },
        { description: "Backfilling in plinth", unit: "Cum", formulaType: "VOLUME", defaultFormula: "excav_vol - rcc_vol", sorCode: "2.2.1" },
        { description: "Disposal of excess earth", unit: "Cum", formulaType: "VOLUME", defaultFormula: "excav_vol * 0.3", sorCode: "2.3.1" },
      ],
    },
    {
      name: "Column",
      type: ElementType.SUPERSTRUCTURE,
      description: "RCC columns with reinforcement and shuttering",
      items: [
        { description: "RCC M20 in columns", unit: "Cum", formulaType: "VOLUME", defaultFormula: "L * B * H * Nos", sorCode: "3.2.2" },
        { description: "Steel reinforcement Fe415", unit: "MT", formulaType: "WEIGHT", defaultFormula: "qty * 0.12", sorCode: "4.1.1" },
      ],
    },
    {
      name: "Plinth Beam",
      type: ElementType.SUBSTRUCTURE,
      description: "Plinth beam connecting footings",
      items: [
        { description: "RCC M20 in plinth beams", unit: "Cum", formulaType: "VOLUME", defaultFormula: "L * B * H * Nos", sorCode: "3.2.3" },
        { description: "Steel reinforcement Fe415", unit: "MT", formulaType: "WEIGHT", defaultFormula: "qty * 0.10", sorCode: "4.1.1" },
      ],
    },
    {
      name: "Beam",
      type: ElementType.SUPERSTRUCTURE,
      description: "RCC beams and lintels",
      items: [
        { description: "RCC M20 in beams and lintels", unit: "Cum", formulaType: "VOLUME", defaultFormula: "L * B * H * Nos", sorCode: "3.2.3" },
        { description: "Steel reinforcement Fe415", unit: "MT", formulaType: "WEIGHT", defaultFormula: "qty * 0.10", sorCode: "4.1.1" },
      ],
    },
    {
      name: "Slab",
      type: ElementType.SUPERSTRUCTURE,
      description: "RCC roof and floor slabs",
      items: [
        { description: "RCC M20 in slabs", unit: "Cum", formulaType: "VOLUME", defaultFormula: "L * B * H * Nos", sorCode: "3.2.4" },
        { description: "Steel reinforcement Fe415", unit: "MT", formulaType: "WEIGHT", defaultFormula: "qty * 0.085", sorCode: "4.1.1" },
      ],
    },
    {
      name: "Brickwork",
      type: ElementType.SUPERSTRUCTURE,
      description: "Brick masonry walls",
      items: [
        { description: "Brick masonry CM 1:4 in superstructure", unit: "Cum", formulaType: "VOLUME", defaultFormula: "L * H * B * Nos", sorCode: "5.1.2" },
      ],
    },
    {
      name: "Plaster",
      type: ElementType.FINISHING,
      description: "Cement plaster on walls and ceiling",
      items: [
        { description: "Internal wall plaster 12mm CM 1:4", unit: "Sqm", formulaType: "AREA", defaultFormula: "L * H * Nos", sorCode: "6.1.1" },
        { description: "External wall plaster 15mm CM 1:4", unit: "Sqm", formulaType: "AREA", defaultFormula: "L * H * Nos", sorCode: "6.1.2" },
        { description: "Ceiling plaster 12mm CM 1:3", unit: "Sqm", formulaType: "AREA", defaultFormula: "L * B * Nos", sorCode: "6.1.3" },
      ],
    },
    {
      name: "Flooring",
      type: ElementType.FINISHING,
      description: "Floor tile and marble work",
      items: [
        { description: "Vitrified tile flooring 600x600mm", unit: "Sqm", formulaType: "AREA", defaultFormula: "L * B * Nos", sorCode: "7.1.1" },
      ],
    },
    {
      name: "Door",
      type: ElementType.FINISHING,
      description: "Door frames and shutters",
      items: [
        { description: "Teak wood door frame 75x100mm", unit: "Rmt", formulaType: "LENGTH", defaultFormula: "(2*H + B) * Nos", sorCode: "8.1.1" },
        { description: "Flush door shutter 35mm thick", unit: "Sqm", formulaType: "AREA", defaultFormula: "B * H * Nos", sorCode: "8.1.2" },
      ],
    },
    {
      name: "Window",
      type: ElementType.FINISHING,
      description: "Aluminium windows with glass",
      items: [
        { description: "Aluminium window with glass panes", unit: "Sqm", formulaType: "AREA", defaultFormula: "B * H * Nos", sorCode: "8.2.1" },
      ],
    },
    {
      name: "Compound Wall",
      type: ElementType.EXTERNAL_WORKS,
      description: "Boundary compound wall with foundation",
      items: [
        { description: "Excavation for compound wall foundation", unit: "Cum", formulaType: "VOLUME", defaultFormula: "L * 0.6 * 0.9", sorCode: "2.1.1" },
        { description: "PCC M10 bed for compound wall", unit: "Cum", formulaType: "VOLUME", defaultFormula: "L * 0.6 * 0.15", sorCode: "3.1.1" },
        { description: "Brick masonry CM 1:6 in foundation", unit: "Cum", formulaType: "VOLUME", defaultFormula: "L * 0.45 * 0.9", sorCode: "5.1.1" },
        { description: "Brick masonry CM 1:4 in superstructure", unit: "Cum", formulaType: "VOLUME", defaultFormula: "L * 0.23 * H", sorCode: "5.1.2" },
        { description: "Plaster on compound wall both sides", unit: "Sqm", formulaType: "AREA", defaultFormula: "L * H * 2", sorCode: "6.1.2" },
      ],
    },
    {
      name: "Road Work",
      type: ElementType.ROADS,
      description: "Road construction including sub-base and surface",
      items: [
        { description: "Gravel WBM road 150mm thickness", unit: "Sqm", formulaType: "AREA", defaultFormula: "L * B", sorCode: "10.1.1" },
        { description: "Bituminous macadam 75mm thickness", unit: "Sqm", formulaType: "AREA", defaultFormula: "L * B", sorCode: "10.2.1" },
      ],
    },
  ];

  for (const tmpl of elementTemplates) {
    const created = await prisma.elementTemplate.upsert({
      where: { name: tmpl.name },
      update: {},
      create: {
        name: tmpl.name,
        type: tmpl.type,
        description: tmpl.description,
      },
    });

    for (let i = 0; i < tmpl.items.length; i++) {
      const item = tmpl.items[i];
      const sorItem = item.sorCode
        ? await prisma.sORItem.findFirst({ where: { itemCode: item.sorCode } })
        : null;

      const existing = await prisma.elementItem.findFirst({
        where: { elementTemplateId: created.id, description: item.description },
      });
      if (!existing) {
        await prisma.elementItem.create({
          data: {
            elementTemplateId: created.id,
            sorItemId: sorItem?.id,
            description: item.description,
            unit: item.unit,
            formulaType: item.formulaType,
            defaultFormula: item.defaultFormula,
            sortOrder: i,
          },
        });
      }
    }
  }

  console.log(`  ✓ ${elementTemplates.length} element templates`);

  // Formulas
  const formulas = [
    { name: "Volume (L×B×D×Nos)", expression: "L * B * D * Nos", variables: ["L", "B", "D", "Nos"], type: FormulaType.VOLUME, unit: "Cum", description: "Standard volume calculation" },
    { name: "Area (L×B×Nos)", expression: "L * B * Nos", variables: ["L", "B", "Nos"], type: FormulaType.AREA, unit: "Sqm", description: "Standard area calculation" },
    { name: "Length (L×Nos)", expression: "L * Nos", variables: ["L", "Nos"], type: FormulaType.LENGTH, unit: "Rmt", description: "Running meter calculation" },
    { name: "Wall Area (L×H×Nos)", expression: "L * H * Nos", variables: ["L", "H", "Nos"], type: FormulaType.AREA, unit: "Sqm", description: "Wall area calculation" },
    { name: "Steel Weight (Dia²/162×L×Nos)", expression: "(Dia * Dia / 162) * L * Nos", variables: ["Dia", "L", "Nos"], type: FormulaType.WEIGHT, unit: "Kg", description: "Steel bar weight formula" },
    { name: "Door Frame Perimeter", expression: "(2 * H + B) * Nos", variables: ["H", "B", "Nos"], type: FormulaType.LENGTH, unit: "Rmt", description: "Door frame perimeter" },
    { name: "Triangular Area", expression: "0.5 * B * H * Nos", variables: ["B", "H", "Nos"], type: FormulaType.AREA, unit: "Sqm", description: "Triangular area" },
    { name: "Circular Area (π×r²×Nos)", expression: "3.14159 * R * R * Nos", variables: ["R", "Nos"], type: FormulaType.AREA, unit: "Sqm", description: "Circular area calculation" },
    { name: "Circular Volume (π×r²×H×Nos)", expression: "3.14159 * R * R * H * Nos", variables: ["R", "H", "Nos"], type: FormulaType.VOLUME, unit: "Cum", description: "Circular/cylindrical volume" },
  ];

  for (const f of formulas) {
    await prisma.formula.upsert({
      where: { id: `formula-${f.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}` },
      update: {},
      create: {
        id: `formula-${f.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`,
        name: f.name,
        expression: f.expression,
        variables: f.variables,
        type: f.type,
        unit: f.unit,
        description: f.description,
        isSystem: true,
      },
    });
  }

  console.log(`  ✓ ${formulas.length} formulas`);

  // Sample Project
  await prisma.project.upsert({
    where: { projectNo: "PRJ-2024-001" },
    update: {},
    create: {
      projectNo: "PRJ-2024-001",
      name: "Construction of Primary Health Centre",
      sorDivision: "Ahmedabad",
      sorYear: "2024-25",
      status: "ACTIVE",
      createdById: admin.id,
    },
  });

  console.log("  ✓ Sample project");

  // Wizard Templates
  const wizardTemplates = [
    {
      id: "wiz-residential",
      name: "Residential Building",
      buildingType: BuildingType.RESIDENTIAL,
      workType: WorkType.NEW_CONSTRUCTION,
      description: "Standard residential building with RCC framed structure, brick walls, plaster, flooring, and basic MEP services.",
      icon: "🏠",
      parameters: [
        { name: "plinthArea", label: "Plinth Area", unit: "Sqm", defaultValue: 100 },
        { name: "floors", label: "No. of Floors", unit: "", defaultValue: 2 },
        { name: "floorHeight", label: "Floor Height", unit: "m", defaultValue: 3.0 },
        { name: "wallLength", label: "Total Wall Length", unit: "m", defaultValue: 40 },
      ],
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
        { elementName: "Compound Wall", elementType: "EXTERNAL_WORKS", isRequired: false, sortOrder: 11 },
      ],
      assumptions: { note: "Standard Gujarat PWD specifications apply", wallThickness: "230mm", concreteMix: "M20" },
    },
    {
      id: "wiz-school",
      name: "School Building",
      buildingType: BuildingType.INSTITUTIONAL,
      workType: WorkType.NEW_CONSTRUCTION,
      description: "Primary/secondary school building with classrooms, staff rooms, toilets, and compound.",
      icon: "🏫",
      parameters: [
        { name: "classrooms", label: "No. of Classrooms", unit: "", defaultValue: 6 },
        { name: "plinthArea", label: "Plinth Area", unit: "Sqm", defaultValue: 400 },
        { name: "floors", label: "No. of Floors", unit: "", defaultValue: 2 },
        { name: "floorHeight", label: "Floor Height", unit: "m", defaultValue: 3.2 },
      ],
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
        { elementName: "Compound Wall", elementType: "EXTERNAL_WORKS", isRequired: true, sortOrder: 11 },
        { elementName: "Road Work", elementType: "EXTERNAL_WORKS", isRequired: false, sortOrder: 12 },
      ],
      assumptions: { note: "As per SSA / RMSA norms", toiletBlocks: "separate for boys/girls" },
    },
    {
      id: "wiz-health-centre",
      name: "Primary Health Centre",
      buildingType: BuildingType.INSTITUTIONAL,
      workType: WorkType.NEW_CONSTRUCTION,
      description: "Primary health centre with OPD, wards, pharmacy, laboratory, and residential quarters.",
      icon: "🏥",
      parameters: [
        { name: "plinthArea", label: "Plinth Area", unit: "Sqm", defaultValue: 600 },
        { name: "floors", label: "No. of Floors", unit: "", defaultValue: 1 },
        { name: "floorHeight", label: "Floor Height", unit: "m", defaultValue: 3.5 },
        { name: "wardBeds", label: "Ward Beds", unit: "", defaultValue: 10 },
      ],
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
        { elementName: "Compound Wall", elementType: "EXTERNAL_WORKS", isRequired: true, sortOrder: 11 },
        { elementName: "Road Work", elementType: "EXTERNAL_WORKS", isRequired: false, sortOrder: 12 },
      ],
      assumptions: { note: "As per NHM specifications" },
    },
    {
      id: "wiz-depo-manager",
      name: "Depo Manager Quarters",
      buildingType: BuildingType.RESIDENTIAL,
      workType: WorkType.NEW_CONSTRUCTION,
      description: "Standard Depo Manager Quarters (G+1 residential quarters) with complete civil, finishing, plumbing, drainage, termite treatment & site development.",
      icon: "🏠",
      parameters: [
        { name: "plinth_area", label: "Plinth Area", unit: "Sqm", dims: "lxb" },
        { name: "floors", label: "No. of Floors", unit: "Nos", dims: "n" },
        { name: "floor_height", label: "Floor Height", unit: "m", dims: "h" },
        { name: "plinth_height", label: "Plinth Height", unit: "m", dims: "h" },
      ],
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
        { elementName: "Compound Wall", elementType: "EXTERNAL_WORKS", isRequired: false, sortOrder: 11 },
      ],
      assumptions: { note: "As per GSRTC / PWD specifications" },
    },
    {
      id: "wiz-compound-wall",
      name: "Compound Wall",
      buildingType: BuildingType.INFRASTRUCTURE,
      workType: WorkType.NEW_CONSTRUCTION,
      description: "RCC / Brick compound wall with gates and pillars.",
      icon: "🧱",
      parameters: [
        { name: "length", label: "Wall Length", unit: "m", defaultValue: 100 },
        { name: "height", label: "Wall Height", unit: "m", defaultValue: 1.8 },
        { name: "wallThickness", label: "Wall Thickness", unit: "m", defaultValue: 0.23 },
      ],
      elementConfig: [
        { elementName: "Footing", elementType: "SUBSTRUCTURE", isRequired: true, sortOrder: 1 },
        { elementName: "Compound Wall", elementType: "EXTERNAL_WORKS", isRequired: true, sortOrder: 2 },
        { elementName: "Plaster", elementType: "FINISHING", isRequired: false, sortOrder: 3 },
      ],
      assumptions: { pillarsEvery: "3m c/c", gateColumns: "RCC M20" },
    },
    {
      id: "wiz-road",
      name: "Road Work",
      buildingType: BuildingType.INFRASTRUCTURE,
      workType: WorkType.NEW_CONSTRUCTION,
      description: "Flexible pavement road with earthwork, WBM, and bituminous surface.",
      icon: "🛣️",
      parameters: [
        { name: "length", label: "Road Length", unit: "m", defaultValue: 500 },
        { name: "width", label: "Road Width", unit: "m", defaultValue: 6 },
        { name: "subbaseDepth", label: "Subbase Depth", unit: "m", defaultValue: 0.15 },
        { name: "wbmDepth", label: "WBM Depth", unit: "m", defaultValue: 0.075 },
      ],
      elementConfig: [
        { elementName: "Road Work", elementType: "ROADS", isRequired: true, sortOrder: 1 },
      ],
      assumptions: { note: "IRC specifications applicable", shoulderWidth: "1m each side" },
    },
    {
      id: "wiz-commercial",
      name: "Commercial Building",
      buildingType: BuildingType.COMMERCIAL,
      workType: WorkType.NEW_CONSTRUCTION,
      description: "Commercial building with shops/offices, RCC framed structure, and modern finishes.",
      icon: "🏬",
      parameters: [
        { name: "plinthArea", label: "Plinth Area", unit: "Sqm", defaultValue: 500 },
        { name: "floors", label: "No. of Floors", unit: "", defaultValue: 4 },
        { name: "floorHeight", label: "Floor Height", unit: "m", defaultValue: 3.5 },
      ],
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
      ],
      assumptions: { note: "As per local development plan norms" },
    },
    {
      id: "wiz-renovation",
      name: "Building Renovation",
      buildingType: BuildingType.RESIDENTIAL,
      workType: WorkType.RENOVATION,
      description: "Renovation of existing building including structural repairs, plaster, flooring, and painting.",
      icon: "🔧",
      parameters: [
        { name: "builtUpArea", label: "Built-up Area", unit: "Sqm", defaultValue: 150 },
        { name: "wallLength", label: "Wall Length", unit: "m", defaultValue: 30 },
      ],
      elementConfig: [
        { elementName: "Plaster", elementType: "FINISHING", isRequired: true, sortOrder: 1 },
        { elementName: "Flooring", elementType: "FINISHING", isRequired: true, sortOrder: 2 },
        { elementName: "Door", elementType: "FINISHING", isRequired: false, sortOrder: 3 },
        { elementName: "Window", elementType: "FINISHING", isRequired: false, sortOrder: 4 },
      ],
      assumptions: { note: "Demolition items to be added separately" },
    },
    {
      id: "wiz-drainage",
      name: "Drainage / Storm Water",
      buildingType: BuildingType.INFRASTRUCTURE,
      workType: WorkType.NEW_CONSTRUCTION,
      description: "Storm water drain and drainage channel with NPC pipes and manholes.",
      icon: "🚰",
      parameters: [
        { name: "length", label: "Drain Length", unit: "m", defaultValue: 200 },
        { name: "depth", label: "Drain Depth", unit: "m", defaultValue: 1.0 },
        { name: "width", label: "Drain Width", unit: "m", defaultValue: 0.45 },
      ],
      elementConfig: [
        { elementName: "Drainage", elementType: "DRAINAGE", isRequired: true, sortOrder: 1 },
      ],
      assumptions: { pipeClass: "NP3", manholeSpacing: "30m c/c" },
    },
  ];

  for (const wt of wizardTemplates) {
    await prisma.wizardTemplate.upsert({
      where: { id: wt.id },
      update: { parameters: wt.parameters, elementConfig: wt.elementConfig },
      create: {
        id: wt.id,
        name: wt.name,
        buildingType: wt.buildingType,
        workType: wt.workType,
        description: wt.description,
        icon: wt.icon,
        parameters: wt.parameters,
        elementConfig: wt.elementConfig,
        assumptions: wt.assumptions,
        isActive: true,
        usageCount: 0,
      },
    });
  }

  console.log(`  ✓ ${wizardTemplates.length} wizard templates`);

  // Knowledge Base
  const kbItems = [
    {
      id: "kb-rcc-m20",
      title: "RCC M20 — Mix Design & Specifications",
      content: `RCC M20 mix (1:1.5:3) specifications as per IS 456:2000:\n\n- Cement: 53 Grade OPC or PPC\n- Water-Cement Ratio: Max 0.55\n- Min Cement Content: 300 kg/m³\n- Characteristic strength: 20 N/mm²\n- Cover: 40mm (footings), 30mm (columns), 25mm (slabs)\n\nCuring: Minimum 14 days water curing.`,
      type: "SPECIFICATION",
      tags: ["concrete", "M20", "RCC", "IS456"],
      chapter: "Chapter 3 - Concrete Work",
    },
    {
      id: "kb-steel-formula",
      title: "Steel Weight Calculation Formula",
      content: `Weight (kg) = (Dia² / 162) × Length × Nos\n\nExamples:\n- 12mm dia × 6m × 10 bars = 53.33 kg\n- 16mm dia × 3m × 8 bars = 37.99 kg\n\nFormula expression: (Dia * Dia / 162) * L * Nos`,
      type: "FORMULA_GUIDE",
      tags: ["steel", "reinforcement", "weight", "formula"],
      chapter: "Chapter 3 - Concrete Work",
    },
    {
      id: "kb-earthwork",
      title: "Earthwork Excavation — Measurement Rules",
      content: `As per IS 1200 (Part I):\n\n1. Measured as net volume in Cum\n2. Working space allowance: 300mm beyond concrete face\n3. Classification: Ordinary soil / Hard soil / Soft rock / Hard rock\n4. Backfilling = Excavated volume - Structural volume`,
      type: "SPECIFICATION",
      tags: ["earthwork", "excavation", "IS1200", "measurement"],
      chapter: "Chapter 2 - Earthwork",
    },
  ];

  for (const kb of kbItems) {
    await prisma.knowledgeBaseItem.upsert({
      where: { id: kb.id },
      update: {},
      create: {
        id: kb.id,
        title: kb.title,
        content: kb.content,
        type: kb.type as KBItemType,
        tags: kb.tags,
        chapter: kb.chapter,
        isGlobal: true,
        createdById: admin.id,
      },
    });
  }

  console.log(`  ✓ ${kbItems.length} knowledge base items`);
  console.log("✅ Database seeded successfully!");
  console.log("\n📋 Login credentials:");
  console.log("  Email:    admin@boqpro.com");
  console.log("  Password: admin@123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
