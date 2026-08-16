import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Auto-generate BOQ items from a measurement sheet
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { measurementSheetId, division, sorYear } = await req.json();

  const sheet = await prisma.measurementSheet.findFirst({
    where: { id: measurementSheetId },
    include: {
      rows: {
        where: { isHeader: false },
        include: {
          projectElement: { include: { elementTemplate: { select: { name: true } } } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!sheet) return NextResponse.json({ error: "Sheet not found" }, { status: 404 });

  const boqItems = [];
  for (const row of sheet.rows) {
    let rate = 0;
    let itemCode = "";
    let chapter = "General";

    if (row.sorItemId) {
      const sor = await prisma.sORItem.findFirst({
        where: { id: row.sorItemId },
      });
      if (sor) { rate = Number(sor.rate); itemCode = sor.itemCode; chapter = sor.chapter; }
    } else {
      const matched = await prisma.sORItem.findFirst({
        where: {
          description: { contains: row.description.split(" ").slice(0, 3).join(" "), mode: "insensitive" },
          ...(division ? { division } : {}),
          ...(sorYear ? { sorYear } : {}),
        },
      });
      if (matched) { rate = Number(matched.rate); itemCode = matched.itemCode; chapter = matched.chapter; }
    }

    boqItems.push({
      measurementRowId: row.id,
      sorItemId: row.sorItemId,
      itemCode,
      description: row.description,
      unit: row.unit,
      quantity: Number(row.quantity),
      rate,
      amount: Number(row.quantity) * rate,
      chapter,
      elementLabel: row.projectElement?.elementTemplate?.name || row.groupLabel || "General",
      isManualEntry: false,
    });
  }

  return NextResponse.json({ items: boqItems, sheetName: sheet.name });
}
