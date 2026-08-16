import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const componentSchema = z.object({
  type: z.enum(["MATERIAL","LABOUR","MACHINERY","TRANSPORT","OVERHEAD","PROFIT","TAX","OTHER"]),
  description: z.string().min(1),
  unit: z.string().optional(),
  quantity: z.number().default(1),
  rate: z.number(),
  amount: z.number(),
  sortOrder: z.number().int().default(0),
});

const schema = z.object({
  boqId: z.string().optional(),
  boqItemId: z.string().optional(),
  sorItemId: z.string().optional(),
  name: z.string().min(1),
  unit: z.string().min(1),
  isTemplate: z.boolean().default(false),
  templateName: z.string().optional(),
  notes: z.string().optional(),
  components: z.array(componentSchema).default([]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const boqId = searchParams.get("boqId");
  const isTemplate = searchParams.get("isTemplate");

  const where: Record<string, unknown> = { deletedAt: null };
  if (boqId) where.boqId = boqId;
  if (isTemplate === "true") where.isTemplate = true;

  const analyses = await prisma.rateAnalysis.findMany({
    where,
    include: {
      components: { orderBy: { sortOrder: "asc" } },
      sorItem: { select: { itemCode: true, description: true, unit: true, rate: true } },
      boqItem: { select: { description: true, chapter: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(analyses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { components, ...analysisData } = parsed.data;

  const totalRate = components.reduce((sum, c) => sum + c.amount, 0);

  const analysis = await prisma.rateAnalysis.create({
    data: {
      ...analysisData,
      totalRate,
      createdById: session.user.id,
      components: {
        create: components,
      },
    },
    include: { components: true, sorItem: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "RATE_ANALYSIS_SAVED",
    entity: "RateAnalysis",
    entityId: analysis.id,
    newValues: { name: analysis.name, totalRate, componentCount: components.length },
    description: `Rate analysis "${analysis.name}" created`,
  });

  return NextResponse.json(analysis, { status: 201 });
}
