import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { generateBOQNo } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  projectId:          z.string().min(1),
  measurementSheetId: z.string().optional(),
  name:               z.string().min(1),
  subWork:            z.string().optional().default("Civil"),
  includeGST:         z.boolean().default(false),
  gstPercent:         z.number().optional(),
  notes:              z.string().optional(),
  breakdown:          z.record(z.union([z.number(), z.null()])).optional(),
  items: z.array(z.object({
    measurementRowId: z.string().optional(),
    sorItemId:        z.string().optional(),
    itemCode:         z.string().optional(),
    gsrtcCode:        z.string().optional(),
    description:      z.string().default(""),
    unit:             z.string().default("Nos"),
    quantity:         z.number().min(0).default(0),
    rate:             z.number().min(0).default(0),
    chapter:          z.string().optional(),
    elementLabel:     z.string().optional(),
    isManualEntry:    z.boolean().default(false),
    remarks:          z.string().optional(),
    sheetQtys:        z.record(z.any()).optional(),
  })),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const where: Record<string, unknown> = { deletedAt: null };
  if (projectId) where.projectId = projectId;

  const boqs = await prisma.bOQ.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { name: true, projectNo: true, sorDivision: true, sorYear: true } },
      createdBy: { select: { name: true } },
      _count: { select: { items: true } },
      items: { select: { amount: true } },
    },
  });

  // Compute live totals from items (grandTotal in DB may be stale)
  const result = boqs.map(({ items, ...b }) => {
    const computedTotal = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);
    return {
      ...b,
      grandTotal: computedTotal > 0 ? computedTotal : Number(b.grandTotal),
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = createSchema.parse(body);

    const revCount = await prisma.bOQ.count({ where: { projectId: data.projectId } });
    const revisionNo = revCount + 1;

    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const gstAmount   = data.includeGST && data.gstPercent ? totalAmount * (data.gstPercent / 100) : 0;
    // If a breakdown is provided, grandTotal = Net Estimated Amount; otherwise fall back to totalAmount + GST
    const grandTotal  = data.breakdown?.netEstimated ?? (totalAmount + gstAmount);

    const boq = await prisma.bOQ.create({
      data: {
        projectId:          data.projectId,
        measurementSheetId: data.measurementSheetId,
        boqNo:              generateBOQNo(`PRJ`, revisionNo),
        name:               data.name,
        subWork:            data.subWork,
        revisionNo,
        includeGST:         data.includeGST,
        gstPercent:         data.gstPercent,
        totalAmount,
        gstAmount,
        grandTotal,
        notes:              data.notes,
        breakdown:          data.breakdown ?? undefined,
        createdById:        session.user.id,
        items: {
          create: data.items.map((item, i) => ({
            measurementRowId: item.measurementRowId,
            sorItemId:        item.sorItemId,
            itemCode:         item.itemCode,
            gsrtcCode:        item.gsrtcCode,
            description:      item.description,
            unit:             item.unit,
            quantity:         item.quantity,
            rate:             item.rate,
            amount:           item.quantity * item.rate,
            chapter:          item.chapter,
            elementLabel:     item.elementLabel,
            isManualEntry:    item.isManualEntry,
            remarks:          item.remarks,
            sheetQtys:        item.sheetQtys ?? undefined,
            sortOrder:        i,
          })),
        },
      },
    });

    // Generate Abstract
    const chapterWise: Record<string, number> = {};
    const elementWise: Record<string, number> = {};
    data.items.forEach((item) => {
      const ch = item.chapter || "Uncategorized";
      const el = item.elementLabel || "General";
      chapterWise[ch] = (chapterWise[ch] || 0) + item.quantity * item.rate;
      elementWise[el] = (elementWise[el] || 0) + item.quantity * item.rate;
    });

    await prisma.abstract.upsert({
      where: { boqId: boq.id },
      update: { chapterWise, elementWise, workTypeWise: {}, grandTotal },
      create: { boqId: boq.id, chapterWise, elementWise, workTypeWise: {}, grandTotal },
    });

    await logAudit({
      userId: session.user.id,
      projectId: data.projectId,
      action: "BOQ_GENERATED",
      entity: "BOQ",
      entityId: boq.id,
      description: `BOQ "${boq.name}" generated with ${data.items.length} items. Grand Total: ₹${grandTotal.toFixed(2)}`,
    });

    // Return only plain scalars — avoids Prisma Decimal serialization issues
    return NextResponse.json({
      id:         boq.id,
      boqNo:      boq.boqNo,
      name:       boq.name,
      revisionNo: boq.revisionNo,
      projectId:  boq.projectId,
      grandTotal: Number(boq.grandTotal),
    }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      console.error("[BOQ POST] Validation error:", msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[BOQ POST] Error:", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
