import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";
import * as fs from "fs";

const DIVISION_FILES: Record<string, string> = {
  "Ahmedabad":   "D:\\Office\\Jay\\Master DTP\\Ahmedabad\\Ahmedabad 2024-25 Master Sheet.xls",
  "Amreli":      "D:\\Office\\Jay\\Master DTP\\Amreli\\Amreli 2024-25 Master Sheet.xls",
  "Bharuch":     "D:\\Office\\Jay\\Master DTP\\Bharuch\\Bharuch 2024-25 Master Sheet.xls",
  "Bhavnagar":   "D:\\Office\\Jay\\Master DTP\\Bhavnagar\\Bhavnagar 2024-25 Master Sheet.xls",
  "Bhuj":        "D:\\Office\\Jay\\Master DTP\\Bhuj\\Bhuj 2024-25 Master Sheet.xls",
  "Godhara":     "D:\\Office\\Jay\\Master DTP\\Godhara\\Godhara 2024-25 Master Sheet.xls",
  "Himmatnagar": "D:\\Office\\Jay\\Master DTP\\Himmatnagar\\Himmatnagar 2024-25 Master Sheet.xls",
  "Jamnagar":    "D:\\Office\\Jay\\Master DTP\\Jamnagar\\Jamnagar 2024-25 Master Sheet.xls",
  "Junagadh":    "D:\\Office\\Jay\\Master DTP\\Junagadh\\Junagadh 2024-25 Master Sheet.xls",
  "Mehsana":     "D:\\Office\\Jay\\Master DTP\\Mehsana\\Mehsana 2024-25 Master Sheet.xls",
  "Nadiad":      "D:\\Office\\Jay\\Master DTP\\Nadiad\\Nadiad 2024-25 Master Sheet.xls",
  "Palanpur":    "D:\\Office\\Jay\\Master DTP\\Palanpur\\Palanpur 2024-25 Master sheet.xls",
  "Rajkot":      "D:\\Office\\Jay\\Master DTP\\Rajkot\\Rajkot 2024-25 Master Sheet.xls",
  "Surat":       "D:\\Office\\Jay\\Master DTP\\Surat\\Surat 2024-25 Master Sheet.xls",
  "Vadodara":    "D:\\Office\\Jay\\Master DTP\\Vadodara\\Vadodara 2024-25 Master Sheet.xls",
  "Valsad":      "D:\\Office\\Jay\\Master DTP\\Valsad\\Valsad 2024-25 Master Sheet .xls",
};

const DIVISIONS = Object.keys(DIVISION_FILES);

function num(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = parseFloat(String(v));
  return isNaN(n) || n === 0 ? null : n;
}

function str(v: unknown): string {
  if (!v || v === 0) return "";
  return String(v).trim();
}

type ParsedItem = {
  itemCode: string; description: string; unit: string; rate: number;
  chapter: string; subChapter: string | null;
  materialDescription: string | null; inputRate: number | null;
  cementConsumption: number | null; steelConsumption: number | null;
  sandRatio: number | null; aggregateRatio: number | null;
  qtyPerTrip: number | null;
  sortOrder: number;
};

function parseFile(filePath: string): ParsedItem[] {
  const buf = fs.readFileSync(filePath);
  const wb  = XLSX.read(buf, { type: "buffer" });
  const items: ParsedItem[] = [];
  let order = 0;

  // Sheet 1: Basic Rate — Sl.No. | Code | Description | Unit | Rate
  const brSheet = wb.Sheets["Basic Rate"];
  if (brSheet) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(brSheet, { header: 1, defval: "" });
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      const code = str(r[1]);
      const desc = str(r[2]);
      const unit = str(r[3]);
      const rate = parseFloat(String(r[4] ?? ""));
      if (!code || !desc || isNaN(rate) || rate <= 0) continue;
      if (code.toLowerCase().includes("to") || code.toLowerCase() === "code") continue;
      items.push({
        itemCode: code, description: desc, unit, rate,
        chapter: "Basic Rate", subChapter: null,
        materialDescription: null, inputRate: null,
        cementConsumption: null, steelConsumption: null,
        sandRatio: null, aggregateRatio: null, qtyPerTrip: null,
        sortOrder: order++,
      });
    }
  }

  // Master Sheet — row 1: title, row 2: blank, row 3: headers, row 4+: data
  // Col: 0=No 1=ItemCode 2=SORCode 3=TypeOfWork 4=Description 5=Qty 6=Unit
  //      7=RateRs 8=MatCode 9=MatDesc 10=MatQty 11=MatUnit 12=InputRate
  //      13=CementConsumption 14=SteelConsumption 15=SandRatio 16=AggregateRatio
  const msSheet = wb.Sheets["Master Sheet"];
  if (msSheet) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(msSheet, { header: 1, defval: "" });
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      const code = str(r[1]);
      const desc = str(r[4]);
      const unit = str(r[6]);
      const rate = parseFloat(String(r[7] ?? ""));
      if (!code || !desc || isNaN(rate) || rate <= 0) continue;
      if (code === "Item Code" || code === "No") continue;
      items.push({
        itemCode:            code,
        description:         desc,
        unit,
        rate,
        chapter:             str(r[3]) || "General",
        subChapter:          str(r[2]) || null,
        materialDescription: str(r[9])  || null,
        inputRate:           num(r[12]),
        cementConsumption:   num(r[13]),
        steelConsumption:    num(r[14]),
        sandRatio:           num(r[15]),
        aggregateRatio:      num(r[16]),
        qtyPerTrip:          num(r[17]),
        sortOrder:           order++,
      });
    }
  }

  return items;
}

