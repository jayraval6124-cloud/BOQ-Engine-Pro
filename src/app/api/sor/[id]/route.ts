import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  description: z.string().optional(),
  unit: z.string().optional(),
  rate: z.number().positive().optional(),
  chapter: z.string().optional(),
  subChapter: z.string().optional(),
  category: z.string().optional(),
  specification: z.string().optional(),
  reason: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const item = await prisma.sORItem.findFirst({
    where: { id, deletedAt: null },
    include: { rateHistory: { orderBy: { changedAt: "desc" }, take: 10 } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.sORItem.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.rate && Number(data.rate) !== Number(existing.rate)) {
      await prisma.rateHistory.create({
        data: {
          sorItemId: id,
          oldRate: existing.rate,
          newRate: data.rate,
          reason: data.reason,
          changedById: session.user.id,
        },
      });
    }

    const updated = await prisma.sORItem.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.sORItem.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  return NextResponse.json({ success: true });
}
