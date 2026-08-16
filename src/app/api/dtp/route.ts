import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  sections: z.array(z.object({
    title: z.string().min(1),
    type: z.enum(["COVER","INDEX","PROJECT_INFO","BOQ","ABSTRACT","SPECIFICATIONS","NOTES","QUANTITY_SUMMARY","RATE_ANALYSIS_SUMMARY","SIGNATURES","CUSTOM"]),
    content: z.string().default(""),
    sortOrder: z.number().int().default(0),
    isVisible: z.boolean().default(true),
    pageBreak: z.boolean().default(true),
  })).default([]),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.dTPTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sections, ...templateData } = parsed.data;

  if (templateData.isDefault) {
    await prisma.dTPTemplate.updateMany({ data: { isDefault: false } });
  }

  const template = await prisma.dTPTemplate.create({
    data: {
      ...templateData,
      sections: {
        create: sections.map((s, i) => ({ ...s, sortOrder: s.sortOrder ?? i })),
      },
    },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });

  await logAudit({
    userId: session.user.id,
    action: "DTP_GENERATED",
    entity: "DTPTemplate",
    entityId: template.id,
    description: `DTP template "${template.name}" created`,
  });

  return NextResponse.json(template, { status: 201 });
}
