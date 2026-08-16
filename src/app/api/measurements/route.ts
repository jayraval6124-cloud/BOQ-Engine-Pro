import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const where: Record<string, unknown> = { deletedAt: null };
  if (projectId) where.projectId = projectId;

  const sheets = await prisma.measurementSheet.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { name: true, projectNo: true, sorDivision: true, sorYear: true } },
      createdBy: { select: { name: true } },
      _count: { select: { rows: true } },
    },
  });

  return NextResponse.json(sheets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const data = createSchema.parse(body);

  const sheet = await prisma.measurementSheet.create({
    data: { ...data, createdById: session.user.id },
    include: { project: { select: { name: true } } },
  });

  await logAudit({
    userId: session.user.id,
    projectId: data.projectId,
    action: "MEASUREMENT_ADDED",
    entity: "MeasurementSheet",
    entityId: sheet.id,
    description: `Measurement sheet "${sheet.name}" created`,
  });

  return NextResponse.json(sheet, { status: 201 });
}
