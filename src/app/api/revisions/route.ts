import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const boqId = searchParams.get("boqId");

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (boqId) where.boqId = boqId;

  const revisions = await prisma.estimateRevision.findMany({
    where,
    include: {
      project: { select: { name: true, projectNo: true } },
      boq: { select: { boqNo: true, name: true, grandTotal: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: [{ projectId: "asc" }, { revisionNo: "desc" }],
  });

  return NextResponse.json(revisions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { boqId, name, changeSummary, compareBoqId } = await req.json();
  if (!boqId) return NextResponse.json({ error: "boqId required" }, { status: 400 });

  const boq = await prisma.bOQ.findUnique({
    where: { id: boqId },
    include: { items: true, surcharges: true },
  });
  if (!boq) return NextResponse.json({ error: "BOQ not found" }, { status: 404 });

  // Snapshot current BOQ items
  const snapshot = {
    boqNo: boq.boqNo,
    name: boq.name,
    totalAmount: Number(boq.totalAmount),
    gstAmount: Number(boq.gstAmount),
    grandTotal: Number(boq.grandTotal),
    items: boq.items.map((i) => ({
      id: i.id,
      itemCode: i.itemCode,
      description: i.description,
      unit: i.unit,
      quantity: Number(i.quantity),
      rate: Number(i.rate),
      amount: Number(i.amount),
      chapter: i.chapter,
      itemType: i.itemType,
    })),
    surcharges: boq.surcharges.map((s) => ({
      type: s.type,
      label: s.label,
      percent: s.percent ? Number(s.percent) : null,
      amount: s.amount ? Number(s.amount) : null,
    })),
    snapshotAt: new Date().toISOString(),
  };

  // Compute diff if compareBoqId provided
  let diff = null;
  if (compareBoqId) {
    const compareRevision = await prisma.estimateRevision.findFirst({
      where: { boqId: compareBoqId },
      orderBy: { revisionNo: "desc" },
    });
    if (compareRevision?.snapshot) {
      const compareSnap = compareRevision.snapshot as { items: Array<{ id: string; description: string; amount: number; quantity: number; rate: number }> };
      const currentIds = new Set(boq.items.map((i) => i.id));
      const compareIds = new Set((compareSnap.items || []).map((i: { id: string }) => i.id));

      diff = {
        added: boq.items
          .filter((i) => !compareIds.has(i.id))
          .map((i) => ({ id: i.id, description: i.description, amount: Number(i.amount) })),
        removed: (compareSnap.items || [])
          .filter((i: { id: string }) => !currentIds.has(i.id))
          .map((i: { id: string; description: string; amount: number }) => ({ id: i.id, description: i.description, amount: i.amount })),
        modified: boq.items
          .filter((i) => {
            const prev = (compareSnap.items || []).find((p: { id: string }) => p.id === i.id);
            return prev && (Number(i.quantity) !== prev.quantity || Number(i.rate) !== prev.rate);
          })
          .map((i) => {
            const prev = (compareSnap.items || []).find((p: { id: string }) => p.id === i.id)!;
            return {
              id: i.id,
              description: i.description,
              oldAmount: prev.amount,
              newAmount: Number(i.amount),
              difference: Number(i.amount) - prev.amount,
            };
          }),
      };
    }
  }

  // Get next revision number for this project
  const lastRevision = await prisma.estimateRevision.findFirst({
    where: { projectId: boq.projectId },
    orderBy: { revisionNo: "desc" },
  });
  const revisionNo = (lastRevision?.revisionNo ?? 0) + 1;

  const revision = await prisma.estimateRevision.create({
    data: {
      projectId: boq.projectId,
      boqId,
      revisionNo,
      name: name || `Revision ${revisionNo}`,
      status: "ACTIVE",
      snapshot: snapshot as never,
      changeSummary,
      diff: diff as never,
      compareBoqId,
      createdById: session.user.id,
    },
    include: {
      project: { select: { name: true } },
      boq: { select: { boqNo: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });

  await logAudit({
    userId: session.user.id,
    projectId: boq.projectId,
    action: "REVISION_CREATED",
    entity: "EstimateRevision",
    entityId: revision.id,
    newValues: { revisionNo, boqId, changeSummary },
    description: `Revision ${revisionNo} created for BOQ "${boq.name}"`,
  });

  return NextResponse.json(revision, { status: 201 });
}
