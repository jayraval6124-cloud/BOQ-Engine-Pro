import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const entity = await prisma.projectEntity.findUnique({
      where: { id },
      include: {
        drawing: { select: { id: true, name: true, drawingNo: true } },
        page: { select: { id: true, pageNo: true } },
      },
    });
    if (!entity) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(entity);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, entityLabel, attributes, notes, status } = body;

    if (action === "verify") {
      const entity = await prisma.projectEntity.update({
        where: { id },
        data: { status: "VERIFIED", verifiedAt: new Date(), attributes: body.attributes ?? undefined },
      });
      return NextResponse.json(entity);
    }

    if (action === "reject") {
      const entity = await prisma.projectEntity.update({
        where: { id },
        data: { status: "REJECTED", notes: notes ?? undefined },
      });
      return NextResponse.json(entity);
    }

    // Generic update
    const entity = await prisma.projectEntity.update({
      where: { id },
      data: {
        entityLabel: entityLabel,
        attributes: attributes,
        notes: notes,
        status: status,
      },
    });
    return NextResponse.json(entity);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.projectEntity.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
