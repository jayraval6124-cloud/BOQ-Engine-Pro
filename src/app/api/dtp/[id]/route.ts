import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  sections: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    type: z.enum(["COVER","INDEX","PROJECT_INFO","BOQ","ABSTRACT","SPECIFICATIONS","NOTES","QUANTITY_SUMMARY","RATE_ANALYSIS_SUMMARY","SIGNATURES","CUSTOM"]),
    content: z.string().default(""),
    sortOrder: z.number().int().default(0),
    isVisible: z.boolean().default(true),
    pageBreak: z.boolean().default(true),
  })).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const template = await prisma.dTPTemplate.findUnique({
    where: { id },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sections, ...templateData } = parsed.data;

  if (templateData.isDefault) {
    await prisma.dTPTemplate.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
  }

  await prisma.$transaction(async (tx) => {
    if (sections !== undefined) {
      await tx.dTPSection.deleteMany({ where: { templateId: id } });
      await tx.dTPSection.createMany({
        data: sections.map((s, i) => ({ templateId: id, ...s, id: undefined, sortOrder: s.sortOrder ?? i })),
      });
    }
    await tx.dTPTemplate.update({ where: { id }, data: templateData });
  });

  const updated = await prisma.dTPTemplate.findUnique({
    where: { id },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.dTPTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
