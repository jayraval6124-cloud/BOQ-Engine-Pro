import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const paramSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().optional().default(""),
  dims: z.enum(["n", "l", "b", "h", "d", "lxb", "lxbxh"]).optional(),
});

const boqFormulaSchema = z.object({
  description: z.string().default(""),
  unit: z.string().default(""),
  sorCode: z.string().default(""),
  chapter: z.string().default(""),
  groupHeader: z.string().default(""),
  formula: z.string().default(""),
  sortOrder: z.number().default(0),
});

const measSubRowSchema = z.object({
  subDesc: z.string().default(""),
  nosFormula: z.string().default("1"),
  lengthFormula: z.string().default(""),
  breadthFormula: z.string().default("0"),
  heightFormula: z.string().default("0"),
});

const measFormulaSchema = z.object({
  description: z.string().default(""),
  unit: z.string().default(""),
  gsrtcCode: z.string().default(""),
  rows: z.array(measSubRowSchema).default([]),
  sortOrder: z.number().default(0),
  steelMode: z.boolean().optional().default(false),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  parameters: z.array(paramSchema).optional(),
  boqItemFormulas: z.array(boqFormulaSchema).optional(),
  measurementPresets: z.array(measFormulaSchema).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.wizardTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const conflict = await prisma.wizardTemplate.findFirst({ where: { name: parsed.data.name, id: { not: id } } });
    if (conflict) return NextResponse.json({ error: "Name already in use." }, { status: 409 });
  }

  const updated = await prisma.wizardTemplate.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined       && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
      ...(parsed.data.icon !== undefined        && { icon: parsed.data.icon }),
      ...(parsed.data.parameters !== undefined          && { parameters: parsed.data.parameters }),
      ...(parsed.data.boqItemFormulas !== undefined    && { boqItemFormulas: parsed.data.boqItemFormulas }),
      ...(parsed.data.measurementPresets !== undefined && { measurementPresets: parsed.data.measurementPresets }),
      ...(parsed.data.isActive !== undefined           && { isActive: parsed.data.isActive }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.wizardTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.wizardTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
