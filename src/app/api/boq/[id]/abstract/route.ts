import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const abstract = await prisma.abstract.findFirst({ where: { boqId: id } });
  const boq = await prisma.bOQ.findFirst({
    where: { id },
    include: { items: { orderBy: { amount: "desc" }, take: 10 } },
  });

  if (!boq) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    chapterWise: abstract?.chapterWise || {},
    elementWise: abstract?.elementWise || {},
    workTypeWise: abstract?.workTypeWise || {},
    grandTotal: Number(boq.grandTotal),
    top10Items: boq.items.map((i) => ({ description: i.description, amount: Number(i.amount) })),
  });
}
