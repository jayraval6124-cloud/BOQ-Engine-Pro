import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/boq/[id]/refresh
// Re-derives BOQ item quantities from the project's measurement sheets (by GSRTC code),
// then updates amounts and totalAmount on the BOQ.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const boq = await prisma.bOQ.findFirst({
    where: { id, deletedAt: null },
    include: {
      items: { orderBy: [{ sortOrder: "asc" }] },
      project: { select: { id: true } },
    },
  });
  if (!boq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (boq.status === "LOCKED") return NextResponse.json({ error: "BOQ is locked" }, { status: 400 });

  // Aggregate measurement rows for this project by gsrtcCode
  const measRows = await prisma.measurementRow.findMany({
    where: {
      measurementSheet: { projectId: boq.project.id, deletedAt: null },
      isHeader: false,
      gsrtcCode: { not: null },
    },
    select: { gsrtcCode: true, itemNo: true, quantity: true, measurementSheetId: true },
  });

  // Sum quantities per gsrtcCode (per-item deduplicated sum across sheets)
  // First: per sheet, group by itemNo to get one qty per item
  type SheetItem = { qty: number; code: string };
  const perSheet = new Map<string, Map<string, SheetItem>>();
  for (const row of measRows) {
    const code = row.gsrtcCode!;
    const sheetId = row.measurementSheetId;
    if (!perSheet.has(sheetId)) perSheet.set(sheetId, new Map());
    const sheetMap = perSheet.get(sheetId)!;
    const itemKey = `${row.itemNo}::${code}`;
    const prev = sheetMap.get(itemKey);
    sheetMap.set(itemKey, { code, qty: (prev?.qty ?? 0) + Number(row.quantity) });
  }

  // Accumulate across sheets
  const codeQtyMap = new Map<string, number>();
  perSheet.forEach((sheetMap) => {
    sheetMap.forEach(({ code, qty }) => {
      codeQtyMap.set(code, (codeQtyMap.get(code) ?? 0) + qty);
    });
  });

  // Update each BOQ item that has a gsrtcCode match
  let updatedCount = 0;
  let newTotal = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of boq.items) {
      const code = item.gsrtcCode || (item as Record<string, unknown>).itemCode as string | undefined;
      const newQty = code ? codeQtyMap.get(code) : undefined;

      if (newQty !== undefined) {
        const rate = Number(item.rate ?? 0);
        const amount = newQty * rate;
        await tx.bOQItem.update({
          where: { id: item.id },
          data: { quantity: newQty, amount },
        });
        newTotal += amount;
        updatedCount++;
      } else {
        newTotal += Number(item.amount ?? 0);
      }
    }

    await tx.bOQ.update({
      where: { id },
      data: { totalAmount: newTotal, grandTotal: newTotal },
    });
  });

  return NextResponse.json({ updatedCount, newTotal });
}
