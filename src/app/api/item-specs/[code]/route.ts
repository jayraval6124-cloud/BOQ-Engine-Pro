import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const sectionSchema = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  subsections: z.array(z.object({ title: z.string().default(""), description: z.string().default("") })).default([]),
});

const updateSchema = z.object({
  description: z.string().optional(),
  sections: z.array(sectionSchema).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const item = await prisma.itemSpecification.findUnique({ where: { itemCode: code.toUpperCase() } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: item });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.itemSpecification.update({
    where: { itemCode: code.toUpperCase() },
    data: parsed.data,
  });

  return NextResponse.json({ success: true, data: item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const item = await prisma.itemSpecification.findUnique({ where: { itemCode: code.toUpperCase() } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.itemSpecification.delete({ where: { itemCode: code.toUpperCase() } });
  return NextResponse.json({ success: true });
}
