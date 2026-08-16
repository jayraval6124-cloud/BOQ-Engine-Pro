import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const revision = await prisma.estimateRevision.findUnique({
    where: { id },
    include: {
      project: { select: { name: true, projectNo: true, sorDivision: true, sorYear: true } },
      boq: { select: { boqNo: true, name: true, grandTotal: true, status: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!revision) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(revision);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, changeSummary, name } = body;

  const revision = await prisma.estimateRevision.findUnique({ where: { id } });
  if (!revision) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "lock") {
    if (revision.status === "LOCKED") return NextResponse.json({ error: "Already locked" }, { status: 400 });

    const updated = await prisma.estimateRevision.update({
      where: { id },
      data: { status: "LOCKED", lockedById: session.user.id, lockedAt: new Date() },
    });

    await logAudit({
      userId: session.user.id,
      projectId: revision.projectId,
      action: "REVISION_APPROVED",
      entity: "EstimateRevision",
      entityId: id,
      description: `Revision ${revision.revisionNo} locked`,
    });

    return NextResponse.json(updated);
  }

  const updated = await prisma.estimateRevision.update({
    where: { id },
    data: { name: name ?? revision.name, changeSummary: changeSummary ?? revision.changeSummary },
  });

  return NextResponse.json(updated);
}
