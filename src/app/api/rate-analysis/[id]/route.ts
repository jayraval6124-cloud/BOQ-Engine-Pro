import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const analysis = await prisma.rateAnalysis.findUnique({
    where: { id, deletedAt: null },
    include: {
      components: { orderBy: { sortOrder: "asc" } },
      sorItem: true,
      boqItem: { select: { id: true, description: true, chapter: true, unit: true, rate: true, amount: true } },
      boq: { select: { id: true, boqNo: true, name: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(analysis);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { components, ...analysisData } = await req.json();

  const totalRate = (components || []).reduce((sum: number, c: { amount: number }) => sum + (c.amount || 0), 0);

  await prisma.$transaction(async (tx) => {
    await tx.rateAnalysisComponent.deleteMany({ where: { rateAnalysisId: id } });
    await tx.rateAnalysis.update({
      where: { id },
      data: {
        ...analysisData,
        totalRate,
        components: {
          create: (components || []).map((c: Record<string, unknown>, idx: number) => ({
            type: c.type,
            description: c.description,
            unit: c.unit,
            quantity: c.quantity ?? 1,
            rate: c.rate,
            amount: c.amount,
            sortOrder: (c.sortOrder as number) ?? idx,
          })),
        },
      },
    });
  });

  await logAudit({
    userId: session.user.id,
    action: "RATE_ANALYSIS_SAVED",
    entity: "RateAnalysis",
    entityId: id,
    description: `Rate analysis updated`,
  });

  const updated = await prisma.rateAnalysis.findUnique({
    where: { id },
    include: { components: { orderBy: { sortOrder: "asc" } }, sorItem: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.rateAnalysis.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
