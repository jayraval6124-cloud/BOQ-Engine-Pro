import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const elements = await prisma.projectElement.findMany({
    where: { projectId: id },
    include: { elementTemplate: { include: { items: { include: { sorItem: true } } } } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(elements);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { elementTemplateId, label } = await req.json();

  const count = await prisma.projectElement.count({ where: { projectId: id } });
  const element = await prisma.projectElement.create({
    data: { projectId: id, elementTemplateId, label: label || "", sortOrder: count },
    include: { elementTemplate: { include: { items: { include: { sorItem: true } } } } },
  });

  await logAudit({
    userId: session.user.id,
    projectId: id,
    action: "ELEMENT_ADDED",
    entity: "ProjectElement",
    entityId: element.id,
    description: `Element "${element.elementTemplate.name}" added to project`,
  });

  return NextResponse.json(element, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { elementId } = await req.json();
  await prisma.projectElement.delete({ where: { id: elementId } });
  await logAudit({
    userId: session.user.id,
    projectId: id,
    action: "ELEMENT_REMOVED",
    entity: "ProjectElement",
    entityId: elementId,
    description: "Element removed from project",
  });
  return NextResponse.json({ success: true });
}
