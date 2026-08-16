import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Returns all analyzed drawings across all user's projects (for wizard drawing picker)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const drawings = await prisma.drawing.findMany({
    where: {
      project: { createdById: session.user.id },
    },
    include: {
      project: { select: { id: true, name: true, projectNo: true } },
      _count: { select: { entities: true, pages: true } },
    },
    orderBy: { uploadedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(drawings);
}
