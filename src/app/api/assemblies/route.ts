import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const itemSchema = z.object({
  sorItemId: z.string().optional(),
  description: z.string().min(1),
  unit: z.string().min(1),
  formula: z.string().min(1),
  calculationNote: z.string().optional(),
  isRequired: z.boolean().default(true),
  sequenceOrder: z.number().int().default(0),
});

const schema = z.object({
  name: z.string().min(2),
  elementTemplateId: z.string(),
  description: z.string().optional(),
  dimensionInputs: z.array(z.object({
    name: z.string(),
    label: z.string(),
    unit: z.string().optional(),
    defaultValue: z.number().optional(),
  })).default([]),
  items: z.array(itemSchema).default([]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const elementTemplateId = searchParams.get("elementTemplateId");

  const where: Record<string, unknown> = { deletedAt: null };
  if (elementTemplateId) where.elementTemplateId = elementTemplateId;

  const assemblies = await prisma.elementAssembly.findMany({
    where,
    include: {
      elementTemplate: { select: { name: true, type: true } },
      items: { include: { sorItem: { select: { itemCode: true, description: true, unit: true, rate: true } } }, orderBy: { sequenceOrder: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(assemblies);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { items, ...assemblyData } = parsed.data;

  const assembly = await prisma.elementAssembly.create({
    data: {
      ...assemblyData,
      items: {
        create: items.map((item) => ({
          sorItemId: item.sorItemId,
          description: item.description,
          unit: item.unit,
          formula: item.formula,
          calculationNote: item.calculationNote,
          isRequired: item.isRequired,
          sequenceOrder: item.sequenceOrder,
        })),
      },
    },
    include: {
      elementTemplate: true,
      items: { include: { sorItem: true } },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "ASSEMBLY_CREATED",
    entity: "ElementAssembly",
    entityId: assembly.id,
    newValues: { name: assembly.name, itemCount: items.length },
    description: `Assembly "${assembly.name}" created`,
  });

  return NextResponse.json(assembly, { status: 201 });
}
