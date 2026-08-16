import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateBOQNo } from "@/lib/utils";

// POST /api/boq/[id]/duplicate
// Body: { projectId?: string, name?: string }
// Copies all BOQ items (codes, descriptions, units, rates, quantities) to a new BOQ.
// Attaches to the same project by default; pass projectId to assign to a different project.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const source = await prisma.bOQ.findFirst({
    where: { id, deletedAt: null },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const targetProjectId: string = body.projectId || source.projectId;
  const newName: string = body.name || `${source.name} (Copy)`;

  const revCount  = await prisma.bOQ.count({ where: { projectId: targetProjectId } });
  const revisionNo = revCount + 1;

  const totalAmount = source.items.reduce((s, i) => s + Number(i.amount ?? 0), 0);
  const grandTotal  = Number(source.grandTotal) > 0 ? Number(source.grandTotal) : totalAmount;

  const newBOQ = await prisma.bOQ.create({
    data: {
      projectId:   targetProjectId,
      boqNo:       generateBOQNo("PRJ", revisionNo),
      name:        newName,
      subWork:     source.subWork,
      revisionNo,
      includeGST:  source.includeGST,
      gstPercent:  source.gstPercent,
      totalAmount,
      gstAmount:   Number(source.gstAmount ?? 0),
      grandTotal,
      notes:       source.notes ?? undefined,
      breakdown:   source.breakdown ?? undefined,
      createdById: session.user.id,
      items: {
        create: source.items.map((item, i) => ({
          sorItemId:     item.sorItemId    ?? undefined,
          itemCode:      item.itemCode     ?? undefined,
          gsrtcCode:     item.gsrtcCode    ?? undefined,
          description:   item.description,
          unit:          item.unit,
          quantity:      Number(item.quantity),
          rate:          Number(item.rate),
          amount:        Number(item.amount ?? 0),
          chapter:       item.chapter      ?? undefined,
          elementLabel:  item.elementLabel ?? undefined,
          isManualEntry: item.isManualEntry,
          remarks:       item.remarks      ?? undefined,
          sortOrder:     i,
        })),
      },
    },
  });

  return NextResponse.json({ id: newBOQ.id, boqNo: newBOQ.boqNo, name: newBOQ.name }, { status: 201 });
}
