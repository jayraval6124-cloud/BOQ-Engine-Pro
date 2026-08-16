import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateRowsFromAssembly, generateRowsFromElementTemplate } from "@/lib/auto-measure";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: measurementSheetId } = await params;
  const body = await req.json();
  const { assemblyId, elementTemplateId, projectElementId, dimensions, label } = body;

  const sheet = await prisma.measurementSheet.findUnique({ where: { id: measurementSheetId } });
  if (!sheet) return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
  if (sheet.status === "LOCKED") return NextResponse.json({ error: "Sheet is locked" }, { status: 400 });

  let rows;
  if (assemblyId) {
    rows = await generateRowsFromAssembly(assemblyId, dimensions || {});
  } else if (elementTemplateId) {
    rows = await generateRowsFromElementTemplate(elementTemplateId, dimensions || {});
  } else {
    return NextResponse.json({ error: "assemblyId or elementTemplateId required" }, { status: 400 });
  }

  // Get current max sortOrder
  const existing = await prisma.measurementRow.findMany({
    where: { measurementSheetId },
    select: { sortOrder: true, serialNo: true },
    orderBy: { sortOrder: "desc" },
    take: 1,
  });

  const baseSort = (existing[0]?.sortOrder ?? 0) + 1;
  const baseSerial = (existing[0]?.serialNo ?? 0) + 1;

  // Insert header row first if label provided
  const toInsert = [];
  if (label) {
    toInsert.push({
      measurementSheetId,
      projectElementId: projectElementId || null,
      serialNo: baseSerial,
      description: label,
      nos: null,
      length: null,
      breadth: null,
      height: null,
      quantity: 0,
      unit: "",
      isHeader: true,
      sortOrder: baseSort,
    });
  }

  rows.forEach((row, idx) => {
    toInsert.push({
      measurementSheetId,
      projectElementId: projectElementId || null,
      sorItemId: row.sorItemId || null,
      serialNo: baseSerial + (label ? 1 : 0) + idx,
      description: row.description,
      nos: row.nos,
      length: row.length,
      breadth: row.breadth,
      height: row.height,
      quantity: row.quantity,
      unit: row.unit,
      formulaExpr: row.formulaExpr,
      remarks: row.remarks,
      sortOrder: baseSort + (label ? 1 : 0) + idx,
    });
  });

  const created = await prisma.measurementRow.createMany({ data: toInsert });

  return NextResponse.json({ inserted: created.count, rows: toInsert });
}
