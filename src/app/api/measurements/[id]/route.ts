import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const sheet = await prisma.measurementSheet.findFirst({
    where: { id, deletedAt: null },
    include: {
      project: { select: { id: true, name: true, projectNo: true, sorDivision: true, sorYear: true } },
      createdBy: { select: { name: true } },
      rows: {
        orderBy: [{ sortOrder: "asc" }, { serialNo: "asc" }],
        include: {
          projectElement: { include: { elementTemplate: { select: { name: true } } } },
          formula: { select: { name: true, expression: true } },
        },
      },
    },
  });

  if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sheet);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  const updated = await prisma.measurementSheet.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.measurementSheet.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
