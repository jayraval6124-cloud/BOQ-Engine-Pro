import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const assembly = await prisma.elementAssembly.findUnique({
    where: { id, deletedAt: null },
    include: {
      elementTemplate: true,
      items: {
        include: { sorItem: { select: { id: true, itemCode: true, description: true, unit: true, rate: true } } },
        orderBy: { sequenceOrder: "asc" },
      },
    },
  });

  if (!assembly) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(assembly);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { items, ...assemblyData } = body;

  // Delete existing items and replace
  await prisma.$transaction(async (tx) => {
    await tx.elementAssemblyItem.deleteMany({ where: { assemblyId: id } });
    await tx.elementAssembly.update({
      where: { id },
      data: {
        ...assemblyData,
        items: {
          create: (items || []).map((item: Record<string, unknown>, idx: number) => ({
            sorItemId: item.sorItemId || null,
            description: item.description,
            unit: item.unit,
            formula: item.formula,
            calculationNote: item.calculationNote || null,
            isRequired: item.isRequired ?? true,
            sequenceOrder: item.sequenceOrder ?? idx,
          })),
        },
      },
    });
  });

  const updated = await prisma.elementAssembly.findUnique({
    where: { id },
    include: { elementTemplate: true, items: { include: { sorItem: true }, orderBy: { sequenceOrder: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.elementAssembly.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
