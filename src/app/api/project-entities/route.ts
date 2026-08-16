import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const entityType = searchParams.get("entityType");
    const status = searchParams.get("status");

    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const where: Record<string, unknown> = { projectId };
    if (entityType) where.entityType = entityType;
    if (status) where.status = status;

    const entities = await prisma.projectEntity.findMany({
      where,
      include: {
        drawing: { select: { id: true, name: true, drawingNo: true } },
        page: { select: { id: true, pageNo: true } },
      },
      orderBy: [{ entityType: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(entities);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, drawingId, pageId, entityType, entityLabel, attributes, extractionMethod, confidence, status, notes } = body;
    if (!projectId || !entityType) return NextResponse.json({ error: "projectId and entityType required" }, { status: 400 });

    const entity = await prisma.projectEntity.create({
      data: {
        projectId,
        drawingId: drawingId ?? null,
        pageId: pageId ?? null,
        entityType,
        entityLabel: entityLabel ?? null,
        attributes: attributes ?? {},
        extractionMethod: extractionMethod ?? "MANUAL",
        confidence: confidence ?? null,
        status: status ?? "NEEDS_VERIFICATION",
        notes: notes ?? null,
      },
    });
    return NextResponse.json(entity);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
