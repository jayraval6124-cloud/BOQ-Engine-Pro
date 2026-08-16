import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  sorDivision: z.string().optional(),
  state: z.string().optional(),
  sorYear: z.string().optional(),
  status: z.enum(["DRAFT","ACTIVE","COMPLETED","ON_HOLD","CANCELLED"]).optional(),
  estimatedValue: z.number().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      createdBy: { select: { name: true, email: true } },
      elements: { include: { elementTemplate: true }, orderBy: { sortOrder: "asc" } },
      measurementSheets: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 10 },
      boqs: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 10, include: { _count: { select: { items: true } }, items: { select: { amount: true } } } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Compute live totals for each BOQ from its items
  const enriched = {
    ...project,
    boqs: project.boqs.map(({ items, ...b }) => {
      const computedTotal = items.reduce((s: number, it: { amount: unknown }) => s + Number(it.amount ?? 0), 0);
      return { ...b, grandTotal: computedTotal > 0 ? computedTotal : Number(b.grandTotal) };
    }),
  };
  return NextResponse.json(enriched);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, deletedAt: null } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const updated = await prisma.project.update({
      where: { id },
      data: { ...data, estimatedValue: data.estimatedValue ?? undefined },
    });

    await logAudit({
      userId: session.user.id,
      projectId: id,
      action: "PROJECT_UPDATED",
      entity: "Project",
      entityId: id,
      oldValues: { name: project.name, status: project.status },
      newValues: data,
      description: `Project "${project.name}" updated`,
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, deletedAt: null } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit({
    userId: session.user.id,
    action: "PROJECT_DELETED",
    entity: "Project",
    entityId: id,
    description: `Project "${project.name}" deleted`,
  });

  return NextResponse.json({ success: true });
}
