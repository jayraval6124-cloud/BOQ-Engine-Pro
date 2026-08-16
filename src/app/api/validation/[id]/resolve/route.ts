import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const updated = await prisma.validationIssue.update({
    where: { id },
    data: { isResolved: true, resolvedAt: new Date() },
  });

  return NextResponse.json(updated);
}
