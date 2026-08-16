import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { drawingTemplate } = await req.json();
    const project = await prisma.project.update({
      where: { id },
      data: { drawingTemplate: drawingTemplate ?? null },
    });
    return NextResponse.json(project);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
