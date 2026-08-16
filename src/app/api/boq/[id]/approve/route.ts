import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const boq = await prisma.bOQ.findFirst({ where: { id } });
  if (!boq) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.bOQ.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  await logAudit({
    userId: session.user.id,
    projectId: boq.projectId,
    action: "BOQ_APPROVED",
    entity: "BOQ",
    entityId: id,
    description: `BOQ "${boq.name}" approved`,
  });

  return NextResponse.json(updated);
}