async function importDivision(division: string, sorYear: string) {
  const filePath = DIVISION_FILES[division];
  if (!fs.existsSync(filePath)) {
    return { imported: 0, updated: 0, errors: 0, skipped: true };
  }

  const items = parseFile(filePath);

  // Fetch all existing itemCodes for this division+year in one query
  const existing = await prisma.sORItem.findMany({
    where: { division, sorYear },
    select: { id: true, itemCode: true },
  });
  const existingMap = new Map(existing.map((e) => [e.itemCode, e.id]));

  const toCreate: ParsedItem[] = [];
  const toUpdate: (ParsedItem & { id: string })[] = [];

  for (const item of items) {
    const existId = existingMap.get(item.itemCode);
    if (existId) toUpdate.push({ ...item, id: existId });
    else         toCreate.push(item);
  }

  let imported = 0, updated = 0, errors = 0;

  // Batch insert new items
  if (toCreate.length) {
    try {
      const result = await prisma.sORItem.createMany({
        data: toCreate.map((item) => ({
          itemCode: item.itemCode, description: item.description,
          unit: item.unit, rate: item.rate,
          division, sorYear,
          chapter: item.chapter, subChapter: item.subChapter,
          materialDescription: item.materialDescription,
          inputRate:          item.inputRate,
          cementConsumption:  item.cementConsumption,
          steelConsumption:   item.steelConsumption,
          sandRatio:          item.sandRatio,
          aggregateRatio:     item.aggregateRatio,
          qtyPerTrip:         item.qtyPerTrip,
          sortOrder:          item.sortOrder,
        })),
        skipDuplicates: true,
      });
      imported = result.count;
    } catch (err) {
      console.error(`[SOR Import] createMany error for ${division}:`, err);
      errors++;
    }
  }

  // Batch update existing items in chunks of 50
  const CHUNK = 50;
  for (let start = 0; start < toUpdate.length; start += CHUNK) {
    const chunk = toUpdate.slice(start, start + CHUNK);
    try {
      await prisma.$transaction(
        chunk.map((item) =>
          prisma.sORItem.update({
            where: { id: item.id },
            data: {
              description:         item.description,
              unit:                item.unit,
              rate:                item.rate,
              chapter:             item.chapter,
              subChapter:          item.subChapter,
              materialDescription: item.materialDescription,
              inputRate:           item.inputRate,
              cementConsumption:   item.cementConsumption,
              steelConsumption:    item.steelConsumption,
              sandRatio:           item.sandRatio,
              aggregateRatio:      item.aggregateRatio,
              qtyPerTrip:          item.qtyPerTrip,
              sortOrder:           item.sortOrder,
              isActive:            true,
            },
          }),
        ),
      );
      updated += chunk.length;
    } catch (err) {
      console.error(`[SOR Import] update chunk error for ${division}:`, err);
      errors += chunk.length;
    }
  }

  return { imported, updated, errors, skipped: false };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as { division: string; sorYear?: string };
    const division = body.division?.trim();
    const sorYear  = body.sorYear?.trim() || "2024-25";

    const importAll = division === "__ALL__";
    const divisions = importAll ? DIVISIONS : [division];

    if (!importAll && !DIVISION_FILES[division]) {
      return NextResponse.json({ error: `Unknown division: ${division}` }, { status: 400 });
    }

    let totalImported = 0, totalUpdated = 0, totalErrors = 0;
    const results: Record<string, { imported: number; updated: number; errors: number }> = {};

    for (const div of divisions) {
      const r = await importDivision(div, sorYear);
      results[div] = { imported: r.imported, updated: r.updated, errors: r.errors };
      totalImported += r.imported;
      totalUpdated  += r.updated;
      totalErrors   += r.errors;
    }

    return NextResponse.json({ imported: totalImported, updated: totalUpdated, errors: totalErrors, results });
  } catch (err) {
    console.error("[SOR Local Import] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET — return available divisions
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = Object.entries(DIVISION_FILES).map(([div, path]) => ({
    division: div, exists: fs.existsSync(path), path,
  }));
  return NextResponse.json(status);
}
