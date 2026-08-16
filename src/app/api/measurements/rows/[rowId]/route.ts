import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function calcQty(nos: number | null, l: number | null, b: number | null, h: number | null) {
  const factors = [nos, l, b, h].filter((v): v is number => v != null && !isNaN(v));
  return factors.length === 0 ? 0 : factors.reduce((p, v) => p * v, 1);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ rowId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rowId } = await params;
  const body = await req.json() as {
    nos?: number | null;
    length?: number | null;
    breadth?: number | null;
    height?: number | null;
    description?: string;
    unit?: string;
  };

  const existing = await prisma.measurementRow.findUnique({ where: { id: rowId } });
  if (!existing) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  const nos     = "nos"     in body ? body.nos     : existing.nos;
  const length  = "length"  in body ? body.length  : existing.length;
  const breadth = "breadth" in body ? body.breadth : existing.breadth;
  const height  = "height"  in body ? body.height  : existing.height;
  const quantity = calcQty(
    nos     != null ? Number(nos)     : null,
    length  != null ? Number(length)  : null,
    breadth != null ? Number(breadth) : null,
    height  != null ? Number(height)  : null,
  );

  const updated = await prisma.measurementRow.update({
    where: { id: rowId },
    data: {
      ...("nos"         in body ? { nos:     body.nos }         : {}),
      ...("length"      in body ? { length:  body.length }      : {}),
      ...("breadth"     in body ? { breadth: body.breadth }     : {}),
      ...("height"      in body ? { height:  body.height }      : {}),
      ...("description" in body ? { description: body.description } : {}),
      ...("unit"        in body ? { unit: body.unit }           : {}),
      quantity,
    },
  });

  return NextResponse.json(updated);
}
