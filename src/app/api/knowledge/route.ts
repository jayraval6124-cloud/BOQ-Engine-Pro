import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(2),
  content: z.string().min(1),
  type: z.enum(["SPECIFICATION","NOTE","REFERENCE","FORMULA_GUIDE","REGULATION"]).default("NOTE"),
  tags: z.array(z.string()).default([]),
  projectId: z.string().optional(),
  chapter: z.string().optional(),
  sorYear: z.string().optional(),
  isGlobal: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") || "";
  const type = searchParams.get("type");
  const projectId = searchParams.get("projectId");
  const chapter = searchParams.get("chapter");

  const where: Record<string, unknown> = { deletedAt: null };
  if (type) where.type = type;
  if (projectId) where.projectId = projectId;
  if (chapter) where.chapter = chapter;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.knowledgeBaseItem.findMany({
    where,
    include: {
      createdBy: { select: { name: true } },
      project: { select: { name: true, projectNo: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.knowledgeBaseItem.create({
    data: { ...parsed.data, createdById: session.user.id },
    include: { createdBy: { select: { name: true } } },
  });

  await logAudit({
    userId: session.user.id,
    action: "KB_ITEM_ADDED",
    entity: "KnowledgeBaseItem",
    entityId: item.id,
    newValues: { title: item.title, type: item.type },
    description: `KB item "${item.title}" added`,
  });

  return NextResponse.json(item, { status: 201 });
}
