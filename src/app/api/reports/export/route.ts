import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateBOQExcel } from "@/lib/exports/excel-export";
import { generateBOQPDF } from "@/lib/exports/pdf-export";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const boqId  = searchParams.get("boqId");
  const format = searchParams.get("format") || "excel";

  if (!boqId) return NextResponse.json({ error: "boqId required" }, { status: 400 });

  const [boq, profile] = await Promise.all([
    prisma.bOQ.findFirst({
      where: { id: boqId },
      include: {
        project: { select: { name: true, projectNo: true, sorDivision: true, sorYear: true } },
        createdBy: { select: { name: true } },
        items: { orderBy: [{ sortOrder: "asc" }] },
      },
    }),
    prisma.personalProfile.findFirst({ where: { userId: session.user.id } }),
  ]);

  if (!boq) return NextResponse.json({ error: "BOQ not found" }, { status: 404 });

  // Collect all measurement sheet IDs referenced across BOQ items
  const sheetIdSet = new Set<string>();
  for (const item of boq.items) {
    const sq = item.sheetQtys as Record<string, { sheetName: string; qty: number }> | null;
    if (sq) Object.keys(sq).forEach((sid) => sheetIdSet.add(sid));
  }

  // Fetch measurement sheets with their rows (for formula-linked export)
  const measurementSheets = sheetIdSet.size > 0
    ? await prisma.measurementSheet.findMany({
        where: { id: { in: [...sheetIdSet] }, deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          rows: {
            where: { isHeader: false },
            orderBy: [{ itemNo: "asc" }, { sortOrder: "asc" }],
            select: {
              itemNo: true, gsrtcCode: true, description: true,
              nos: true, length: true, breadth: true, height: true,
              quantity: true, unit: true,
            },
          },
        },
      })
    : [];

  const firmName = profile?.firmName || "BOQ Engine Pro";

  const breakdown = boq.breakdown as {
    totalRs: number; welfareCess: number; tenderAmount: number; gst18: number;
    totalWithGST: number; contingency5: number; workContingency2: number;
    estimatedAmount: number; netEstimated: number;
  } | null;

  const exportData = {
    boqNo:      boq.boqNo,
    name:       boq.name,
    revisionNo: boq.revisionNo,
    subWork:    boq.subWork ?? "Civil",
    project: {
      name:        boq.project.name,
      clientName:  firmName,
      district:    boq.project.sorDivision || "",
      sorDivision: boq.project.sorDivision || "",
      sorYear:     boq.project.sorYear,
      company:     { name: firmName },
    },
    createdBy:   boq.createdBy,
    createdAt:   boq.createdAt,
    totalAmount: Number(boq.totalAmount),
    gstAmount:   Number(boq.gstAmount),
    grandTotal:  Number(boq.grandTotal),
    includeGST:  boq.includeGST,
    gstPercent:  boq.gstPercent ? Number(boq.gstPercent) : undefined,
    breakdown:   breakdown ?? undefined,
    measurementSheets: measurementSheets.map((s) => ({
      id:   s.id,
      name: s.name,
      rows: s.rows.map((r) => ({
        itemNo:      r.itemNo,
        gsrtcCode:   r.gsrtcCode || "",
        description: r.description,
        nos:         r.nos    !== null ? Number(r.nos)    : null,
        length:      r.length !== null ? Number(r.length) : null,
        breadth:     r.breadth!== null ? Number(r.breadth): null,
        height:      r.height !== null ? Number(r.height) : null,
        quantity:    Number(r.quantity),
        unit:        r.unit,
      })),
    })),
    items: boq.items.map((i) => ({
      gsrtcCode:    i.gsrtcCode  || undefined,
      itemCode:     i.itemCode   || undefined,
      chapter:      i.chapter    || undefined,
      description:  i.description,
      unit:         i.unit,
      quantity:     Number(i.quantity),
      rate:         Number(i.rate),
      amount:       Number(i.amount),
      isManualEntry: i.isManualEntry,
      sheetQtys:    (i.sheetQtys as Record<string, { sheetName: string; qty: number }> | null) ?? undefined,
    })),
  };

  await logAudit({
    userId:      session.user.id,
    projectId:   boq.projectId,
    action:      "REPORT_EXPORTED",
    entity:      "BOQ",
    entityId:    boqId,
    description: `BOQ "${boq.name}" exported as ${format.toUpperCase()}`,
  });

  if (format === "excel") {
    const buffer = await generateBOQExcel(exportData);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${boq.boqNo}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const pdfBytes = await generateBOQPDF(exportData as Parameters<typeof generateBOQPDF>[0]);
    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${boq.boqNo}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
