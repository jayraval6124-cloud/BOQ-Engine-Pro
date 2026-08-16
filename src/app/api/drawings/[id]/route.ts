import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";
import { join } from "path";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const drawing = await prisma.drawing.findUnique({
      where: { id },
      include: {
        pages: { orderBy: { pageNo: "asc" } },
        entities: { orderBy: { createdAt: "asc" } },
        project: { select: { id: true, name: true, drawingTemplate: true } },
      },
    });
    if (!drawing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(drawing);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, drawingNo, discipline, floor, revision } = body;
    const drawing = await prisma.drawing.update({
      where: { id },
      data: { name, drawingNo, discipline, floor, revision },
    });
    return NextResponse.json(drawing);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const drawing = await prisma.drawing.findUnique({ where: { id } });
    if (!drawing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete entities + pages
    await prisma.projectEntity.deleteMany({ where: { drawingId: id } });
    await prisma.drawingPage.deleteMany({ where: { drawingId: id } });
    await prisma.drawing.delete({ where: { id } });

    // Delete file from disk
    try {
      const fullPath = join(process.cwd(), "public", drawing.filePath);
      await unlink(fullPath);
    } catch { /* file may not exist */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
