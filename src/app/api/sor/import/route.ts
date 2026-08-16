import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { items, division, sorYear } = body as {
      items: Array<{
        itemCode: string; description: string; unit: string; rate: number;
        chapter: string; subChapter?: string; category?: string;
        cementConsumption?: number | null;
        steelConsumption?:  number | null;
        sandRatio?:         number | null;
        aggregateRatio?:    number | null;
        materialDescription?: string | null;
        inputRate?:         number | null;
      }>;
      division: string;
      sorYear: string;
    };

    if (!items?.length) return NextResponse.json({ error: "No items to import" }, { status: 400 });

    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const item of items) {
      try {
        const existing = await prisma.sORItem.findFirst({ where: { itemCode: item.itemCode, division, sorYear } });
        if (existing) {
          if (Number(existing.rate) !== item.rate) {
            await prisma.rateHistory.create({
              data: { sorItemId: existing.id, oldRate: existing.rate, newRate: item.rate, reason: "CSV Import", changedById: session.user.id },
            });
          }
          await prisma.sORItem.update({ where: { id: existing.id }, data: { ...item, rate: item.rate, division, sorYear } });
          updated++;
        } else {
          await prisma.sORItem.create({ data: { ...item, rate: item.rate, division, sorYear } });
          imported++;
        }
      } catch { errors++; }
    }

    await logAudit({
      userId: session.user.id,
      action: "SOR_IMPORTED",
      entity: "SORItem",
      entityId: `import-${division}-${sorYear}`,
      description: `SOR import: ${imported} created, ${updated} updated, ${errors} errors for ${division} ${sorYear}`,
    });

    return NextResponse.json({ imported, updated, errors, total: items.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
