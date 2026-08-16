import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const boq = await prisma.bOQ.findFirst({
    where: { id, deletedAt: null },
    include: {
      project: true,
      measurementSheet: { select: { id: true, name: true, status: true, rows: { orderBy: { sortOrder: "asc" }, select: { id: true, nos: true, length: true, breadth: true, height: true, quantity: true, unit: true, description: true, gsrtcCode: true, isHeader: true, groupLabel: true } } } },
      createdBy: { select: { name: true } },
      items: { orderBy: [{ chapter: "asc" }, { sortOrder: "asc" }], include: { sorItem: { select: { itemCode: true, cementConsumption: true, steelConsumption: true, materialDescription: true, sandRatio: true, aggregateRatio: true, qtyPerTrip: true } } } },
    },
  });
  if (!boq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(boq);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();

  const boq = await prisma.bOQ.findFirst({ where: { id } });
  if (!boq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (boq.status === "LOCKED") return NextResponse.json({ error: "BOQ is locked and cannot be modified" }, { status: 400 });

  const updated = await prisma.bOQ.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.bOQ.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
