import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["GST","AGENCY_CHARGES","ESCALATION","CONTINGENCY","ROUND_OFF","CUSTOM"]),
  label: z.string().min(1),
  percent: z.number().optional(),
  amount: z.number().optional(),
  isPercent: z.boolean().default(true),
  applyOn: z.string().default("grandTotal"),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boqId } = await params;
  const surcharges = await prisma.bOQSurcharge.findMany({
    where: { boqId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(surcharges);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: boqId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const boq = await prisma.bOQ.findUnique({ where: { id: boqId } });
  if (!boq) return NextResponse.json({ error: "BOQ not found" }, { status: 404 });
  if (boq.status === "LOCKED") return NextResponse.json({ error: "BOQ is locked" }, { status: 400 });

  const surcharge = await prisma.bOQSurcharge.create({
    data: { boqId, ...parsed.data },
  });

  await logAudit({
    userId: session.user.id,
    projectId: boq.projectId,
    action: "SURCHARGE_UPDATED",
    entity: "BOQSurcharge",
    entityId: surcharge.id,
    newValues: { type: surcharge.type, label: surcharge.label },
    description: `Surcharge "${surcharge.label}" added to BOQ`,
  });

  return NextResponse.json(surcharge, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: boqId } = await params;
  const { searchParams } = new URL(req.url);
  const surchargeId = searchParams.get("surchargeId");

  if (!surchargeId) return NextResponse.json({ error: "surchargeId required" }, { status: 400 });

  await prisma.bOQSurcharge.delete({ where: { id: surchargeId, boqId } });
  return NextResponse.json({ success: true });
}
