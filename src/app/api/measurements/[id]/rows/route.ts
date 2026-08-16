import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function calcQty(nos: number | null, l: number | null, b: number | null, h: number | null): number {
  const factors: number[] = [];
  if (nos != null && !isNaN(nos)) factors.push(nos);
  if (l   != null && !isNaN(l))   factors.push(l);
  if (b   != null && !isNaN(b))   factors.push(b);
  if (h   != null && !isNaN(h))   factors.push(h);
  if (factors.length === 0) return 0;
  return factors.reduce((p, v) => p * v, 1);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { rows } = body as {
    rows: Array<{
      id?: string;
      itemNo: number;
      gsrtcCode?: string;
      description: string;
      nos?: number | null;
      length?: number | null;
      breadth?: number | null;
      height?: number | null;
      unit: string;
      sorItemId?: string;
      sortOrder: number;
      serialNo: number;
    }>;
  };

  await prisma.measurementRow.deleteMany({ where: { measurementSheetId: id } });

  const created = await Promise.all(
    rows.map((row) => {
      const quantity = calcQty(
        row.nos   ?? null,
        row.length  ?? null,
        row.breadth ?? null,
        row.height  ?? null,
      );
      return prisma.measurementRow.create({
        data: {
          measurementSheetId: id,
          itemNo:      row.itemNo    ?? 1,
          gsrtcCode:   row.gsrtcCode || null,
          description: row.description,
          nos:         row.nos     ?? null,
          length:      row.length  ?? null,
          breadth:     row.breadth ?? null,
          height:      row.height  ?? null,
          quantity,
          unit:        row.unit || "Cum",
          sortOrder:   row.sortOrder,
          serialNo:    row.serialNo,
          sorItemId:   row.sorItemId || null,
        },
      });
    })
  );

  return NextResponse.json(created);
}
